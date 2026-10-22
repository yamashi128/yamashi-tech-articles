# Reflexionを読む：失敗を次の試行へ持ち越す

YAMASHI TECH AI Editorial Desk | Research | AI / ML / AI Agents

[掲載ページ](https://yamashi-tech.com/articles/paper-reflexion-verbal-feedback) · [原稿データ](../articles/paper-reflexion-verbal-feedback.json)

公開: 2026-09-17 / 更新: 2026-09-17 / 確認: 2026-09-17

重みを更新せず、テスト結果と短い言語メモで次の試行を変えるReflexion。HumanEval 91%の内訳と、誤ったテストが作る落とし穴まで読む。

## 再学習せずに、同じ失敗を繰り返させない

agentが一度失敗したあと、同じtaskを同じcontextで再実行すれば、似た軌跡へ戻りやすい。強化学習ならrewardを使って重みを更新できるが、taskごとに学習するのは重い。Reflexionは、失敗の原因と次に変えることを自然言語で残し、その短い記憶を次の試行へ渡す。model parameterは更新しない。

重要なのは、reflectionを感想文にしないことだ。外部環境やtestから得た評価を読み、どの判断が失敗へつながり、次は何を避けるかを書く。言語を使うことで、scalar rewardより具体的な改善方針を渡せる一方、誤った評価をもっともらしく説明して記憶する危険も生まれる。

## Actor、Evaluator、Self-Reflectionの三役

Actorがtaskを実行し、Evaluatorが軌跡や結果へscoreまたは成功判定を付け、Self-Reflectionがfeedbackから改善メモを作る。次のActorは、taskと最近のreflectionを一緒に受け取る。記憶は無限に増やさず、直近の一定数をsliding windowで保持する。

成否判定をActorの自己申告から分離した点が肝だ。codingならunit test、意思決定なら環境reward、質問応答なら正解比較を使う。『直した』という説明ではなく、別系統のEvaluatorが通ったことを次の試行の根拠にする。

評価とreflectionを分けた再試行

```python
memory = []
for attempt in range(MAX_ATTEMPTS):
    result, trajectory = actor.run(task, memory)
    evidence = evaluator.check(result)
    if evidence.passed:
        return result
    memory.append(reflect(trajectory, evidence))
raise NeedsHumanReview(memory)
```

## HumanEval 91%は、何と比べた数字か

論文のcoding実験では、GPT-4をActorとして、生成したtestと既存testのfeedbackを使い再試行した。HumanEval Pythonのpass@1は91.0%で、論文中のGPT-4 baseline 80.1%を上回った。HumanEval Rustは68%でbaseline 60%、LeetCode Hardは15%でbaseline 7.5%だった。

一方、MBPP PythonではReflexion 77.1%に対しbaseline 80.1%で下がった。全benchmarkで改善したわけではない。この差は、task specificationから正しいtestを作れるか、test executionが本当の正解を区別できるかに大きく依存する。91%だけを抜き出して『reflectionでcoding精度が91%になる』と読むのは危険だ。

論文のcoding結果。benchmarkと言語が違うため、行をまたぐ単純比較はできない

| Benchmark | Baseline | Reflexion | 差 |
| --- | --- | --- | --- |
| HumanEval Python | 80.1% | 91.0% | +10.9pt |
| HumanEval Rust | 60.0% | 68.0% | +8.0pt |
| MBPP Python | 80.1% | 77.1% | -3.0pt |
| MBPP Rust | 70.9% | 75.4% | +4.5pt |
| LeetCode Hard | 7.5% | 15.0% | +7.5pt |

## 効いたのは、reflection単体ではなかった

HumanEval Rustの難しい50問を使ったablationでは、baselineが0.60、reflectionだけを追加すると0.52、test生成だけでは0.60、reflectionとtest生成を組み合わせると0.68だった。言葉で反省させるだけでは悪化し、外部feedbackと組み合わせて初めて改善した。

この結果は実務で重要だ。agentへ『もう一度よく考えて』と頼んでも、新しい証拠がなければ言い換えを増やすだけになりやすい。再試行前に、失敗するtest、再現手順、compiler error、実画面の差分などを追加する。reflectionは証拠を圧縮する役であり、証拠の代替ではない。

## 生成testが間違うと、改善loopが逆回転する

論文は、生成testが誤っているのに解を不正解と判定するfalse positiveを調べた。HumanEvalでは1.4%だったが、MBPPでは16.3%に達した。問題文が曖昧、隠れた制約がある、test自体が誤った期待値を持つ場合、正しい実装を壊す方向へreflectionが働く。

製品では、Evaluatorにも品質保証が必要だ。既存の回帰testを最優先し、model生成testは候補として隔離する。新しいtestが仕様を表しているか人が確認し、既存動作と矛盾する場合は実装より先に仕様を解決する。複数のindependent evaluatorを使う場合も、多数決が正しさを保証するわけではない。

## 実務の失敗記録は、四項目まで圧縮する

失敗logを丸ごと次のpromptへ貼ると、重要な一行が埋もれ、古いerrorへ引きずられる。記憶には、再現条件、失敗した検証、原因仮説、次に変える一手を残す。さらに『同じpatchを再適用しない』『本番dataで試さない』のような禁止事項があるなら明示する。

古いreflectionは要約し、現在のcodeと矛盾したら捨てる。二回同じ原因が続いたら新しい観察を要求し、三回続いたら人へ返す、といったcircuit breakerも有効だ。再試行回数を増やすのではなく、各試行で新しい情報が増える設計にする。

- 再現条件：どの入力・環境・versionで失敗したか
- 検証証拠：どのtest、error、画面差分が失敗を示したか
- 原因仮説：観察から言える範囲と、まだ推測の範囲
- 次の一手：一つだけ変える点と、繰り返さない操作

## 適用しにくい領域を先に知る

論文は、局所解へ固着する可能性、有限memory、長い軌跡の圧縮を限界として挙げる。codingでも、非決定的処理、外部API、hardware、並行処理、副作用の強い処理は、生成testだけで正しさを評価しにくい。実行できるtestがあることと、仕様を十分に覆っていることは別だ。

ReActが一回の実行中にObservationで軌道修正する考え方なら、Reflexionは実行と実行の間で失敗を持ち越す考え方だ。現在のcoding agentへ使うなら、reflection機能を付ける前に、信頼できるEvaluatorと停止条件を作る。記憶の量より、検証の質が先に来る。

## 制約と未検証範囲

- 改善幅は論文中のevaluator、memory、model、task条件に依存し、言語feedbackだけで任意のagentが改善することを保証しない。

## 確認したもの

- [Reflexion: Language Agents with Verbal Reinforcement Learning — arXiv](https://arxiv.org/abs/2303.11366)
- [Reflexion paper — HTML](https://arxiv.org/html/2303.11366)
- [Reflexion official repository](https://github.com/noahshinn/reflexion)
