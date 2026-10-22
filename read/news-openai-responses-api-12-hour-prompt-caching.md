# OpenAI APIの12時間Prompt Caching：長いcontextを安くする前に、write料金と保持境界を測る

YAMASHI TECH AI Editorial Desk | News | AI / ML / AI Agents / DevTools / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/news-openai-responses-api-12-hour-prompt-caching) · [原稿データ](../articles/news-openai-responses-api-12-hour-prompt-caching.json)

公開: 2026-10-21 / 更新: 2026-10-22 / 確認: 2026-10-22

OpenAIはResponses APIで12時間のprompt cache lifetimeを選べるようにした。stableなprefixを時間を空けて再利用できる一方、writeは通常inputの2.5倍で、cache hit・総費用・data retentionは実測して判断する必要がある。

## 要点：12時間再利用できるが、最初のwriteは高くなる

OpenAIは2026年10月20日、Responses APIで12時間のprompt cachingを選べるようにした。GPT-5.6以降では既定の30分に加え、stableなinstructions、tool definitions、reference materialなどを長い間隔で再利用するprefixへ`12h`を指定できる。長時間のagent workflowや日中に同じ規約・資料を何度も読むapplicationでは、30分を越えてもcache read料金の対象になり得る。

ただし12時間は無料の保存ではない。OpenAIの仕様では30分writeが通常のuncached input料金の1.25倍、12時間writeが2.5倍である。cache readは両lifetimeで同じで、多くの対象modelは通常inputの0.1倍、GPT-6.1 Solは0.05倍と説明される。『長く保持すれば必ず安い』ではなく、同じprefixを何回、どの程度一致させて読むかを先に測る必要がある。

- Fact：Responses APIで`30m`（既定）または`12h`のminimum lifetimeを選べる
- Numeric fact：12時間writeは通常input料金の2.5倍、30分writeは1.25倍
- Fact：cache read料金はlifetimeで変わらず、多くの対象modelでは通常inputの0.1倍
- Recommendation：長寿命化の前に、stable prefixのtoken数・再利用回数・hit率を計測する

## 何が起きたか：10月20日にResponses APIへ12時間の選択肢を追加

OpenAIのAPI Changelogは、共有instructions、tools、contextを数時間空けて使う場合にもcached-input pricingの恩恵を得られるよう、12-hour prompt cachingを追加したと告知している。対象は`v1/responses`であり、任意のOpenAI APIや任意の旧modelへ同じparameterを付ければよい、という発表ではない。

Prompt Caching guideによると、cacheはrequestの先頭から変わらないprefixを対象にする。OpenAI-provided instructions、developer messages、tool definitions、会話履歴のtext・image・document・対応audioを含むrendered contextが対象になり得る。最小cacheable lengthはGPT-5.6以降でvisible input tokens 1,024であり、hidden system contentはこの閾値に数えない。

## 以前との違い：30分の既定cacheから、昼をまたぐreuseを指定できる

従来のGPT-5.6以降では30分が既定minimum lifetimeで、短いturn間のreuseに向く。今回の`12h`は、session内で連続してやり取りするだけでなく、日中に再開するsupport workflow、同じtool catalogを読むagent、共有referenceを持つbatch jobのような間隔へ選択肢を広げたものだ。以前のmodelにある`prompt_cache_retention`と同一の設定名・互換性ではない。

設定はResponses APIの`prompt_cache_options.ttl`で行う。explicit modeでは、再利用したいprefixの末尾に`prompt_cache_breakpoint`を置け、request-levelのttlを個々のbreakpointでoverrideできる。長く安定した資料を先、requestごとに変わる質問を後ろへ置くという設計は、12時間の対象を必要なprefixへ絞るためのものでもある。

OpenAIが示すGPT-5.6以降のprompt cache lifetime

| 設定 | minimum lifetime | write rate | 向く条件 | 読み違えてはいけない点 |
| --- | --- | --- | --- | --- |
| `30m`（既定） | 30分 | 通常inputの1.25倍 | 頻繁に続く会話・agent step | 30分後に必ず削除される約束ではない |
| `12h` | 12時間 | 通常inputの2.5倍 | 数時間後にも同じstable prefixを読む処理 | write時点で自動的に節約になるわけではない |
| cache read | 有効なentryが見つかった時 | 多くの対象modelで通常inputの0.1倍 | 一致するprefixの再利用 | hit、latency、出力の同一性は保証されない |

## 費用の境界：初回writeを含む合計3回のrequestで比較する

初回writeを含むrequestの合計をn回とし、同じprefixを一度書いた後、残りのn - 1回ですべてcache readがhitすると仮定する。read rateを通常inputの0.1倍、prefixの通常input費用をpとすると、12時間cacheのprefix部分は`2.5p + (n - 1) × 0.1p`、cacheなしは`n × p`になる。合計3回、つまり初回write 1回と再利用2回では、前者は2.7p、後者は3pとなる。これは料金倍率から編集部が再計算した例で、output、変化するsuffix、tax、model別単価、tool callは含まない。

初回writeだけなら2.5p対p、初回writeと再利用1回なら2.6p対2pである。2026年10月22日の訂正では、見出しの『3回の完全reuse』を『初回writeを含む合計3回のrequest』へ改め、総request数と再利用回数を区別した。cache miss、prefixの短さ、途中でのinstruction変更、compaction、混在lifetimeは計算を変える。請求予測は`cached_tokens`、`cache_write_tokens`、さらに`ttl_30m_tokens`と`ttl_12h_tokens`をusageから分けて行いたい。

初回writeを含む回数と、再利用回数を分けた計算（read rate 0.1倍）

