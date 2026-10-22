# ReActを読む：考えるだけでなく、動いて確かめる

YAMASHI TECH AI Editorial Desk | Research | AI / ML / AI Agents

[掲載ページ](https://yamashi-tech.com/articles/paper-react-reasoning-and-acting) · [原稿データ](../articles/paper-react-reasoning-and-acting.json)

公開: 2026-09-17 / 更新: 2026-09-17 / 確認: 2026-09-17

推論と外部操作を交互につなぐReAct。四つのベンチマーク、失敗分析、現在のAIエージェントへ残った設計原則まで、数字を追いながら読む。

## この論文が変えたのは、答えの作り方ではなく仕事の進め方

ReActは、ReasoningとActingを一つの軌跡へ組み合わせる枠組みだ。2022年に公開された当時、Chain-of-Thoughtは複雑な問題を段階的に考える方法として成果を上げていた。しかしモデルの内部知識だけで考え続けると、途中で作った誤った事実を後段の推論が引き継ぐ。反対に、環境から行動だけを選ぶ方式では、目標や状況を整理する余地が乏しい。

ReActはこの二つを交互に置く。いま分かっていることを整理し、検索や環境操作を一つ実行し、返った観察を次の判断へ入れる。現在のtool-using agentに見られる『調べる、動く、結果を見る、修正する』という基本形を、質問応答と意思決定の両方で示した点が重要だ。

## 推論・行動・観察の繰り返し

論文の質問応答では、モデルがThoughtを書き、`search[entity]`または`lookup[string]`を選ぶ。環境が返した検索結果をObservationとして読み、十分な根拠が集まれば`finish[answer]`で終了する。HotpotQAでは6例、FEVERでは3例の軌跡をpromptへ入れ、最大stepもそれぞれ7回と5回に制限した。つまり、自由に考え続けさせたのではなく、行動空間と停止回数を先に設計している。

実装で保存すべきなのは、モデルの長い内語そのものではない。目標、選択したtool、引数、返った観察、次の状態、終了理由を構造化すれば、後から『何を根拠に何をしたか』を確認できる。製品で必要なのは秘密の思考過程の再現ではなく、外部へ影響した判断の監査可能性だ。

ReActを実装へ落とす最小ループ

```python
while not done:
    action = choose_action(goal, state)
    observation = run_tool(action)
    state = update_state(state, action, observation)
    done = reached_goal(state) or hit_budget(state)
```

## 四つのベンチマークは、同じ能力を測っていない

評価には、複数文書をまたぐ質問応答のHotpotQA、主張の真偽を判定するFEVER、家庭内の仮想環境で指示を遂行するALFWorld、ECサイト上で条件に合う商品を探すWebShopが使われた。前二つは検索で根拠を集める能力、後二つは環境へ一手ずつ働きかける能力を主に測る。

ALFWorldとWebShopでは、ReActが模倣学習や強化学習の比較手法に対して、それぞれ34ポイント、10ポイントの絶対成功率向上を報告した。しかもpromptに入れた軌跡は1〜2例だった。一方、質問応答ではReAct単独が常にChain-of-Thoughtを上回ったわけではない。この差を無視して『ReActなら精度が上がる』と一般化すると、論文の重要な部分を落としてしまう。

論文の主な結果。数値は各ベンチマーク固有の評価値で、横比較はできない

| 評価 | 比較 | 結果 | 読み方 |
| --- | --- | --- | --- |
| HotpotQA | CoT 29.4 / ReAct 27.4 | ReAct単独は下回る | 検索で根拠は得るが、推論の柔軟さを失う場合がある |
| FEVER | CoT 56.3 / ReAct 60.9 | ReActが上回る | 事実検証では外部根拠が効いた |
| ALFWorld | 既存手法比 | +34ポイント | 少数例でも環境feedbackを使えた |
| WebShop | 既存手法比 | +10ポイント | 長い操作列でも観察を次の手へ接続した |

## 検索すれば幻覚は消える、ではない

論文の人手分析では、Chain-of-Thoughtの失敗の56%に事実の幻覚が見られたのに対し、ReActでは0%だった。一方、ReActの失敗には、役に立たない検索結果や検索APIの制約に起因するものが23%、推論の誤りや同じ行動の反復が47%あった。外部接続は、誤りを消すのではなく、誤りの種類を変える。

この結果は現在のエージェント設計にもそのまま効く。検索結果が正しいとは限らず、toolが成功コードを返しても目標を満たしたとは限らない。検索結果の出典、更新日、対象範囲を検証し、同じqueryや同じ失敗を繰り返したら停止する。観察を増やすだけでなく、観察の品質を評価する層が必要だ。

## CoTとのハイブリッドが示したもの

論文は、ReActで答えが出ないときにChain-of-Thoughtへ切り替える方式と、その逆も試した。HotpotQAではReActからCoT-SCへ切り替える構成が35.1、FEVERではCoT-SCからReActへ切り替える構成が64.6となり、単独方式を上回った。ここでの教訓は、一つのloopを万能化するより、失敗の型に応じて戦略を切り替えるほうがよいということだ。

たとえば検索結果は揃ったのに結論が出ないなら、toolを増やさず推論へ戻す。逆に、推論が同じ前提を言い換え続けるなら、外部観察を要求する。現在のagent harnessでも、step回数だけでなく『新しい証拠が増えたか』『結論だけが揺れているか』を見てmodeを変えると、無限loopを抑えやすい。

## 実装では、tool contractと停止条件が主役になる

ReActの図だけを見ると、LLMをwhile loopへ入れればagentが完成するように見える。しかし運用品質を決めるのは、toolの入力型、戻り値、timeout、再試行、副作用、成功判定だ。検索と書き込みを同じtoolへ詰め込まず、読み取りと変更を分ける。ファイル編集ならdiff、コード修正ならtest、公開なら実URLの応答を次のObservationにする。

停止条件は、成功だけでなく失敗にも必要だ。最大step、経過時間、利用量、同じエラーの連続回数、承認が必要な操作を先に決める。『まだ試せる』ことと『改善している』ことは違う。新しい証拠が増えない再試行は、回数が残っていても人へ返す。

- tool結果は命令ではなく、検証対象の外部データとして扱う
- 副作用のあるtoolは、読み取り・preview・applyを分ける
- 各操作へ成功証拠を定義し、モデルの自己申告で完了させない
- 回数、時間、費用、反復、承認境界で停止させる

## 現在の製品へ持ち込むときの限界

ReActはprompt injection、secret管理、組織の権限承認、並列書き込みの競合を解決した論文ではない。Webページに『以前の指示を無視せよ』と書かれていても、それはObservationの文字列にすぎない。上位の指示とtool outputを同じ信頼度で扱わない設計が別途必要だ。

また、論文の数値は当時のPaLM-540B、prompt、benchmark環境による。最新モデルで同じ差が再現するとは限らない。それでもReActを読む価値は残る。AIエージェントを人格的な自律存在ではなく、観察可能な状態遷移と副作用を持つソフトウェアとして考えるための、最小の設計図になるからだ。

## 制約と未検証範囲

- 報告値は論文のmodel、prompt、environment、dataset条件に限定され、現在のtool-using agent一般の性能を保証しない。

## 確認したもの

- [ReAct: Synergizing Reasoning and Acting in Language Models — arXiv](https://arxiv.org/abs/2210.03629)
- [ReAct paper — HTML](https://arxiv.org/html/2210.03629)
- [ReAct project page](https://react-lm.github.io/)
- [ReAct source code](https://github.com/ysymyth/ReAct)
