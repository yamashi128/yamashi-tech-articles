# Toolformerを読む：AIはいつ道具を使うと決めるのか

YAMASHI TECH AI Editorial Desk | Research | AI / ML / AI Agents

[掲載ページ](https://yamashi-tech.com/articles/paper-toolformer-self-taught-tool-use) · [原稿データ](../articles/paper-toolformer-self-taught-tool-use.json)

公開: 2026-09-17 / 更新: 2026-09-17 / 確認: 2026-09-17

検索や計算機を『使える』だけでは足りない。Toolformerが、いつ呼ぶか・何を渡すか・結果をどう使うかを自己教師ありで学んだ方法と限界を読む。

## 問題はAPIの接続ではなく、呼ぶ価値の判断

言語モデルは文章生成が得意でも、正確な四則演算、現在日付、学習後に起きた事実では専用toolに負ける。では毎回検索や計算機を呼べばよいかというと、遅延と費用が増え、不要な戻り値がcontextを汚す。さらに、どのtoolへ何を渡し、返答のどこを使うかも決めなければならない。

Toolformerが扱ったのは、APIを呼ぶ能力を人が大量にラベル付けせず学ばせることだ。少数の使用例から候補データを作り、toolの結果が後続文の予測に本当に役立った例だけを残す。6.7B parameterのGPT-Jを基に、呼ぶか、いつ呼ぶか、引数、結果の取り込みを同時に学習した。

## 自己教師ありデータ生成は、四段階で進む

第一段階では、数個のdemonstrationを入れたpromptで、通常テキストの途中にAPI call候補を生成する。第二段階で実際にAPIを実行し、文字列の結果を得る。第三段階で、その結果を与えた場合に後続tokenのlossがどれだけ下がるかを計算する。第四段階で、閾値以上に役立ったcallだけを原文へ埋め込み、追加学習用のcorpusを作る。

比較するのは、toolの入力と結果を与えた場合、toolを呼ばない場合、入力だけを書いて結果を与えない場合だ。結果が将来tokenの予測を改善しないcallは捨てられる。人間が『便利そう』と決める代わりに、モデル自身の予測lossを有用性の代理指標にしたところがToolformerの中心である。

論文のdata generationを擬似コードにしたもの

```python
candidates = sample_api_calls(text, demonstrations)
for call in candidates:
    result = execute(call)
    gain = loss_without_result(text, call) - loss_with_result(text, call, result)
    if gain >= threshold:
        training_data.append(insert(text, call, result))
```

## 五つのtoolは、モデルの弱点を別々に補う

実験で使ったのは、質問応答、Wikipedia検索、計算機、機械翻訳、calendarだ。質問応答は短いfact、検索は広い文章、計算機は四則演算、翻訳は英語への変換、calendarは現在日付を返す。入力と出力をtext sequenceで表現でき、少数のdemonstrationを用意できることが共通条件だった。

万能toolを一つ作らず、弱点ごとにinterfaceを分けている点は現在の設計にも有効だ。戻り値の精度、timeout、権限、課金が違うtoolを一つのfree-form APIへまとめると、誤選択を測れない。toolごとに用途と失敗形式を固定すると、『呼ぶべきだったのに呼ばなかった』『別のtoolを呼んだ』を評価できる。

## 小さいモデルが、大きいモデルを上回った部分

LAMAの三つのsubsetでは、Toolformerが同じGPT-J系列だけでなく、66BのOPTや175BのGPT-3を上回った。SQuADは33.8、Google-REは11.5、T-RExは53.5で、toolを無効にした同じモデルは22.1、6.3、34.9だった。質問応答toolを98.1%の例で選んだことが改善へ大きく寄与した。

ただし、これはinstruction-tunedではない当時のmodelを使うzero-shot設定で、Wikipedia検索toolも公平性のためLAMAでは禁止されている。『6.7Bなら常に175Bより賢い』という結果ではない。適切な外部機能が、parameter数だけでは埋めにくい弱点を補った実験と読むべきだ。

LAMA subsetの結果。値が高いほど良い

| Model | SQuAD | Google-RE | T-REx |
| --- | --- | --- | --- |
| Toolformer | 33.8 | 11.5 | 53.5 |
| Toolformer（tool無効） | 22.1 | 6.3 | 34.9 |
| GPT-3 175B | 26.8 | 7.0 | 39.8 |
| OPT 66B | 21.6 | 2.9 | 30.1 |

## tool useは、model sizeとdata filterに依存した

論文は124M、355M、775M、1.6BのGPT-2系列と6.7BのGPT-Jも比較した。小さいmodelではtoolが性能向上へ結びつかない場合があり、model sizeが大きいほどAPI利用を学びやすい傾向が出た。tool schemaを見せれば、どのmodelでも同じように使えるわけではない。

また、生成dataの量はfilter thresholdで大きく変わる。たとえばWikipedia検索は閾値0.5で207,241例、2.0では13,944例まで減る。緩いfilterは量を増やすが不要callも混ぜ、厳しいfilterはqualityを上げる代わりに稀な使い方を失う。製品でも、tool call成功数だけでなく、最終回答やtask成功へ寄与した割合を記録する必要がある。

## 現在のagentへ持ち込むなら、routerを評価する

モデル自体を追加学習しなくても、Toolformerの問いは使える。各callについて、必要性、tool選択、引数、結果利用の四点をlogに残す。最新情報を問われたのに検索しなかった、計算機が必要ないのに毎回呼んだ、検索結果は正しいのに回答へ反映しなかった。この分類があれば、prompt、schema、router、tool側のどこを直すか判断できる。

tool descriptionは宣伝文ではなくcontractにする。入力型、必須項目、対象外、side effect、戻り値、代表的な失敗を短く書く。読み取りと書き込みは分離し、書き込みにはpreviewと承認を付ける。選択肢を増やす前に、既存toolがいつ役立ったかを測るほうが、agentの精度を上げやすい。

| 評価点 | 失敗例 | 主な改善先 |
| --- | --- | --- |
| 必要性 | 検索不要なのに毎回検索 | routerの閾値、cost情報 |
| 選択 | 計算を検索toolへ渡す | tool名と責務の分離 |
| 引数 | 対象repoや日付が欠ける | schema、validation |
| 結果利用 | 出典を取得したが回答で無視 | 戻り値構造、後段prompt |

## Toolformerが解いていないこと

論文のtoolはtext入出力が中心で、実行権限、認証、課金、個人情報、破壊的操作は扱っていない。APIが悪意ある文字列を返すprompt injectionも、結果の鮮度や出典品質も別問題だ。学習時に使えたAPIが本番で停止したときのfallbackも設計が必要になる。

さらに、loss低下は『文章の続きを予測しやすい』ことを測る指標であり、事実の正しさや利用者の目的を直接保証しない。現在のagentでは、tool call単体の有用性に加え、task-levelの成功、費用、latency、安全性を評価する。Toolformerは完成したrouterではなく、tool useを学習と計測の対象にした出発点として読むとよい。

## 制約と未検証範囲

- 自己教師ありで得たtool-use結果は、任意の現行model、API、非公開toolで同じ精度を再現できることを示さない。

## 確認したもの

- [Toolformer: Language Models Can Teach Themselves to Use Tools — arXiv](https://arxiv.org/abs/2302.04761)
- [Toolformer paper — HTML](https://arxiv.org/html/2302.04761)
- [Toolformer — AI at Meta Research](https://ai.meta.com/research/publications/toolformer-language-models-can-teach-themselves-to-use-tools/)
