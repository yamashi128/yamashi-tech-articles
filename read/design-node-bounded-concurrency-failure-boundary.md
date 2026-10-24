# Promise.allで並行数は制限できない：workerで開始数と失敗後の回収を制御する

YAMASHI TECH AI Editorial Desk | Deep Dive | Software Engineering / TypeScript

[掲載ページ](https://yamashi-tech.com/articles/design-node-bounded-concurrency-failure-boundary) · [原稿データ](../articles/design-node-bounded-concurrency-failure-boundary.json)

公開: 2026-10-23 / 更新: 2026-10-23 / 確認: 2026-10-23

mapで開始した処理は、Promise.allが失敗しても動き続ける。未開始の関数をworkerへ渡す実装を作り、上限2、失敗後の開始停止、開始済み処理の完了待ちを6件の実験で確かめる。

## 並行数を絞るなら、Promiseを待つ前に開始を制御する

Promise.all(items.map(load))では、mapが各loadを呼び出すため、全件を開始してから完了を待つ。一件の失敗でPromise.allがrejectしても、残りの実行中処理は自動では止まらない。

並行数を制限するには、まだ呼び出していない関数を待ち行列へ置き、workerが一件ずつ取り出す。この記事では「同時に上限2件」「失敗を検知したら未開始分は始めない」「開始済み分が終わってから返す」という小さな実装を作る。

## 集約、開始数の上限、失敗後の方針を別々に選ぶ

Promise.allは全入力の成功を集約し、一つがrejectすると集約側をrejectする。Promise.allSettledは全入力の成否がそろうまで待つ。どちらも、既に始めた処理を開始前へ戻したり、開始を順番待ちにしたりするAPIではない。ECMAScript仕様では、この完了の集約が定義されている。

そこで[() => load(a), () => load(b)]のように仕事を関数として渡す。呼び出す権限をworkerへ集めれば、未完了の仕事が上限に達した間は新しい仕事を始めずに済む。開始済みPromiseの配列を後から分割して待つ方法では、開始数を減らせない。

| 方針 | 選ぶ理由 | 別途必要な設計 |
| --- | --- | --- |
| 最初の失敗をすぐ通知 | 呼び出し側が早く代替へ進む | 残った処理の監視・回収・副作用の確認 |
| 全件を試して状態を集める | 独立した仕事の部分成功を利用する | 結果ごとの成功/失敗表示と再実行方針 |
| 未開始を止め、開始済みを待つ | 追加の仕事を増やさず終了状態を確定する | 終わらない仕事へのdeadlineや運用上の打切り |

## workerは一件をawaitし、失敗を観測したら停止フラグを立てる

独自実装のrunBoundedは、次のindex、停止フラグ、入力順の結果配列を共有する。各workerはフラグを確認してindexを取り、その関数を呼んでawaitする。成功したら次へ進み、失敗したらフラグを立てる。全workerの終了後、エラーがあればAggregateErrorを返す。

同じJavaScript実行環境で、フラグの確認からindexの更新までにawaitを挟まない構造だ。失敗したPromiseをcatchする前に別のworkerが仕事を始めることまでは止めないため、停止の境界は「失敗を観測した後」になる。

値は入力indexへ保存する。後の仕事が先に終わっても返却配列の順序は入力にそろう。この上限はrunBoundedを通る仕事の本数であり、各仕事が内部で発行する複数requestの数やCPU core数を直接制御するものではない。

## 六つの処理を、手動のgateで制御して試す

次の全文をpool_fixture.mjsへ保存し、node --unhandled-rejections=strict pool_fixture.mjsで実行できる。編集部は2026年10月23日、Darwin 24.6.0 / x86_64、Node.js 23.11.0で実行した。追加package、ネットワーク、実時間の性能測定は使わない。

各処理は手動で開けるPromiseのgateを待つ。開放順を固定して、開始数、未完了数、最大同時数、完了順をassertする。setImmediateのPromise版はevent loopへ制御を戻す観測用のcheckpointとして使う。

runBoundedが受け取るのは有限の密な関数配列。開始済みPromise、0・負数・小数の上限を拒否し、空入力と同期throwも確認する。

実行済みの再現コード：node --unhandled-rejections=strict pool_fixture.mjs

```javascript
import assert from 'node:assert/strict';
import { setImmediate as checkpoint } from 'node:timers/promises';

async function runBounded(tasks, limit) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('limit');
  if (!tasks.every(task => typeof task === 'function')) throw new TypeError('task');
  const values = new Array(tasks.length);
  const errors = [];
  let next = 0;
  let stopped = false;
  async function worker() {
    while (!stopped && next < tasks.length) {
      const index = next++;
      try { values[index] = await tasks[index](); }
      catch (error) { errors.push(error); stopped = true; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  if (errors.length) throw new AggregateError(errors, 'batch failed');
  return values;
}

function fixture(failing = true) {
  const state = { started: [], finished: [], active: 0, peak: 0 };
  const gates = Array.from({ length: 6 }, () => {
    let release;
    const promise = new Promise(resolve => { release = resolve; });
    return { promise, release };
  });
  const tasks = gates.map((gate, index) => async () => {
    state.started.push(index);
    state.active++;
    state.peak = Math.max(state.peak, state.active);
    try {
      await gate.promise;
      if (failing && index === 1) throw new Error('fixture failure');
      return index;
    } finally { state.active--; state.finished.push(index); }
  });
  return { state, gates, tasks };
}

const eager = fixture();
const pending = eager.tasks.map(task => task());
const firstError = Promise.all(pending).catch(error => error.message);
eager.gates[1].release();
assert.equal(await firstError, 'fixture failure');
assert.equal(eager.state.active, 5);
const activeAtFailure = eager.state.active;
eager.gates.forEach(gate => gate.release());
await Promise.allSettled(pending);
assert.equal(eager.state.active, 0);

const bounded = fixture();
let batchReturned = false;
const failedBatch = runBounded(bounded.tasks, 2).catch(error => {
  batchReturned = true;
  return error;
});
assert.deepEqual(bounded.state.started, [0, 1]);
bounded.gates[1].release();
await checkpoint();
assert.equal(bounded.state.active, 1);
assert.equal(batchReturned, false);
assert.deepEqual(bounded.state.started, [0, 1]);
bounded.gates[0].release();
assert.ok((await failedBatch) instanceof AggregateError);
assert.equal(bounded.state.active, 0);

const success = fixture(false);
const completed = runBounded(success.tasks, 2);
for (const index of [1, 2, 0, 4, 5, 3]) {
  success.gates[index].release();
  await checkpoint();
}
const values = await completed;
assert.deepEqual(values, [0, 1, 2, 3, 4, 5]);
assert.deepEqual(success.state.finished, [1, 2, 0, 4, 5, 3]);
assert.equal(success.state.peak, 2);
for (const limit of [0, -1, 1.5]) {
  await assert.rejects(runBounded([], limit), RangeError);
}
await assert.rejects(runBounded([Promise.resolve(1)], 2), TypeError);
assert.deepEqual(await runBounded([], 2), []);
await assert.rejects(runBounded([() => { throw new Error('sync failure'); }], 2),
                     AggregateError);
console.log(JSON.stringify({
  eager: { started: eager.state.started.length, peak: eager.state.peak,
           activeAtFailure, activeAfterDrain: eager.state.active },
  boundedFailure: { started: bounded.state.started, peak: bounded.state.peak,
                    skipped: 6 - bounded.state.started.length,
                    activeAtReturn: bounded.state.active },
  boundedSuccess: { completionOrder: success.state.finished, values,
                    peak: success.state.peak },
  edgeCases: 'invalid limits, eager promise input, empty input, sync throw passed'
}, null, 2));
```

## 一括開始では失敗後も5件が残り、上限2では開始済み分を待って返った

一括開始の条件では6件すべてが始まり、最大同時数も6になった。index 1のgateを開けて失敗させると、Promise.allのcatchがエラーを受け取った時点で、activeは5だった。残りのgateを開けてallSettledで回収すると0になった。

上限2の条件では最初に[0,1]だけが始まった。index 1の失敗を処理した後も未開始4件は始まらず、index 0が終わるまで呼び出し側へ返らなかった。index 0のgateを開けるとAggregateErrorが返り、activeは0になった。

成功条件では1→2→0→4→5→3の順に完了させても、結果は[0,1,2,3,4,5]だった。完了順と返却順を分けた実装の動作を確認できる。

同じ6件のgate付き処理を使った観測。最大同時数はfixture内の未完了数

| 方式 | 開始件数 | 最大同時数 | 失敗を返した時点 |
| --- | --- | --- | --- |
| mapで全件開始 + Promise.all | 6 | 6 | 未完了5件が残る |
| 上限2 + 失敗検知後は新規開始停止 + drain | 2 | 2 | 開始済み分は完了、未完了0件 |
| 一括開始後のallSettledによる回収 | 既に6件開始済み | 開始時の6を減らせない | すべての状態が確定してから返る |

## 完了まで待つ設計は、早い失敗通知と引き換えになる

開始済み処理を待つdrain方式なら、返却時点でその処理群が終わったことを扱いやすい。一方、最後の処理が長引けばエラー通知も遅れ、終わらない仕事があれば待ち続ける。deadlineや取消しは別に設計する必要がある。

独立した画像変換などで部分成功を使いたいなら、失敗後も全件を試して成否を集める方針も選べる。今回の停止フラグは、開始済みI/Oの取消しや既に起きた副作用の巻き戻しを行わない。AbortSignalの伝え方は関連するNode.jsの取消し設計の記事で扱っている。

並行数2は「1秒あたり2件」というrate limitでもない。短い処理は同じ時間内に何件も進められる。接続先の時間窓制限や複数process間の共有上限がある場合は、その制御も必要になる。

## 有限のbatchへ使い、上限は接続先と処理の重さで決める

この方式は、仕事の開始位置を一か所へ集められる有限のbatchに向く。待ち件数、実行中件数、完了・失敗件数、最も長く動いている仕事を観測し、接続先の制約とresource使用量から上限を決める。実験の2は運用値の推奨ではない。

入力と結果をすべて配列へ保持するため、巨大なstreamにはそのまま適用しない。process障害後も再開したい仕事やtransactionをまたぐ更新には、永続化・順序・整合性の設計も加わる。

今回確認したのは6件のgate付き処理と独自workerの機能であり、HTTP、DB、外部queue、本番負荷の性能は測っていない。既存libraryを選ぶ場合も、上限値だけでなく失敗後の開始、回収、返却順の契約を照合すると判断しやすい。

## 制約と未検証範囲

- 2026-10-23にDarwin 24.6.0 / x86_64、Node.js 23.11.0の既存環境で、全文掲載の独自worker実装と6件の手動gate付き処理を実行した。追加package、認証情報、ネットワーク、課金は使用していない。
- 最大同時数6または2、失敗時に残る5件、未開始4件などはfixture内の未完了処理に関する観測。throughput、latency、最適な上限、本番のresource削減量を示さない。
- runBoundedは有限の密な関数配列向けの教材。全入力と全結果を保持し、deadline、取消し、retry、rate limit、永続化、transaction、streamへのbackpressureは実装していない。開始済み処理が終わらなければ完了待ちも終わらない。
- HTTP、DB、外部queue、CPU並列化、browser、複数process、大量入力、本番負荷では未検証。AbortSignalによる取消しや副作用のrollbackを検証したものではない。

## 確認したもの

- [ECMAScript 2025仕様 — 27.2.4.1 Promise.all / PerformPromiseAll / Resolve Element Functions](https://tc39.es/ecma262/2025/multipage/control-abstraction-objects.html#sec-promise.all)
- [ECMAScript 2025仕様 — 27.2.4.2 Promise.allSettled](https://tc39.es/ecma262/2025/multipage/control-abstraction-objects.html#sec-promise.allsettled)
- [Node.js 23.11.0公式documentation — Timers Promises API / setImmediate](https://nodejs.org/download/release/v23.11.0/docs/api/timers.html#timerspromisessetimmediatevalue-options)
- [関連解説 — Node.jsのAbortSignal設計：timeoutと利用者cancelを一つの終了理由へ潰さない](https://yamashi-tech.com/articles/tool-node-abortsignal-cancellation)
