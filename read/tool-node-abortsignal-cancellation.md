# Node.jsのAbortSignal設計：timeoutと利用者cancelを一つの終了理由へ潰さない

YAMASHI TECH AI Editorial Desk | Deep Dive | Software Engineering / TypeScript

[掲載ページ](https://yamashi-tech.com/articles/tool-node-abortsignal-cancellation) · [原稿データ](../articles/tool-node-abortsignal-cancellation.json)

公開: 2026-10-20 / 更新: 2026-10-22 / 確認: 2026-10-22

Node.jsのAbortSignal.timeoutとAbortSignal.anyを使い、deadlineと利用者cancelを合成する。Node.js 23.11.0でtimer cancellationを確認し、Promise.raceでは止まらない下位処理、reason伝播、cleanupの設計を整理した。

## 結論：timeoutは結果を捨てる処理ではなく、下位へ停止を伝えるcontract

JavaScriptでは`Promise.race`で処理とtimerを競争させれば、呼び出し元を先に返せる。しかし負けたPromiseの処理は自動では止まらない。HTTP request、retry、file read、timerが裏で続けば、resourceを消費し、遅れて書込みを完了し、test終了を妨げることがある。

`AbortSignal`は、呼び出し元のcancel、deadline、shutdownなどの終了要求を下位APIへ渡す共通contractになる。Node.jsでは`AbortSignal.timeout()`でdeadlineを作り、`AbortSignal.any()`で複数理由を合成できる。重要なのは一つのbooleanへ潰さず、`signal.reason`とerror chainで終了理由を保持することだ。

- Verified observation：Node.js 23.11.0で40ms timeoutがAbortErrorとしてtimerを中断
- Verified observation：combined signalのreasonはTimeoutError、error.causeにも伝播
- Fact：AbortSignal.anyは最初にabortしたsignalのreasonを採用
- Recommendation：API boundaryでsignalを受け取り、下位の対応APIへそのまま渡す

## 背景：Promiseの完了と、処理の停止は別の状態

`Promise.race([work(), timeout()])`でtimeout側がrejectすると、呼び出し元は失敗を受け取る。だが`work()`へ停止方法を渡していなければ、workはevent loop、socket、thread pool、remote service上で進み続ける。画面上はtimeoutでも、side effectが後から発生する可能性がある。

cancel可能なAPIは、開始時に`AbortSignal`を受け取り、既にabort済みなら早期に止まり、実行中のabort eventでresourceを解放し、終了理由を返す。呼び出し元と下位処理が同じsignalを共有することで、timeoutが単なる表示上のerrorからresource lifecycleへ変わる。

timeout実装の違い

| 方式 | 呼び出し元 | 下位処理 | risk |
| --- | --- | --- | --- |
| Promise.raceのみ | 先に失敗できる | 継続し得る | late write、resource leak |
| AbortSignal伝播 | 失敗を受け取る | 対応APIは停止を試みる | APIごとのbest effort差 |
| process強制終了 | 全task停止 | cleanup不能の場合がある | data損失、広すぎる影響 |

## 検証環境：timeoutとuser cancelを合成した

2026年10月20日、macOS x86_64、Node.js 23.11.0で、`node:timers/promises`の`setTimeout`へcombined signalを渡した。利用者用`AbortController`と`AbortSignal.timeout(40)`を`AbortSignal.any`で合成し、1000msのtimerを開始した。利用者側はabortしなかった。

実行結果は`name: AbortError`、`cause: TimeoutError`、`elapsedMs: 40`、`aborted: true`、`reason: TimeoutError`だった。processはexit code 0で完了した。これはNode.js timer APIでの観測であり、database queryや外部HTTP requestが同じ精度で止まることを示さない。

| 項目 | 結果 | 意味 |
| --- | --- | --- |
| Node.js | 23.11.0 | このversionで実行 |
| 予定timer | 1000ms | 完了前に中断 |
| deadline | 40ms | 約40msでabort |
| caught error | AbortError | 対応APIのreject |
| signal.reason | TimeoutError | 終了理由を区別可能 |

## 最小実装：caller signalとdeadlineを合成する

service functionはoptionalなcaller signalを受け取り、内部deadlineと合成する。caller signalがなければdeadlineだけを使う。下位の`fetch`、timer、対応するfilesystem APIへ同じsignalを渡す。Node.jsのfetchにはbrowserのdocument基準URLがないため、例ではapplicationが渡すbase URLから絶対URLを作る。catchでは`AbortError`だけでtimeoutと決めつけず、combined signalのreasonを確認する。

public APIでは、timeoutを数値だけで受けるよりsignalも受けると、HTTP request disconnect、application shutdown、user actionを同じcontractへ載せられる。ただしbusiness errorとcancel errorを一つのgeneric errorへ包むと、retry判断やHTTP statusが壊れる。

caller cancelとdeadlineを合成する例

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

## reasonを残す：timeout、利用者操作、shutdownを分ける

`AbortController.abort(reason)`は任意のreasonをsignalへ保存できる。`AbortSignal.timeout()`はTimeoutErrorをreasonにし、`AbortSignal.any()`は最初にabortしたsignalのreasonを採用する。これにより、利用者がcancelしたのか、system deadlineなのか、server shutdownなのかをlogとmetricで分けられる。

error message文字列だけで分類するとruntimeやlibrary更新で壊れやすい。可能なら`signal.reason`、`error.name`、`error.cause`、operation name、deadlineを構造化して記録する。credential、request body、個人情報はreasonやlogへ入れない。reasonはerror transportであり、secret transportではない。

利用者cancelへ明示的なreasonを付ける

```typescript
const controller = new AbortController();
const signal = controller.signal;
controller.abort(new DOMException('user cancelled', 'AbortError'));

if (signal.aborted) {
  console.info({ reason: signal.reason?.name }, 'operation stopped');
}
```

## listenerとcleanup：abortは一度でも、参照は残り得る

Node.js documentationは、AbortSignalのlistenerへ`{ once: true }`を使うことを推奨する。abort eventは一度だけだが、長寿命objectへlistenerを付けたままにするとclosureとresourceが保持される可能性がある。operationが正常終了した場合もlistenerを外せる構造にする。

custom async APIでは、開始前に`signal.throwIfAborted()`を呼び、resource取得後はabort listenerでcloseし、finallyでlistenerとresourceを片付ける。abortと正常完了が競争するため、cleanupをidempotentにする。同じsocketを二回closeして別errorを上書きしない。

## best effortの境界：abortはtransaction rollbackではない

Node.jsの`fs.readFile`はsignalで内部bufferingを中断できるが、個々のOS request自体をabortするわけではないとdocumentationにある。`writeFile`もcancelはbest effortで、途中まで書かれる可能性がある。APIがsignalを受け取ることと、side effectが原子的に取り消されることは同じではない。

external APIへPOSTした後にabortしても、server側が処理を完了する場合がある。支払い、provisioning、message publishではidempotency key、transaction、status query、compensationを用意する。clientがresponseを待たなくなったことを、operationが存在しない証拠にしない。

- read-only処理でもsocketとtimerを解放する
- write処理はidempotency keyと再照会手段を持つ
- abort後のlate completionを監査logで追えるようにする
- cancel failureをretryして二重実行しない

## test設計：時刻だけでなく、下位処理が止まったかを見る

testでは、deadline前の正常完了、deadlineによる中断、caller cancel、開始前abort、下位APIがsignal非対応、abortと完了の同時発生を分ける。単に『50ms以内にrejectした』だけでなく、timer、socket、temporary file、background callbackが残っていないかを観測する。

wall clockへ強く依存するtestはCI負荷でflakyになる。fake timerやcontrollable promiseを使い、reasonとcleanup callをassertする。integration testでは余裕のあるdeadlineを使い、production値そのものをmillisecond単位で再現しようとしない。

## 採用条件：signalを端から端まで渡せる経路から始める

AbortSignalは、Node.js built-inとWeb APIをまたぐ共通contractとして有用だが、third-party libraryがsignalを無視すれば途中で切れる。call graphを調べ、fetch、timer、stream、database driver、queue clientのどこまで伝播するかを一覧にする。対応しないAPIには専用cancel methodやconnection closeが必要になる。

導入はHTTP request一つから始め、request disconnectとdeadlineをservice、repository clientまで渡す。metricでtimeoutとuser cancelを分け、late side effectがないことを確認して広げる。成功条件はerrorが早く返ることではなく、不要になった仕事が安全に止まり、理由と残ったside effectを説明できることだ。

## 制約と未検証範囲

- 2026年10月20日にmacOS x86_64、Node.js 23.11.0で`node:timers/promises`、`AbortSignal.timeout(40)`、`AbortSignal.any()`を使う一時的なinline programを実行した。約40msでAbortErrorとなり、combined signalのreasonがTimeoutErrorであることを確認した。
- HTTP server、database driver、stream、worker_threads、child_process、browser、third-party SDK、production trafficでは検証していない。各APIがAbortSignalをどこまでsupportするかは個別に確認する必要がある。
- timerの40msは機能確認用で、realtime保証やlatency benchmarkではない。event loop負荷、OS scheduling、suspendで実際の時刻は変動する。
- cancelはrollbackではない。書込み、external API、filesystem operationが部分的に進んだ場合のcompensation、idempotency、transactionは別に設計する必要がある。

## 確認したもの

- [Node.js Documentation — Global objects: AbortController and AbortSignal](https://nodejs.org/api/globals.html#class-abortcontroller)
- [Node.js Documentation — Timers Promises API](https://nodejs.org/api/timers.html#timers-promises-api)
- [Node.js Documentation — File system cancellation boundaries](https://nodejs.org/api/fs.html)
