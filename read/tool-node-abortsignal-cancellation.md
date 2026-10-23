# Node.jsのAbortSignal設計：timeoutと利用者のcancelを下位処理へ伝える

YAMASHI TECH AI Editorial Desk | Deep Dive | Software Engineering / TypeScript

[掲載ページ](https://yamashi-tech.com/articles/tool-node-abortsignal-cancellation) · [原稿データ](../articles/tool-node-abortsignal-cancellation.json)

公開: 2026-10-20 / 更新: 2026-10-23 / 確認: 2026-10-23

Promise.raceで待機を打ち切っても、元の処理は止まらない。AbortSignal.timeoutとanyを使って終了要求を伝え、reasonで理由を区別し、cleanupと書き込みの扱いまで設計する。

## 待つのをやめるだけでは、実行中の仕事は止まらない

`Promise.race`で処理とtimeoutを競争させると、呼び出し元へ先に失敗を返せる。しかし、負けたPromiseが進めている通信やファイル操作まで自動で止まるわけではない。画面にはtimeoutと出ていても、裏でリソースを使い、遅れて書き込みが完了する可能性がある。

`AbortSignal`は、不要になった仕事へ終了要求を渡すための共通インターフェースだ。Node.jsでは、時間による要求を`AbortSignal.timeout()`で作り、利用者のcancelやshutdownと`AbortSignal.any()`で組み合わせられる。下位APIまでsignalを渡し、停止後の片付けと理由の記録を揃えるのが設計の中心になる。

timeout実装の違い

| 方式 | 呼び出し元 | 下位処理 | risk |
| --- | --- | --- | --- |
| Promise.raceのみ | 先に失敗できる | 継続し得る | late write、resource leak |
| AbortSignal伝播 | 失敗を受け取る | 対応APIは停止を試みる | APIごとのbest effort差 |
| process強制終了 | 全task停止 | cleanup不能の場合がある | data損失、広すぎる影響 |

## callerのsignalと、処理ごとのtimeoutを合成する

APIの入口で呼び出し元のsignalを受け取り、内部のtimeoutと合成する。下の`loadProfile`は、利用者の終了要求か2秒のtimeoutのどちらかでabortするsignalを作り、fetchへ渡す例だ。caller signalがなければtimeoutだけを使う。

Node.jsのfetchでは相対パスの基準になるdocumentがないため、アプリケーションが渡したbase URLから絶対URLを作る。プロフィールIDもパスとしてencodeする。この例の2秒は説明用の設定で、実際の値はサービスの要件に合わせる。

caller cancelとtimeoutを合成するTypeScript例。編集部では外部HTTPへ実行していない。

```typescript
export async function loadProfile(
  apiBase: URL,
  id: string,
  callerSignal?: AbortSignal,
) {
  const timeout = AbortSignal.timeout(2_000);
  const signal = callerSignal
    ? AbortSignal.any([callerSignal, timeout])
    : timeout;
  const url = new URL(`/profiles/${encodeURIComponent(id)}`, apiBase);

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
```

## timerでは、1000msの待機を約40msで中断できた

2026年10月20日、macOS x86_64、Node.js 23.11.0で、`node:timers/promises`のtimerを使って確認した。利用者用の`AbortController`と`AbortSignal.timeout(40)`を合成し、1000msのtimerへ渡した。利用者側からのabortは行わず、timeoutだけを発生させた。

記録された結果は、例外の`name`がAbortError、`cause`がTimeoutError、経過時間が40ms、signalの`aborted`がtrue、`reason`がTimeoutErrorだった。processは終了コード0で完了した。これにより、timer APIの中断と、合成signalに残るtimeout理由を区別して読めた。

下は同じ構成を理解するための再現例だ。40msは機能確認用であり、厳密な時刻の保証ではない。event loopやOS schedulingの影響を受けるため、実サービスの応答時間やHTTP・DBの中断精度をこの結果から評価することはできない。

| 項目 | 結果 | 意味 |
| --- | --- | --- |
| Node.js | 23.11.0 | このversionで実行 |
| 予定timer | 1000ms | 完了前に中断 |
| deadline | 40ms | 約40msでabort |
| caught error | AbortError | 対応APIのreject |
| signal.reason | TimeoutError | 終了理由を区別可能 |

timerだけで仕組みを確かめるJavaScript例。過去の観測を基に整理した例で、今回の再実行結果ではない。

```javascript
import { setTimeout as delay } from 'node:timers/promises';

const caller = new AbortController();
const signal = AbortSignal.any([caller.signal, AbortSignal.timeout(40)]);
const started = performance.now();

try {
  await delay(1_000, undefined, { signal });
} catch (error) {
  console.log({
    name: error.name,
    cause: error.cause?.name,
    elapsedMs: Math.round(performance.now() - started),
    aborted: signal.aborted,
    reason: signal.reason?.name,
  });
}
```

## reasonを残せば、timeoutと利用者操作を区別できる

`AbortController.abort(reason)`は、終了を求めた理由をsignalへ保存する。`AbortSignal.any()`は、合成に使ったsignalのうち中断を起こしたもののreasonを採用する。timeout、利用者のcancel、shutdownを同じ「失敗」にまとめず、呼び出し元の判断やログへつなげられる。

例外名だけでtimeoutと決めないことも大切だ。先ほどのtimerでは、例外名はAbortErrorでもcauseとsignal.reasonはTimeoutErrorだった。APIによってrejectする例外の形は違うので、使用するライブラリの仕様と、signal自身の状態を合わせて分類する。

下は利用者操作の理由を明示する例だ。ログにはoperation名やtimeout値、理由の種別を残すと調査しやすい。認証情報や個人データをreasonへ詰め込まず、必要な情報だけを記録する。

利用者のcancel理由をsignalへ保存する例。

```typescript
const controller = new AbortController();
const signal = controller.signal;
controller.abort(new DOMException('user cancelled', 'AbortError'));

if (signal.aborted) {
  console.info({ reason: signal.reason?.name }, 'operation stopped');
}
```

## 開始前のabortと、正常終了時のcleanupも扱う

独自の非同期APIを作るなら、最初に`signal.throwIfAborted()`で、すでに終了要求が来ているケースを処理する。実行中はabort listenerでリソースを閉じ、正常終了・異常終了のどちらでもfinallyなどで片付ける。

Node.jsの公式資料は、abort listenerに`{ once: true }`を使うことを勧めている。ただしonceはabortされたときにlistenerを外す設定なので、正常完了した場合にも参照が残らないよう解除する。abortと完了が競合しても片付けが壊れないよう、同じリソースを二度処理しても問題のない構造にする。

## abortしても、済んだ書き込みは巻き戻らない

Node.jsの`fs.readFile`はsignalで内部のbufferingを中断するが、個々のOS requestを中断するわけではない。`writeFile`のcancelもbest effortで、一部がすでに書かれている場合がある。signalを受け取るAPIであることと、処理を丸ごと取り消せることは違う。

外部APIへ書き込み要求を送った後に通信を中断しても、相手の処理が完了している場合がある。支払いやリソース作成では、idempotency key、結果の再照会、transaction、必要に応じた補償処理を別に設計する。cancel後の再試行を、何も起きなかった前提で行わない。

## 早くrejectするかより、理由と後始末をテストする

テストでは、正常完了、timeout、利用者のcancel、開始前にabort済み、完了とabortの競合を分ける。rejectした時刻だけでなく、受け取ったreason、listenerの解除、残ったtimerやsocket、遅れて発生するcallbackを見る。

時刻へ厳密に依存するテストはCIで不安定になりやすい。制御できるPromiseやfake timerを使って理由とcleanupを確認し、実接続が必要な試験では余裕を持たせる。signalを渡しても無視する下位APIは、専用cancel methodなどの対応が必要になる。

導入するときは、一つのHTTP処理など、入口から下位APIまで追える経路を選ぶ。利用者が待つのをやめた時点から、不要な仕事が止まり、理由と残った副作用が分かるところまでを確認する。これがPromise.raceだけで待機を切る実装との実務上の違いだ。

## 制約と未検証範囲

- 実行結果は2026年10月20日のmacOS x86_64・Node.js 23.11.0によるtimerの既存検証。2026年10月23日は公式資料を再確認した。HTTP server、DB、stream、worker_threads、child_process、browser、外部SDK、本番trafficでは試していない。
- 40msは機能確認用の設定で、時刻や性能の保証ではない。cancelによる部分的な書き込みや外部処理の補償は、各APIに合わせて設計する。

## 確認したもの

- [Node.js Documentation — Global objects: AbortController and AbortSignal](https://nodejs.org/api/globals.html#class-abortcontroller)
- [Node.js Documentation — Timers Promises API](https://nodejs.org/api/timers.html#timers-promises-api)
- [Node.js Documentation — File system cancellation boundaries](https://nodejs.org/api/fs.html)
