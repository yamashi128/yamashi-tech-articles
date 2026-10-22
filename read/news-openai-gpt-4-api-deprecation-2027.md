# OpenAIがGPT-4系4モデルの終了日を告知：2027年1月14日までに何を棚卸しすべきか

YAMASHI TECH AI Editorial Desk | News | AI / ML / DevTools / Software Engineering / Industry

[掲載ページ](https://yamashi-tech.com/articles/news-openai-gpt-4-api-deprecation-2027) · [原稿データ](../articles/news-openai-gpt-4-api-deprecation-2027.json)

公開: 2026-10-14 / 更新: 2026-10-14 / 確認: 2026-10-14

OpenAIはGPT-4o、GPT-4o mini、GPT-4.1、GPT-4.1 miniの特定API snapshotを2027年1月14日に終了すると告知した。推奨先のGPT-6 Lunaへmodel名だけを置き換える前に、固定snapshot、fine-tuning、Chat Completions／Responses、tool、出力形式、costをworkload単位で確認する必要がある。

## 要点：終了日は2027年1月14日、最初に調べるのはmodel名ではなく依存箇所

OpenAIは2026年10月14日、GPT-4oの`gpt-4o-2024-08-06`と`gpt-4o-2024-11-20`、GPT-4o miniの`gpt-4o-mini-2024-07-18`、GPT-4.1の`gpt-4.1-2025-04-14`、GPT-4.1 miniの`gpt-4.1-mini-2025-04-14`をdeprecatedとし、2027年1月14日にAPIから削除すると告知した。OpenAIのdeprecations文書では、いずれの推奨replacementも`gpt-6-luna`である。終了日を過ぎると、deprecated modelはAPIから利用できなくなるという説明である。

このニュースの実務的な意味は、呼び出し箇所を一度に差し替えることではない。production code、background job、CIのevaluation、prompt template、fallback、SDK wrapper、監視query、fine-tuned model名に固定snapshotが残っていないかを先に棚卸しする。replacementの選定は公式の案内として確認できるが、個別workflowで同じ出力、同じtool behavior、同じ費用になることまでは公開資料から導けない。

Recommendationとしては、2027年1月を本番切替日ではなく、影響範囲を確定して比較evaluationを終えるdeadlineとして扱いたい。まずread-onlyのinventoryを作り、次に実dataを使わない代表taskで出力契約と失敗時の挙動を比べ、最後に段階的なrolloutとrollbackを設計する。これはOpenAIの終了告知とAPI migration guideを基にした編集部の提案である。

- Fact：4つのGPT-4系snapshot群は2026年10月14日にdeprecatedとなり、2027年1月14日にAPIから削除予定
- Fact：OpenAIの各行の推奨replacementは`gpt-6-luna`
- Fact：base modelに紐づくfine-tuned versionも同じ終了scheduleに従う
- Recommendation：文字列検索だけで完了とせず、tool、response parser、evaluation、運用手順までdependencyとして確認する

## 何が起きたか：対象は4モデル系統の固定snapshotと、そのfine-tuned version

今回の一次情報はOpenAI APIのdeprecations pageである。同ページはdeprecationを『retireする過程』、shutdownを『APIから利用できなくなる時点』として区別している。今回の表にはGPT-4oの2 snapshot、GPT-4o mini、GPT-4.1、GPT-4.1 miniが並び、各行のshutdown dateは2027年1月14日で統一されている。alias全般やChatGPTの提供終了を発表したもの、と記事では広げない。対象は表に明記されたAPI model IDである。

また、文書はfine-tuned versionがunderlying base modelと同じshutdown scheduleに従うと明記する。fine-tuningを使うteamでは、base modelを直接呼ぶsourceだけでなく、登録済みのfine-tuned model、training dataの更新計画、再trainingの可否、evaluation dataset、deployment先のaliasを別に確認する必要がある。この記事では、fine-tuned modelの移植性や再学習の品質を検証していない。

公式の終了対象と推奨replacement（2026年10月14日確認）

| 終了日 | 対象として明記されたmodel ID | OpenAIの推奨replacement | migrationで別に確認すること |
| --- | --- | --- | --- |
| 2027-01-14 | `gpt-4o-2024-08-06`、`gpt-4o-2024-11-20` | `gpt-6-luna` | prompt、vision入力、tool call、parser、rate limit、cost |
| 2027-01-14 | `gpt-4o-mini-2024-07-18` | `gpt-6-luna` | 高頻度jobのtoken量、latency、fallback、budget |
| 2027-01-14 | `gpt-4.1-2025-04-14` | `gpt-6-luna` | system instruction、structured output、evaluationの合格条件 |
| 2027-01-14 | `gpt-4.1-mini-2025-04-14` | `gpt-6-luna` | 小型model前提の品質・費用・retry設計 |

## 以前との違い：modelの差し替えとAPI interfaceの移行は別の判断になる

OpenAIのGPT-6 Luna documentationでは、Chat CompletionsとResponses APIの両方がendpointとして記載されている。一方で同じ文書は、built-in toolsとfunction callingにはResponses APIを使うよう案内し、Chat Completionsでのfunction callingは`reasoning_effort`が`none`のときだけ対応するとしている。従って、既存のChat Completions requestでmodel IDを変えられる場合があっても、toolを使うapplicationはreasoning設定とendpointの組み合わせを確認せずに同じ挙動を期待できない。

Responses APIへのmigration guideも、Chat Completionsの`messages`とResponsesの`Items`、`choices`と`output`、会話stateの持ち方が異なると説明する。structured outputでは`response_format`ではなく`text.format`を使うというAPI shapeの差もある。これは『Responses APIへ必ず移行しなければならない』というFactではない。model replacementとinterface migrationを別ticketに分け、必要なcapabilityがあるworkloadだけを移す方が比較とrollbackを扱いやすい、という編集部のInferenceである。

さらに、GPT-6 Lunaの公開specには1,050,000-tokenのcontext window、128,000 max output tokens、text／image input、audioとvideoは未対応という記載がある。これらは現在の仕様であって、GPT-4系とのtask単位の品質差や互換性の測定結果ではない。context上限が大きいからといって、既存promptを長くすれば品質が上がる、あるいはcostが下がるとは結論できない。

## 誰に影響するか：固定ID、fine-tuning、tool、出力parserを持つAPI利用team

最も分かりやすい対象は、source codeやenvironment設定に今回の5つのmodel IDを固定しているteamである。ただし依存はapplication codeだけに限らない。queue worker、serverless function、notebook、ETL、CIのgolden test、prompt管理、observability dashboard、cost allocation、runbook、顧客ごとのoverride、fallback chainにもmodel名やresponse objectの前提が残り得る。inventoryはrepository検索に加え、deployment設定と運用画面のread-only確認まで含める必要がある。

function calling、JSON schema、画像入力、web search、file search、MCP、agent toolを使うsystemは特に比較対象が多い。GPT-6 Luna documentationはResponses APIでweb search、file search、image generation、code interpreter、hosted shell、MCPなどをsupportすると記載するが、個別のtool設計、権限、データ経路、side effectの安全性を自動で移してくれるものではない。toolを追加・変更するmigrationでは、認可とapprovalのreviewをmodel比較と別に置くべきである。後半はRecommendationである。

fine-tuned modelを持つteamは、終了日前に『base modelを変えたら既存fine-tuneを呼べるか』と推測しない。今回の公式情報で確定するのは、underlying base modelと同じ終了scheduleに従うことまでである。利用できるtraining path、再学習の費用、model selection、品質評価、data retentionは組織の最新documentationと管理画面で確認する必要がある。

## 今できること：inventory、評価契約、段階的切替を先に作る

最初の作業は、対象IDをread-onlyで列挙することだ。application、infra-as-code、secret managerの参照名、job定義、SDK wrapper、prompt registry、test fixture、alert queryを検索し、owner、用途、endpoint、input modality、tool、structured output、state、volume、error時のfallbackを一行ずつ記録する。見つからなかった場所も記録すると、後で『検索したが対象外だった』範囲を説明できる。production requestを送る必要はない。

次にworkloadごとに、合格条件をmodel名より先に決める。例えば抽出jobならschema validationだけでなく、正解label、欠損、誤った値、retry時の重複を測る。toolを呼ぶagentなら、task成功率だけでなく、tool argument、approval、拒否、timeout、budget、side effectをfixtureで確認する。文章生成なら、引用、禁止事項、locale、長さ、human reviewの負荷を含める。これらは一般的なmigrationのRecommendationであり、OpenAIが個別applicationへ示した測定結果ではない。

本番切替は小さなtrafficまたはinternal workloadから始め、旧modelの終了日より前にrollback可能な状態で比較する。Responses APIへ移す場合は、endpoint、request field、response parser、state、storage設定を同じreleaseで同時に変えない方が差分を追いやすい。guideによればResponses APIのresponseはtyped `output` arrayで、Chat Completionsの`choices`とは形が異なる。ここをparser testに固定しておくと、modelの内容差とintegration bugを分けられる。

- Recommendation：対象model IDだけでなく、endpoint、tool、response parser、fallback、fine-tune、監視を一つのinventoryにする
- Recommendation：schemaに通ることと、意味的に正しい結果、望ましいtool action、許容costを別の評価項目にする
- Recommendation：本番の長期conversation、顧客data、write toolを最初の比較に使わず、syntheticまたは承認済みfixtureから始める

## まだ分からないこと：品質、総費用、rate limit、data条件、個別integrationの互換性

OpenAIはGPT-6 Lunaのpricingとして、Standard処理のtext tokenをinput 100万token当たり0.10米ドル、cached input 0.01米ドル、output 0.50米ドルと記載する。272K input tokensを超えるpromptではrequest全体に別料金が適用され、regional processing、Fast、Batch、Flexでも条件が変わる。したがって、単価だけを既存modelの総費用や1 task当たりの価格として比較できない。prompt長、output長、cache hit、reasoning、tool call、retry、処理tierを含む実測が必要である。

また、公式migration guideはResponses APIで内部test上40〜80%のcache利用改善と記載するが、これはOpenAIの内部testの記述であり、今回のGPT-4系利用者が同じ削減を得る保証ではない。latency、rate limit、availability、language quality、tool成功率、structured outputのsemantic correctness、fine-tuning移行、organizationごとのdata residencyやretentionも、この記事の調査では確認していない。

『GPT-6 Lunaが推奨されているから、品質もsecurityもcostも自動的に改善する』という主張は支持できない。公式の推奨先と仕様は移行検討の出発点であって、business rule、permission、data handling、顧客への出力責任まで引き受けるものではない。最後の段落は公開資料から導く編集部のInferenceである。

## 次に確認する条件：終了日、対象ID、Lunaの仕様、組織別の移行条件が変わるとき

次の確認条件は、OpenAIがdeprecation tableの対象IDまたはshutdown dateを更新したとき、GPT-6 Lunaのmodel pageでendpoint・reasoning・tool・pricing・data residencyの条件が変わったとき、fine-tuningまたはmigration guideに新しい制約が出たときである。この記事は2026年10月14日の確認結果なので、implementationを始める日にも一次情報を再確認したい。

今の結論は、2027年1月14日を待って一斉にmodel名を置き換えるのではなく、今日から依存箇所と評価契約を確定させることだ。旧snapshotを何のために使っているかが分かれば、Chat Completionsを維持するのか、Responses APIへ移すのか、fine-tuningを作り直すのか、より小さいscopeで別modelを検討するのかをworkloadごとに判断できる。この優先順位は編集部のRecommendationである。

## 制約と未検証範囲

- 本稿は2026年10月14日時点のOpenAI公式deprecations、GPT-6 Luna model documentation、Responses API migration guideの照合である。API key、課金を伴うrequest、fine-tuning、production workload、rate limit、組織のdata controlを使う実行検証は行っていない。
- 終了対象、日付、推奨replacementはOpenAIが公開した情報に限る。各applicationでの品質、latency、tool成功率、structured outputの互換性、総費用、prompt cache hit率、data retention、region availabilityはworkloadと契約条件に依存し、編集部は比較測定していない。
- OpenAIがGPT-6 Lunaを推奨していることは、全てのGPT-4系利用に同一のmigration手順または同一以上のbusiness outcomeを保証するものではない。Chat Completionsを維持するかResponses APIへ移るかは、既存integration、必要なtool、reasoning設定、state管理を確認して決める必要がある。
- 将来のmodel仕様、料金、利用資格、deprecation schedule、SDKとendpointの互換性は変わり得る。実施前に対象organizationのdashboard、最新documentation、契約上のdata handlingを再確認する必要がある。

## 確認したもの

- [OpenAI API — Deprecations: GPT-4 series model deprecations (2026-10-14)](https://developers.openai.com/api/docs/deprecations)
- [OpenAI API — GPT-6 Luna model documentation (checked 2026-10-14)](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [OpenAI API — Migrate to the Responses API (checked 2026-10-14)](https://developers.openai.com/api/docs/guides/migrate-to-responses)
