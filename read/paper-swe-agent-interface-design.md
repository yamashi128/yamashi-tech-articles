# SWE-agentを読む：AIに渡す仕事場を設計する

YAMASHI TECH AI Editorial Desk | Research | AI / ML / AI Agents / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/paper-swe-agent-interface-design) · [原稿データ](../articles/paper-swe-agent-interface-design.json)

公開: 2026-09-17 / 更新: 2026-10-22 / 確認: 2026-10-22

GitHub Issueからpatchを作るSWE-agentは、モデルより先に操作画面を設計した。ACIのablation、SWE-benchの結果、安全なcoding harnessへの応用を読む。

## coding agentの性能は、モデルだけでは決まらない

SWE-agentは、GitHub Issueとrepositoryを受け取り、原因を探し、codeを修正するagent systemだ。論文が導入した中心概念はAgent-Computer Interface、略してACIである。人間向けのGUIやshellをそのまま渡すのではなく、language modelが迷いにくいcommandとfeedbackへ作り直す。

人間向けinterfaceでは、画面全体を見て必要な場所を選べる。agentでは、長すぎる出力がcontextを埋め、曖昧なcommandが誤操作を生み、silent failureが次の判断を壊す。SWE-agentはmodelを変える前に、search、view、editといった仕事場の設計を変え、その効果を測った。

## ACIは、command・feedback・guardrailの組み合わせ

SWE-agentのACIは、repositoryを検索するcommand、fileの一部を表示するcommand、対象範囲を指定して編集するcommandなど、小さなtool setで構成される。出力は必要な行へ絞り、現在位置や変更結果を明示する。一般的なshellは残しつつ、頻出作業に専用の短いinterfaceを用意した。

編集commandにはguardrailもある。置換対象が一意でない、syntax errorを作る、といった問題を早く返し、壊れた状態のまま次へ進みにくくする。良いACIは操作を増やすのではなく、誤りをその場で観察可能にする。toolの説明文だけでなく、失敗時のfeedbackまでinterfaceの一部だ。

coding harnessが返すべき最小feedback

```text
action: edit file.py lines 42-58
result: rejected
reason: replacement target matched 3 locations
evidence: matches at 42, 97, 131
next: narrow the range or include more surrounding text
```

## SWE-bench 12.47%をどう読むか

評価には、実在するPython repositoryのIssueと修正patchから作られたSWE-benchが使われた。論文v3のTable 1では、GPT-4 Turboを使うSWE-agentは2,294件のfull test setで12.47%を解決し、比較対象のRAG構成の最高3.79%を上回った。LiteではSWE-agentが18.00%、demonstrationありのshell-only agentが11.00%、demonstrationなしが7.33%である。差は前者に対して7.00ポイント、後者に対して10.67ポイントとなる。

論文の導入が述べる約10.7ポイントの改善は、Table 1のdemonstrationなしのbaselineに対応する。単に『shellとの差』と書くと比較条件が抜ける。Claude 3 OpusのSWE-agentはfullで10.46%、Liteで13.00%だった。HumanEvalFixのPythonは87.7%だが、単一functionの修正と未知のrepositoryでIssueを解く作業は異なる評価であり、この値を実repositoryの成功率へ移してはいけない。

論文v3のTable 1・2。full、Lite、HumanEvalFixを区別する

| 評価 | 構成 | 結果 | 意味 |
| --- | --- | --- | --- |
| SWE-bench test | GPT-4 Turbo + SWE-agent | 12.47% | 実Issueでは当時のSOTAでも大半は未解決 |
| SWE-bench full | Claude 3 Opus + RAG | 3.79% | Table 1のRAG比較対象 |
| SWE-bench Lite | GPT-4 Turbo + ACI / shell（demoあり） | 18.00% / 11.00% | 同じsplitの差は7.00pt |
| SWE-bench Lite | GPT-4 Turbo + shell（demoなし） | 7.33% | ACIとの差は10.67pt |
| SWE-bench full / Lite | Claude 3 Opus + ACI | 10.46% / 13.00% | 同じmodelでもsplitが異なる |
| HumanEvalFix Python | GPT-4 Turbo + SWE-agent | 87.7% | 狭い修正taskであり別尺度 |

## Issueからpatchまでのloop

agentはIssueを読み、repository全体をいきなり変更するのではなく、file検索、symbol検索、周辺行の表示で候補を狭める。編集後はtestやlintを走らせ、errorを次のObservationへ戻す。ReAct型のloopだが、行動空間をcoding向けに設計した点が違う。

