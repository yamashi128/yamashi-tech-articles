# Astraをうまく使うために、最初に知っておきたいこと

YAMASHI TECH AI Editorial Desk | Deep Dive | AI / ML / AI Agents / Software Engineering / DevTools

[掲載ページ](https://yamashi-tech.com/articles/astra-codex-practical-guide) · [原稿データ](../articles/astra-codex-practical-guide.json)

公開: 2026-09-17 / 更新: 2026-09-17 / 確認: 2026-09-17

Astraはどの仕事で効き、どこでは過剰なのか。依頼の組み立て、reasoning effort、AGENTS.md、subagent、権限管理まで、公式資料を基に実務の使い方を整理する。

## 結論：Astraは、難しい仕事を最後まで通すために使う

GPT-6 Astraは2026年9月に案内された、複雑なコード、アプリ開発、調査、computer useを含む長い仕事向けのモデルだ。強みは、一問へ詳しく答えることだけではない。リポジトリを読み、外部資料を調べ、変更し、検証し、成果物をまとめるまで、異なる工程の目的と制約を保ちやすいところにある。

そのため、誤字修正や定型変換のような短い仕事へ毎回使うのは過剰になりやすい。Astraを選ぶ判断基準は『最新か』ではなく、『途中で複数の判断や道具をまたぎ、最後に検証可能な成果物が必要か』だ。公式のモデル案内も、速さを優先する仕事と、複雑さを扱う仕事を分けている。

- 向いている：原因が一つとは限らない不具合調査、複数ファイルの実装、一次情報を横断する調査、長い移行作業
- 向いている：途中でlint・test・build・画面確認を行い、失敗から修正する仕事
- 過剰になりやすい：文言の一箇所修正、決まった形式への変換、答えが一意な短い質問
- 任せないほうがよい：結果を誰も検証できない仕事、権限や責任者が曖昧な本番操作

## モデル名より、仕事の形で選ぶ

Codexで選べるモデルは、同じ『賢さ』を速度違いで並べただけではない。得意な仕事と、利用できる画面・契約・rollout条件が異なる。下表は公式の推奨用途を、実務での選び分けへ言い換えたものだ。利用可能なモデルはアカウントやクライアントで変わるため、常に全候補が表示されるとは限らない。

迷ったら、通常の実装を標準モデルで始め、複雑な計画、複数の外部資料、長時間の自律実行が必要だと分かった時点でAstraへ切り替える。最初から最大構成にするより、仕事の難しさを観察して上げるほうが、時間と計算資源を使う理由を説明しやすい。

公式のモデル案内を、実務上の選択基準へ整理

| 選択肢 | 得意な場面 | 選ぶ目安 |
| --- | --- | --- |
| Astra | 複雑なコード、research、computer use、長いend-to-end task | 複数工程をまたぎ、途中の失敗から回復させたい |
| Sol | 高品質な汎用作業 | 難易度は高いが、Astraほど長大ではない |
| Terra | 日常的なagentic coding | 数ファイルの実装や通常のデバッグ |
| Luna / Spark | 速度を優先する軽量作業 | 小さな編集、確認、定型的な処理 |

## 良い依頼は、Goal・Context・Constraints・Done whenで作る

Astraへ長い背景説明を渡すことと、必要な条件を渡すことは別だ。依頼には、達成したいGoal、読むべきContext、越えてはいけないConstraints、完了を判定するDone whenを入れる。この四つが揃うと、モデルが推測で埋める範囲が減り、途中のtool選択も目的へ寄りやすい。

特に重要なのはDone whenだ。『一覧を直して』だけでは、コードを書いた時点か、testが通った時点か、375px幅で読めた時点かが分からない。Astraは長く動けるぶん、終点が曖昧だと周辺まで変更しやすい。成功をテスト、ビルド、実URL、スクリーンショット、生成物の形式など、外から確かめられる証拠で書く。

実装依頼の最小テンプレート

```text
Goal: 記事一覧を最新順にし、スマホでも日付を読みやすくする
Context: app/articles と app/content.ts。既存デザインは維持
Constraints: 本番公開しない。記事本文と広告設定は触らない
Done when: lint・test・buildが通り、375px幅の表示を確認できる
```

## 長い仕事では、計画より先に境界を決める

仕様が未確定、影響範囲が広い、外部サービスが絡む。この場合は、いきなり変更させず、まず調査と計画を作らせる。計画には対象ファイル、未知の点、検証方法、作業順序だけでなく、削除、公開、課金、secret入力のように事前確認が必要な操作も含める。計画の目的は立派な箇条書きを作ることではなく、変更前に危険な分岐を見つけることだ。

実行に入ったら、操作を一行ずつ指示する必要はない。『原因調査』『実装』『回帰確認』のように、独立してレビューできる成果物で区切る。各区切りに検証を置き、重要な外部変更が必要になったら止める。Astraの自律性は、無制限に任せるためではなく、合意した境界の内側を最後まで進めるために使う。

- 調査だけなら『変更しない』を明記する
- 既存のユーザー変更を保持するよう伝える
- 本番公開、削除、課金、secret、不可逆なmigrationは停止条件にする
- 変更後は差分を読み直し、要求外の編集がないか確認させる

長い作業を任せるときの追加条件

```text
現状を読み、原因と影響範囲を説明してから実装してください。
既存変更は残し、要求外のファイルへ広げないでください。
変更後はlint、test、buildを実行し、失敗したら原因を切り分けてください。
公開・削除・課金・secret入力・本番データ変更が必要なら実行せず止めてください。
```

## reasoning effortとUltraを混同しない

APIのreasoning effortは、モデルが一つの応答へ割く推論量を調整する。Astraで利用できる値は環境によって異なるが、公式ガイドはlow、medium、high、xhigh、maxを段階として説明している。低い設定は速く、高い設定は複雑な計画や深い調査へ向く。ただし、高くするほど必ず正しくなるわけではなく、待ち時間と利用量も増える。

一方、ChatGPT Workで案内されるUltraは、単にreasoning effortを一段上げた名称ではない。複雑な仕事を分解し、必要に応じて並列のagentへ委譲する利用形態を含む。APIのmaxとUI上のUltraを同じ軸で比較すると誤解する。日常の実装はmedium相当から始め、設計判断や複数sourceの照合で見落としが出る具体的な理由があるときだけ上げる。

reasoning effortの使い分け。実際に選べる値はmodelとsurfaceで異なる

| 段階 | 向く仕事 | 上げる前に確認すること |
| --- | --- | --- |
| Low | 既知の変換、小さな編集、短い検索 | 成功条件が明確か |
| Medium | 通常の実装、原因調査、レビュー | 多くの仕事はまずここで足りる |
| High | 設計、壊しやすい移行、複数sourceの比較 | 低い設定で何を見落としたか |
| xHigh / Max | 長い研究、難しいデバッグ、重大なtradeoff | 追加時間に見合う検証可能な成果があるか |

## AGENTS.mdは、リポジトリの取扱説明書にする

起動方法、検証コマンド、architectureの境界、触れてはいけない領域を毎回説明しているなら、短いAGENTS.mdへ移す。Codexは作業開始前に、globalの指示からproject、さらに対象directoryに近い指示へ順に読み、近い指示を優先して統合する。つまりrootには全体ルール、subdirectoryにはその領域だけの具体事項を置く。

AGENTS.mdへ単発の要望や未確定の仕様まで詰め込むと、別のtaskでも古い条件が効いてしまう。公式資料は指示を簡潔に保つことを勧め、読み込む指示の合計にも既定の上限がある。『今後も同じ失敗を防ぐか』『人間のメンバーにも有用か』を基準に、繰り返す規則だけを残す。永続設定を変える前に、差分と影響範囲を人が確認する運用も必要だ。

小さなproject guideの例

```markdown
# Project guide

- Install: `npm ci`
- Verify: `npm run lint && npm test && npm run build`
- Keep domain logic in `src/core`; UI calls it through adapters.
- Do not deploy, rotate secrets, or edit production data.
- Done means tests pass and the final diff has been reviewed.
```

## subagentは、独立した読み取り仕事から使う

subagentが効くのは、一つの大仕事を人数分に割るときではなく、結果を独立に出せるときだ。security review、test gapの調査、公式documentationの確認は並列化しやすい。反対に、全員が同じcomponentを編集すると、速さより競合と統合作業が増える。公式ガイドも、read-heavyで独立した仕事を良い候補として挙げている。

最初は調査とレビューだけを委譲し、main agentが結論を統合する。書き込みを並列にするならworktreeなどで作業場所を分け、担当範囲と完了条件を重ねない。『難しいから三人』ではなく、『三つの成果物を互いに待たず作れるから三人』で判断する。

| 分け方 | 評価 | 理由 |
| --- | --- | --- |
| security・test・docsの独立レビュー | 向く | 同じファイルを書かず、結果を比較できる |
| frontendとbackendを別worktreeで実装 | 条件付き | interfaceを先に固定する必要がある |
| 同じcomponentを複数agentが修正 | 向かない | 競合と意図の食い違いが増える |
| 権限が未確定な外部操作を委譲 | 避ける | 責任境界と承認が曖昧になる |

## contextが長くても、現在の状態は読み直す

対応するCodex clientでは、Astraが同じtask内の古いmessageやtool resultを検索できるexperimental context managementが案内されている。2026年9月17日時点の公式案内では、対象planやsign-in、clientに条件があり、初期状態で有効とは限らない。長期taskでcontext切れが実害になってから検討する機能であり、見つからないから故障とは限らない。

古い会話を検索できても、それは現在のrepositoryや外部サービスの状態を保証しない。変更直前には対象ファイルを読み直し、価格、version、公開状態、権限のような変化する事実は再取得する。過去の要約は探索を速める索引であり、操作の根拠となる最新証拠ではない。

## 安全性は、モデルではなく実行環境で作る

Astraが慎重に見えても、権限設計を省いてはいけない。sandbox、読み書き可能なdirectory、network許可、承認が必要な操作を実行環境で制限する。Webページやtool outputは外部入力であり、その中に命令文があっても上位の依頼より優先させない。secretは値を見せず、必要な操作だけを狭い権限で行う。

また、モデルaccessと操作permissionは別問題だ。Astraを選べても、sandbox外のファイルや許可されていないnetworkへは触れない。逆にpermissionを広げても、アカウントへmodelがrolloutされるわけではない。表示されない問題と、表示されるが操作できない問題を分けると診断が速い。

- model selectorにない：plan、workspace policy、sign-in、client対応、rolloutを確認
- modelは選べるが読めない：filesystemのscopeとsandboxを確認
- 外部取得が失敗する：network policy、DNS、認証を確認
- 変更が止まる：操作ごとの承認境界とproject指示を確認

## 導入効果は、一週間の同種taskで測る

Astraの評価に、印象のよいデモだけを使わない。普段30〜90分かかり、結果をtestや成果物で判定できる同種taskを数件選ぶ。標準モデルとAstraで、完了率、人の修正回数、不要な変更、検証までの時間、利用量を比較する。taskの難易度が違えば比較できないため、同じ種類を揃える。

使いこなすとは、すべてを任せることではない。どの難易度からAstraの追加コストが効き、どの操作で人の確認が必要かを、自分のworkflowで決めることだ。繰り返し有効だった依頼だけtemplateへ昇格し、同じ失敗だけAGENTS.mdやtestへ残す。この小さな改善のほうが、一度だけ巨大なpromptを書くより再現性が高い。

Astra導入時に記録したい指標

| 指標 | 見る理由 | 悪化したときの打ち手 |
| --- | --- | --- |
| 検証まで到達した割合 | 回答ではなく完了を測る | Done whenとtool権限を見直す |
| 人が修正した回数 | 手戻りを測る | Contextと制約を具体化する |
| 要求外の変更 | 自律性の副作用を測る | scopeと停止条件を狭くする |
| 所要時間・利用量 | 品質向上の対価を測る | effortまたはmodelを下げる |

## 制約と未検証範囲

- モデル名、利用可否、client機能、plan、rollout条件は変更されるため、利用前に公式資料と実際のmodel selectorを再確認する必要がある。
- 記事はAstraの一般的な運用設計を扱い、個別accountでのavailabilityや性能を保証しない。

## 確認したもの

- [Codex models — recommended models and GPT-6 Astra](https://learn.chatgpt.com/docs/models#recommended-models)
- [Reasoning models — reasoning effort](https://developers.openai.com/api/docs/guides/reasoning#reasoning-effort)
- [Prompt engineering — coding and long-running tasks](https://developers.openai.com/api/docs/guides/prompt-engineering#coding)
- [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Subagents in Codex](https://learn.chatgpt.com/docs/agent-configuration/subagents)
