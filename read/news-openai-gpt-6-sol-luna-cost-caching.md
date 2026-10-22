# OpenAIがGPT-6 Sol／Lunaを追加：agentの費用はmodel名よりcache設計で決まる

YAMASHI TECH AI Editorial Desk | News | AI / ML / AI Agents / DevTools / Software Engineering / Industry

[掲載ページ](https://yamashi-tech.com/articles/news-openai-gpt-6-sol-luna-cost-caching) · [原稿データ](../articles/news-openai-gpt-6-sol-luna-cost-caching.json)

公開: 2026-09-24 / 更新: 2026-09-24 / 確認: 2026-09-24

OpenAIはGPT-6 SolとLunaをAPI、ChatGPT Work、Codexへ追加した。token単価、長文脈の料金、prompt cache、Responses APIでの設定変更を分け、agentを安く速くするために先に確認すべき設計条件を整理する。

## 要点：Sol／Lunaは安いmodelへの単純な置換ではなく、長いagentのprefixを再利用する更新

OpenAIは2026年9月22日、GPT-6 SolとGPT-6 Lunaを発表した。APIではそれぞれ`gpt-6-sol`、`gpt-6-luna`として利用でき、発表時点でChatGPT WorkとCodexにも提供を始めた。Solはcomplex codingとagentic workflow向け、Lunaはより低いtoken単価のtierとしてmodel pageに位置付けられている。両方とも1,050,000-tokenのcontext windowと128,000-tokenのmax outputを掲げ、reasoning effortを`none`から`max`まで選べる。

ただし、agentの費用はinput単価だけで決まらない。OpenAIはGPT-6でprompt cachingのdefault hit rateを改善したと説明し、同じprefixを再利用できたcached inputには通常inputの10%の価格を示す。system instruction、tool definition、policy、長い参照資料を毎turn同じ順番で送り直すagentなら、modelをLunaへ替えるだけでなく、どこまでを安定prefixにできるかがcostと初動latencyを左右する。

- Fact：GPT-6 Sol／Lunaは9月22日に発表され、API model IDは`gpt-6-sol`／`gpt-6-luna`である
- Numeric fact：標準処理のtext token価格はSolがinput 2米ドル・output 10米ドル、Lunaがinput 0.10米ドル・output 0.50米ドル（各1 million tokens）
- Fact：cached inputは通常input rateの10%で、272K input tokens超では全requestのrateが変わる
- Recommendation：モデル比較の前に、固定instructions・tool schema・資料を安定prefixへ置けるかを測る

## 何が起きたか：9月22日に二つのGPT-6 tierとcache改善を発表

発表主体はOpenAI、発表日は2026年9月22日である。公式発表は、最上位のGPT-6 Astraとは別に、GPT-6 SolとGPT-6 Lunaをcost efficiencyのための二つのtierとして追加した。公開表では、GPT-5.6 SolからGPT-6 Solへinputは1 million tokensあたり4米ドルから2米ドル、outputは20米ドルから10米ドル、GPT-5.6 LunaからGPT-6 Lunaへinputは0.20米ドルから0.10米ドル、outputは1.20米ドルから0.50米ドルとされる。これは発表が比較対象にしたGPT-5.6 promotional pricingに対する値で、全provider・全条件での最安を示すものではない。

availabilityにも二つの面がある。APIではmodel IDを指定できる一方、ChatGPT WorkとCodexはPlus、Pro、Business、Enterprise、Eduの利用者向けに当日から段階的にrolloutすると発表された。FreeとGoはdesktop appでLunaを利用できるとされるが、Chatではまだ提供していない。従って『GPT-6が発表された』ことと、自分のworkspace、region、plan、API projectで直ちに選べることは同じではない。

本稿ではAPI keyを使ったrequest、Codexのmodel selector、ChatGPT Workの表示を試していない。提供状態は2026年9月24日に公開発表とmodel documentationを照合した結果であり、各accountの実際のavailabilityやrate limitを確認した結果ではない。

## 以前との違い：token単価の改定と、cacheを壊さない会話更新が同時に入った

以前からprompt cachingは、同じprompt prefixを処理し直さないことで入力処理を減らす仕組みだった。GPT-6の公式guideは、同じprefixを共有するrequestでcacheを再利用し、cached inputを通常inputより最大90%低い価格にでき、response開始までのinput処理時間も減らせると説明する。ここでの『最大90%』はcached input rateの割引であって、agent全体の請求やlatencyが必ず90%下がるというNumeric factではない。

今回のGPT-6向けの違いは、会話の途中でreasoning effortやtoolの呼び出し可否を変えたい場合に、以前の文脈prefixを作り直さずに済ませるための方法がdocumentationで示された点だ。supported GPT-6以降では、top-levelの`reasoning.effort`を変更する代わりに、input配列の末尾へ`configuration_update` itemを追加する。guideは、top-level settingを変えるとhidden system instructionが書き換わりcache reuseを損ね得るため、元の設定を維持するよう案内している。

これはAPI responseの意味内容、toolの権限、workflowの正しさを保証する機能ではない。cache hitは同じprefixが再利用されたことを表すだけで、古いpolicy、誤ったtool schema、不要な秘密情報まで再利用してよい根拠にはならない。安定させるのは再利用して安全なinstructionsと定義だけにし、user input、時刻、tenant固有data、短命credentialは後ろへ分ける必要がある。後半は公開guideから導く編集部のInferenceである。

GPT-6 Sol／Lunaを選ぶ前に分ける、価格・context・cacheの論点

| 論点 | 公開資料で確認できること | 導入時に自分で確かめること |
| --- | --- | --- |
| 通常text価格 | Sol: input 2米ドル／output 10米ドル、Luna: input 0.10米ドル／output 0.50米ドル（各1M tokens） | 実taskのinput・output・reasoning token・tool利用量 |
| cached input | Solは0.20米ドル、Lunaは0.01米ドル（各1M tokens、通常inputの10%） | 実際のcache hit率、prefixが変わる原因、cache writeの発生 |
| 長文脈 | 272K input tokens超ではinput／cache rateが2倍、output rateが1.5倍になる | 本当に長文脈が必要か、compactionやretrievalで短くできるか |
| 設定変更 | GPT-6 guideはconfiguration_updateでreasoning effortを末尾追加する方法を示す | SDK・endpoint・tool構成での互換性、品質・安全性・cache効果 |

## SolとLunaの使い分け：価格表ではなく、失敗コストと必要なreasoningを先に置く

公式model pageはSolをcomplex codingとagentic workflow向け、Lunaをより低価格のGPT-6 tierとして掲載する。両モデルはtextのinput／outputとimage inputを扱い、audioとvideoはmodel pageで非対応と示される。built-in toolsとfunction callingにはResponses APIを使うよう案内され、Chat Completionsでfunction callingを使う場合は`reasoning_effort`を`none`にする制約がある。このため、既存のChat Completions agentをmodel IDだけで置換して、同じtool loopとreasoning設定を保てるとは限らない。

実務では、Sol／Lunaを『高性能／低性能』の二択にしないほうがよい。review、migration plan、複数fileの修正案、失敗時の調査コストが高いtaskでは、より長いreasoningを許容してSolを候補にする意味がある。一方、分類前の候補絞り込み、明確なschemaへの抽出、低riskの要約、fixtureで自動採点できるrepetitive taskなら、Lunaで十分かを評価しやすい。これはproviderのtier説明を一般的なworkflow判断へ翻訳した編集部のRecommendationである。

ただしmodel側のstructured outputやfunction callがschemaへ合うことと、取得した値、選んだtool、書き換えたcodeが意味的に正しいことは別である。Lunaをread-onlyのtriageに使う場合でも、source link、対象record、confidenceの扱い、human reviewの閾値をapplicationで定義する。Solを使う場合も、merge、請求、権限変更、外部送信を自動承認してよい理由にはならない。

## 公開された性能値の読み方：比較は条件付きのprovider evaluationとして扱う

OpenAIの発表にはAutomationBench、Agents’ Last Exam、FrontierCode、DeepSWE、OSWorldの数値が載る。たとえばAutomationBenchではGPT-6 Sol（xhigh）が33.2%、taskあたり0.27米ドル、GPT-6 Astra（low）が30.3%、Claude Opus 5（max）が26.9%と記載される。DeepSWE 1.1ではSol（max）が68.8%、Luna（max）が66.6%とされる。これらは発表本文にあるNumeric factだが、model、effort、benchmark release、task costの前提が揃った条件でのprovider reportである。

特に比較表のcostを、API pricingだけの恒久的な序列と読まない。OpenAIはAutomationBenchについて、Claude Fable 5.1の値には約40%のtaskで起きたOpus 5 fallbackのcostが含まれていないと注記する。またfactuality評価は、以前のmodelで利用者がfactual errorをflagしたde-identified ChatGPT conversationを使い、典型的な利用を代表せず、回答長で統制していないと説明している。評価の数字は採用の手掛かりにはなるが、自社の日本語repository、tool、retry、reviewを再現する成績表ではない。

本稿の調査では外部benchmarkの再実行、競合modelのAPI call、独立した第三者benchmarkの比較検証を行っていない。したがって『Solなら特定競合より必ず安く高精度』『Lunaなら低価格で十分』『factuality errorが半分になる』とは結論できない。導入前には同一fixture、同一tool permission、同じtimeout、同じhuman review costで、task successと総費用を測る必要がある。

## 今できること：固定prefix、variable input、評価を三つに分けて小さく測る

最初の一歩は、agent requestを固定prefix、可変context、user inputの三つに分けることだ。固定prefixにはversionを付けたsystem instruction、変わらないtool definition、共通の安全policy、必要なら安定したreference materialを置く。可変contextにはcurrent repository summary、当日のalert、tenantごとのread-only recordを置き、最後にuser inputを追加する。こうするとcacheを狙う範囲と、毎requestで新鮮であるべき範囲を別々にreviewできる。

次に、同じtask setをSolとLunaへ流す。ただし自由な感想ではなく、pass/failを定義したfixtureを使う。code taskならtest、diff scope、禁止file、security scan、reviewer approvalを判定し、search／classificationならsource record、schema、false positive／false negative、escalationを残す。token usage、cached token、tool call、retry、wall-clock time、human review timeをtask単位で記録すれば、安いinput rateと本当の総費用を混同しにくい。

configuration_updateやprompt cachingはcredentialなしでは試せないため、本稿では実行していない。検証する場合も、production dataやwrite toolを初回に渡さず、使い捨てproject、synthetic fixture、read-only tool、spend limit、timeout、request IDを用いる。cache効果を期待してpolicyやtool definitionを固定しても、権限の変更、incident、機密dataの混入があれば、そのprefixを無条件に再利用しない設計が必要である。

- Recommendation：モデル名、effort、prompt version、tool schema version、cache hit、task outcomeを同じrecordへ残す
- Recommendation：Lunaを低risk・自動採点可能なtaskから評価し、Solは失敗時の復旧コストが高いtaskで比較する
- Recommendation：cache hit率ではなく、品質を満たしたtaskあたりの総費用と時間で採否を決める

## まだ分からないこと：各teamの利用可否、実測cache、data条件、productionの挙動

公開資料からは、各API projectのrate limit、ChatGPT WorkまたはCodexの個別workspaceでの表示時刻、地域・契約ごとの利用可否、実workloadにおけるcache hit率、toolを含むend-to-end latency、API以外の運用費を確定できない。model pageはrate limitがusage tierと支出に応じて変わると説明するが、具体的な上限を一般値として掲げていない。rollout中のUI availabilityとAPI availabilityを同一視しないほうがよい。

privacyとdata residencyも単純ではない。SolとLunaはEU data residencyをStandard processingでのみ利用可能とmodel documentationにあるが、これはすべての組織要件、endpoint、tool、retention、契約を満たすことを保証する文言ではない。regional processingには10%のpremiumがあり、Fast mode、Batch、Flex、long contextで料金条件も変わる。機密sourceやcustomer dataを使う前に、data controlsと組織のpolicyを対象endpointまで照合する必要がある。

また、OpenAIがcache改善で高いhit rateを『default』で提供すると説明しても、prefixを頻繁に変えるapplication、tool definitionをrequestごとに生成する設計、multi-tenant contextを混ぜる設計では同じ結果にならない。cacheは品質評価、authorization、data minimizationの代替ではない。

## 次に確認する条件：rollout完了、価格・model page・cache仕様が変わったとき

次に確認する条件は、Sol／LunaのChatGPTおよびCodex rollout完了、model snapshot・endpoint・modality・rate limitの更新、pricingの改定、272K tokenを超える料金条件の変更、prompt cachingのcompatibilityまたはconfiguration_updateの仕様変更、EU data residencyとprocessing tierの変更である。いずれかが起きた場合は、availability、表、cache設計、privacyに関する節を再確認する。

現時点の結論は、GPT-6 Sol／Lunaを『従来より安いmodel』だけで評価しないことだ。安定したprefixを安全に再利用でき、taskの正しさを自動または人のreviewで判定できるteamほど、単価とcacheの組み合わせを比較できる。反対に、context、tool、policyが毎回変わり、失敗を測れないworkflowでは、model名を替えてもcostと品質の改善を説明しにくい。後半は編集部のInferenceである。

## 制約と未検証範囲

- 本稿の性能・cost-per-task・factuality・coding比較はOpenAIが公開した評価と価格表に基づく。独立した第三者による再現、同一条件での競合比較、日本語を含む個別workflowでの精度・遅延・総費用は確認していない。
- API価格は1 million tokensあたりの標準処理の公開値で、272K tokensを超える長文脈、regional processing、Fast mode、Batch／Flex、tool call、retry、applicationの運用費を含まない。実際の請求額をこの表だけから見積もることはできない。
- 本稿の調査ではAPI key、課金を伴うAPI call、ChatGPT Work、Codex、prompt caching dashboard、configuration_update、tool executionを使用していない。公開資料の照合であり、live workloadでのcache hit率や互換性を検証したものではない。
- ChatGPTおよびCodexでの提供は段階的rolloutとされる。plan、workspace policy、利用地域、rate limit、data residency、retention、利用できるendpoint・toolは、導入時に組織の最新契約条件と公式documentationで再確認が必要である。

## 確認したもの

- [OpenAI — Introducing GPT-6 Sol and Luna (2026-09-22)](https://openai.com/index/introducing-gpt-6-sol-and-luna/)
- [OpenAI API — GPT-6 Sol model documentation (checked 2026-09-24)](https://developers.openai.com/api/docs/models/gpt-6-sol)
- [OpenAI API — GPT-6 Luna model documentation (checked 2026-09-24)](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [OpenAI API — Pricing (checked 2026-09-24)](https://developers.openai.com/api/docs/pricing)
- [OpenAI API — Prompt caching guide (checked 2026-09-24)](https://developers.openai.com/api/docs/guides/prompt-caching)