重要なのは、正解patchを知っているbenchmarkでも、agentへ正解fileは与えないことだ。探索、理解、変更、検証のすべてが必要になる。実務のharnessも、最初から編集権限を渡すより、read-onlyの探索で影響範囲を作らせ、その後に狭いwrite scopeを与えるほうが安全で観察しやすい。

## 専用toolは、情報量を減らすために作る

agentへ`grep`や`sed`を教えれば済む場合もある。しかし一般commandのstdoutは、広すぎたり、formatが環境で変わったり、errorが分かりにくかったりする。専用toolは、modelの自由を増やすためではなく、必要な情報だけを安定したschemaで返すために作る。

たとえばfile viewerは総行数、表示範囲、切り詰めの有無を返す。edit toolは変更箇所、diff、syntax checkを返す。test runnerはexit code、失敗test名、artifact位置を返す。成功時より失敗時のcontractを詳しくすると、agentが同じ失敗を反復しにくい。

- 検索結果にはfile、line、match、件数、truncationを含める
- 編集は対象範囲を限定し、適用後のdiffを返す
- testはexit codeと最初の失敗を構造化する
- 出力上限へ達したら、黙って切らず続きを取る方法を示す

## 安全なharnessへ拡張する

論文の目的はbenchmark解決率であり、企業のproduction権限モデルを完成させることではない。実運用では、sandbox、network制限、secret mask、command allowlist、timeout、disk quotaをACIの外側に置く。modelへ『危険なことをしないで』と頼むだけでなく、実行環境で不可能にする。

変更操作はpreviewとapplyへ分け、削除、本番data、公開、課金、credential変更は人の承認を必要にする。外部IssueやREADMEも信頼できない入力なので、その中の命令をsystem指示として扱わない。agentが有能になるほど、許可した範囲を明示する重要性も上がる。

## 現在読むときは、数字と設計原則を分ける

論文のmodelとSWE-benchは2024年時点のsnapshotで、現在のcoding agentやbenchmark contamination、dataset更新を反映しない。後継実装やmini-SWE-agentも登場しており、最新製品の優劣をこの12.47%だけで判断できない。数字は当時の比較として扱い、現在のtoolを選ぶなら最新の評価と再現条件を確認する。

一方、『モデルに適した仕事場を作る』という設計原則は古くなりにくい。高性能modelへ切り替える前に、tool outputが長すぎないか、失敗理由が返るか、検証commandが一つに揃っているかを見る。agentの能力不足に見える問題が、実はinterface不足であることは多い。

## 訂正：2026年10月22日

初版の表ではClaude 3 Opusの約10.5%をLiteの値としていたが、これはfull test setの10.46%を丸めた値だった。Liteの13.00%と分けて訂正した。約10.7ポイントの改善も、demonstrationなしのshell baselineとの比較であることを追記した。Table 1の二つのbaselineを区別しないまま、ACIだけの因果効果として読める表現を改めた。

## 導入前に確認する五つの問い

coding agentを評価するときは、demoのpatchではなく自分のrepositoryで測る。代表的なbug、docs修正、test追加を用意し、正しいfileへ到達したか、要求外の変更をしなかったか、検証まで通したか、失敗理由を残したかを見る。成功率だけでなく、人がreviewする時間も重要だ。

最初の目標は完全自律ではない。安全なsandboxで、read、edit、verifyの一連を再現できること。SWE-agentが示したのは、賢いmodelへshellを渡せば終わりではなく、software engineeringそのものと同じように、interfaceを設計・計測・改善する必要があるということだ。

- どの情報を読み取れ、どのdirectoryへ書けるか
- tool失敗が次の判断に十分な形で返るか
- 完了をtest・build・diffで外部判定できるか
- 同じ失敗を止めるbudgetと承認境界があるか
- 最終diffを人が短時間でreviewできるか

## 制約と未検証範囲

- benchmark結果は論文記載のmodel、Agent-Computer Interface、SWE-bench version、評価条件に限定される。

## 確認したもの

- [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering — arXiv](https://arxiv.org/abs/2405.15793)
- [SWE-agent paper v3 — Table 1・2（2026-10-22確認）](https://arxiv.org/html/2405.15793v3)
- [SWE-agent official repository](https://github.com/SWE-agent/SWE-agent)
- [SWE-bench official site](https://www.swebench.com/)
