# GitHub AI ScanがPR向けに一般提供：CodeQLの外側を埋めてもmerge判定は人とrulesetに残る

YAMASHI TECH AI Editorial Desk | News | AI / ML / DevTools / Software Engineering / Security

[掲載ページ](https://yamashi-tech.com/articles/news-github-ai-scan-pull-requests-general-availability) · [原稿データ](../articles/news-github-ai-scan-pull-requests-general-availability.json)

公開: 2026-10-16 / 更新: 2026-10-16 / 確認: 2026-10-16

GitHubはPR変更を対象にしたAI Scanを一般提供に移した。CodeQLが対象外の言語・frameworkを補完するが、結果はadvisoryでmergeを止められず、forkとDependabotのPRも対象外だ。導入時は検出数だけでなく、対象範囲、AI Credit、reviewと既存policyの役割を先に決める必要がある。

## 要点：一般提供になったが、PRのadvisory signalであってmerge gateではない

GitHubは2026年10月15日、Code scanning AI Scan for pull requestsをgeneral availabilityに移した。AI ScanはCodeQLが現在coverしていない言語・frameworkのPR差分を対象に、追加のsecurity findingを出す機能として説明されている。PHP、Shell/Bash、Terraform configuration（HCL）、Dockerfile、JavaのJSP、C#のBlazorが例として挙げられている。

ただし、AI Scanのfindingはadvisoryである。公式発表とdocumentationは、code scanning checkをfailさせず、rulesetのmerge requirementとしてPRをblockできないと明記する。『AI Scanをonにすれば危険なPRは自動で止まる』とは読めない。結果を読む人、既存のrequired check、risk acceptance、修正の確認をどこに置くかは、repository側に残る。

Recommendationとしては、導入可否をmodelの話だけにせず、対象repository、PRの種類、AI Creditの予算、findingのtriage owner、既存CodeQL・secret scanning・reviewとの境界で決めたい。これはGitHubの仕様から導く編集部の提案であり、GitHubが個別teamの安全性を保証したものではない。

- Fact：GitHubは2026年10月15日にAI Scan for pull requestsのgeneral availabilityを告知した
- Fact：findingはPRのConversation／Files changedにCodeQL結果と並び、AI indicatorで区別される
- Fact：findingはadvisoryで、code scanning checkやrulesetのmerge requirementをblockしない
- Recommendation：有効化前にbudgetとtriageの責任者を決め、既存のmerge protectionを置き換えない

## 何が起きたか：CodeQLの対象外を補うPR差分向けscanが一般提供へ

GitHubのchangelogによると、AI ScanはCodeQLを置換するのではなくcomplementする位置付けである。公式documentationも、CodeQLの対象外の言語・frameworkを対象に、PR上だけでadditional findingを生成すると説明する。AI Scanのfindingはrepository security viewのbacklog alertにはならない。したがって、default branch全体の在庫を作るscannerではなく、変更が入る瞬間にreviewへ追加signalを出す機能として読む必要がある。

documentationには、string injection、weak cryptography、broken access control、sensitive data exposure、security misconfiguration、authentication failure、data integrity failure、SSRF、supply chain riskというdetection categoryが列挙される。これはcoverageの公式説明であり、全てのcategoryを検出する保証や、各languageで同じ精度を示すbenchmarkではない。

findingにはriskの説明と、通常はsuggested remediationが含まれる。利用可能な場合はCopilot Autofixが推奨code changeを出す。しかしsuggested fixの適用、test、review、mergeは別の操作であり、本稿ではautofixの実行や修正の正しさを検証していない。

AI Scanの公式な動作範囲と、そこからは言えないこと（2026年10月16日確認）

| 項目 | 公式資料で確認できること | そのままは言えないこと |
| --- | --- | --- |
| 対象 | CodeQLがcoverしていないselected language／frameworkを含むPR変更 | repository全体や過去のdefault branchを網羅scanする |
| 実行条件 | code scanningとeffective AI Scan settingが有効で、eligibleなPRにqualifying changeがある | 全PRで必ず同じ種類・件数のfindingが出る |
| 表示 | Conversation／Files changedでCodeQLと並び、AI indicatorで識別される | findingが脆弱性の確定診断になる |
| merge | advisoryであり、checkをfailさせずruleset requirementにも使えない | AI Scanだけで危険な変更をmerge前に遮断できる |
| 提案fix | 多くのfindingにremediationを付け、利用可能ならCopilot Autofixを案内する | 提案をそのまま適用すれば安全・正確になる |

## 以前との違い：PR時点の補完scanと、既存のCodeQL・branch protectionは別の層

AI ScanはCodeQL default setupを必要とせず、CodeQL analysisの状態にも依存しない。documentationでは、CodeQLがfailureまたはwaitingでもAI Scanは実行されると説明する。これはCodeQLの実行結果を待つ補助UIではなく、独自のAI-based scanning engineとしてPRへsignalを返す設計を示す。

一方で、AI Scanがrunするのは、code scanningが有効、repositoryのAI Scan settingが有効、forkでもDependabotでもないPRにCodeQL未対応のsupported language／frameworkの変更がある場合だ。PR作成時と新しいcommitごとに実行されるが、full repository scanはsupportされない。既にmainへ入ったcodeや、対応外のPR経路のriskをこの機能だけで管理するものではない。

AI Scanはcustom instruction file、たとえば`/.github/copilot-instructions.md`や`/CLAUDE.md`を使わず、specialized promptを使うとGitHubは説明する。repository instructionsで検出基準を自在にprogramできる機能、と期待するのも適切ではない。後半は公式仕様を踏まえた編集部のInferenceである。

## 誰に影響するか：CodeQL外の変更をPRでreviewする公開・組織repository

availabilityはownerとvisibilityで分かれる。公式documentationでは、organization-owned public repositoryはactive-committer licenseなしで利用可能、organization-owned private／internal repositoryはGitHub Code SecurityまたはGitHub Advanced Securityが必要、personal accountのpublic repositoryは利用可能、personal accountのprivate repositoryは利用不可とされる。managed user accountのpersonal namespaceも対象外である。GitHub Copilot licenseはAI Scanの利用要件ではない。

privateまたはinternal repositoryでCodeQL外のlanguageやinfrastructure configurationを扱い、PR reviewの追加signalを求めるteamは検討対象になる。ただしforkからのcontributionが多いopen-source project、Dependabot PRのdependency updateを主に見たいteam、default branchのbacklogを一括で棚卸ししたいteamは、AI Scanが対象外とする経路を別のcontrolで補う必要がある。これはRecommendationである。

organizationではenterprise ownerがpolicyで許可し、organization ownerまたはsecurity managerが有効化する。organization settingが有効ならeligible repositoryに直ちに適用され、repository administratorはopt outできる。public personal repositoryではadminがrepositoryごとにon／offできる。導入が複数repositoryへ広がるため、先にscopeとownerを合意してから設定を変える方がよい。最後の文は編集部のRecommendationである。

## 今できること：対象経路、予算、reviewを小さく設計して確認する

まずread-onlyで、対象organizationとrepositoryのvisibility、code scanningの有効状態、CodeQLがcoverしていない変更、fork・Dependabot PRの比率、現在のrequired check、security alertのtriage ownerを棚卸しする。これでAI Scanが補完する経路と、補完しない経路を分けられる。source codeやcustomer dataを新たに送る必要はない。

次にbilling accountのincluded AI Credits、Code Security AI Creditsのbudget、hard budget到達時の扱いを確認する。公式documentationでは、qualifying PRがscanされた時点でusageが始まり、hard budgetでcreditが残っていなければfindingを出せず、budget増額または次のbilling cycleでscanが再開すると説明する。これは費用だけでなく、期待したreview signalが止まる運用条件でもある。

導入後の評価では、finding数をsecurity improvementと同一視しない。false positiveとしてdismissした割合、reviewに必要な時間、修正の採用・却下理由、既存CodeQLやsecret scanningとの重複、fork／Dependabotなど対象外PRのcoverageを分けて記録する。GitHubのsecurity overviewにはAI Scanのfinding数、autofix suggestionの有無、fix／dismissのoutcomeを示すtabがあるが、これらは自組織のrisk低下を単独で証明する指標ではない。後半は編集部のRecommendationである。

- Recommendation：organization全体を有効化する前に、対象repositoryとreviewerを限定し、triageの期限とdismiss基準を決める
- Recommendation：fork・Dependabot・full repository scanの対象外範囲を、既存のCodeQL、dependency review、別scanner、human reviewでどう扱うか明文化する
- Recommendation：autofixの提案はpatchとしてreviewし、test、threat model、branch protectionを省略しない

## まだ分からないこと：検出精度、利用量、data handling、個別repositoryでの効果

GitHubはAI Scan findingがfalse positiveを含み得ると明記するが、公開documentationからはlanguage、category、repository規模、PR量ごとのprecision、recall、false negative、latency、AI Credit消費量を確認できない。本稿ではGitHubに実codeを渡す検証も、他toolとの比較もしていない。したがって『AI ScanならCodeQLより多く見つける』『false positiveが少ない』『費用を回収できる』とは結論できない。

AI Scanがcode searchでrepositoryの追加contextを集め得ること、build systemを必要としないことは公式資料にある。しかし、個別organizationのsource code、pull request metadata、retention、regional processing、access control、contract上のdata handlingがどう適用されるかは、この記事の資料だけで確定できない。private codeを対象にする前に、対象accountの最新termsとsecurity documentationを確認する必要がある。

また、findingがadvisoryである以上、mergeを止めるべきriskをどのruleset、review、test、approvalへ送るかはteam設計に依存する。AI Scanをonにした事実だけをsecurity postureの改善やcomplianceの達成として扱うことはできない。これは編集部のInferenceである。

## 次に確認する条件：coverage、billing、policy、data条件が更新されたとき

次の確認条件は、GitHubがsupported language／frameworkまたはdetection categoryを更新したとき、full repository scanやruleset requirementへの対応を追加したとき、fork・Dependabot PRの扱いが変わったとき、AI Creditの課金・budget・availabilityが変わったとき、enterprise policyまたはdata handlingの説明が更新されたときである。導入日にも、changelogだけでなく最新のdocumentationと対象accountの設定を再確認したい。

現時点の結論は、AI ScanをCodeQL外のPR変更にreview signalを増やす機能として試す価値はあるが、merge gateや独立したsecurity assuranceとしては扱えない、ということだ。対象経路と対象外経路、費用上限、human triage、既存controlを一緒に設計できるteamに向く。この判断は公式の機能境界を基にした編集部のRecommendationである。

## 制約と未検証範囲

- 本稿は2026年10月16日にGitHub ChangelogとGitHub Docsを照合した資料調査である。AI Scanの有効化、課金設定、pull requestの作成、source codeの送信、Copilot Autofix、REST API、GitHub Actions、organizationまたはenterprise設定を使う検証は行っていない。
- GitHubが一般提供と説明する範囲、supported language・detection category、課金・budget・権限の条件は公式資料に限る。precision、recall、false-positive率、検出までの時間、AI Creditの実消費量、既存CodeQLとの重複、各repositoryでの有効性は編集部では測定していない。
- AI Scanのfindingが表示されることは、脆弱性が確定したこと、提案fixが安全であること、merge後のsystemが安全であることを意味しない。threat modeling、依存関係管理、secret管理、review、test、branch protectionとincident responseは別に必要である。
- availability、billing、policy、supported language、detection category、UI、APIは変わり得る。導入前に対象accountの最新documentation、billing画面、enterprise／organization policy、repositoryごとのdata handlingを再確認する必要がある。

## 確認したもの

- [GitHub Changelog — AI Scan for pull requests generally available (2026-10-15)](https://github.blog/changelog/2026-10-15-ai-scan-for-pull-requests-generally-available/)
- [GitHub Docs — AI Scan for pull requests (checked 2026-10-16)](https://docs.github.com/en/enterprise-cloud@latest/code-security/concepts/code-scanning/ai-powered-security-detections)
- [GitHub Docs — Code scanning on pull requests (checked 2026-10-16)](https://docs.github.com/en/code-security/concepts/code-scanning/code-scanning-on-pull-requests)