| 合計request数 | write / cache read | 12hのprefix費用 | cacheなし |
| --- | --- | --- | --- |
| 1 | 1 / 0 | 2.5p | 1p |
| 2 | 1 / 1 | 2.6p | 2p |
| 3 | 1 / 2 | 2.7p | 3p |

## 誰に影響するか：長い共通contextを、時間を空けて再利用するteam

候補になるのは、毎回同じpolicy、tool schema、product documentation、codebase summaryを先頭へ置き、複数のrequestがそのまま共通prefixを共有するapplicationだ。例えば日中に断続的に届くsupport ticket、同じtool定義を持つagent job、厳密にversion固定したreference packを使うbatch処理では、12時間が30分より適合することがある。

一方、userごとに先頭へ固有dataを入れる、timestampやrandom IDをprefixへ混ぜる、短いpromptしか使わない、一回限りの生成を行うworkflowには高いwrite料金だけが残り得る。prompt cachingはcached KV stateのreuseであり、semantic correctness、tool実行の成功、schema以外の意味的妥当性、同じoutputを保証する機能ではない。

## 保持とprivacy：12時間はminimum lifetimeで、削除deadlineではない

OpenAIのguideは、cacheがtokenそのものではなくkey-value（KV）tensorを保存すると説明する。`12h`はcache read料金の対象となるminimum lifetimeを選ぶもので、entryを12時間で必ず消す設定ではない。OpenAIがより長くretainする場合もあり、同設定はmaximum data-retention policyを変更しないと明記されている。

したがって、12時間という名前を『12時間だけdataが存在する』『ZDR要件を満たす』『国やregionの要件を回避できる』と読むことはできない。利用前にmodelとorganizationで利用可能なretention policyを確認し、DPA、data residency、顧客契約、promptへ含めるdataの分類を自組織の担当者と照合する必要がある。これは公開仕様から導くRecommendationである。

## 今できること：cacheを増やす前に、prefixをversion化して観測する

まずrequestを、安定したdeveloper instructions・tool definitions・reference materialと、案件ごとに変わるuser inputへ分ける。stable prefixにはversion IDを付け、変更時にcache missが増えることを意図した挙動として追えるようにする。1,024 visible input tokensを満たしているか、どこにbreakpointを置くか、30分と12時間のどちらが必要かを、実trafficの代表sampleで確認する。

次にcache hit率だけで採否を決めず、requestごとのordinary input、30分write、12時間write、cached read、p50／p95 latency、task acceptance、error率を同じ期間で比較する。OpenAIはPrompt Caching DashboardとPrompt Cache Diagnosticsを案内しているが、本稿では利用していない。production promptを入れる前に、承認済みのsynthetic dataまたは安全に匿名化したevaluation setを使うべきである。

費用を分けて観測する概念例（編集部では未実行）

```text
stable_prefix = instructions + tool_definitions + versioned_reference
mutable_suffix = current_user_request

measure = ordinary_input_tokens
        + cached_tokens
        + ttl_30m_write_tokens
        + ttl_12h_write_tokens
compare = total_cost, cache_hit_rate, p95_latency, task_acceptance

# 12hはstable prefixを数時間後にも再利用する場合だけ候補にする
```

## まだ分からないこと：実際のhit率、latency、model・組織ごとの適用条件

公開資料からは、特定applicationで何%がcache hitするか、12時間entryがどの程度のlatency短縮を生むか、どれほどのrequest間隔で最適化が逆転するかを確定できない。prefixの一致はrendered context、breakpoint、model、request設定に依存する。cache readでもrate limitに数えられ、同じrequestが同じoutputを返す保証もない。

また、対応model、pricing、retention policy、usage field、dashboardのavailabilityは変わり得る。本稿はAPI callによる400 response、billing明細、organization設定、ZDR環境での挙動を検証していない。特に古いmodelの`prompt_cache_retention`を使う既存実装は、parameterを名前だけ置換せず、公式migration guidanceと実際のevaluationを確認する必要がある。

## 次に確認する条件：実workloadの計測値とpricing・retention仕様が更新されたとき

次回は、対象modelのpricing、minimum cacheable length、Responses API parameter、usage fields、data-control documentationが更新されたときに再確認する。導入teamでは、同じversionのstable prefixを少なくとも30分・数時間の両間隔で走らせ、cacheなし、30分、12時間をtask acceptanceと総費用で比べてから選びたい。

現時点の結論は、12時間prompt cachingは『contextを長く保存する』ための一般機能ではなく、再利用頻度が読めるstable prefixの料金・latency最適化手段だということだ。高いwrite率、最低保持と削除期限の違い、semantic correctnessとの違いを切り分けられるteamなら検討できる。最後の判断は編集部のInferenceである。

## 制約と未検証範囲

- 本稿はOpenAI API ChangelogとPrompt Caching guideを2026年10月21日に照合した資料調査である。API key、課金を伴うResponses API request、Prompt Caching Dashboard、Prompt Cache Diagnostics、organization data-control設定、production promptへの送信は行っていない。
- 1.25倍・2.5倍のwrite rate、read rate、minimum lifetime、token thresholdはOpenAIが公開するGPT-5.6以降の仕様であり、実際のcache hit、latency、total cost、rate limit、モデル・region・organizationごとのavailabilityは個別workloadで未検証である。
- 12時間はminimum cache lifetimeであって削除期限ではなく、OpenAIのmaximum data-retention policyを変更しない。自組織のZDR、data residency、retention、契約要件への適合を本稿だけで判断することはできない。

## 確認したもの

- [OpenAI API Changelog — 12-hour prompt caching (2026-10-20)](https://developers.openai.com/api/docs/changelog)
- [OpenAI API Docs — Prompt caching (checked 2026-10-22)](https://developers.openai.com/api/docs/guides/prompt-caching)
