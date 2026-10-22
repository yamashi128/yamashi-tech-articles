# AWSがTOLAPを公開：AI agentの権限をtoolの返り値まで絞るための条件

YAMASHI TECH AI Editorial Desk | News | AI / ML / AI Agents / Security / DevTools / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/news-aws-tolap-agent-tool-object-access-control) · [原稿データ](../articles/news-aws-tolap-agent-tool-object-access-control.json)

公開: 2026-09-22 / 更新: 2026-09-23 / 確認: 2026-09-23

AWSがopen source化したTOLAPは、agentがtoolを呼べるかではなく、toolが返す行・列・fieldを絞る設計を提供する。ただしMCP serverでも万能な防御でもなく、すべてのdata pathをwrapperへ通す実装が前提になる。

## 要点：toolを呼べるか、toolが何をagentへ返せるかを分ける

AWSは2026年9月22日、Tool-Object Level Access Protocol（TOLAP）をopen sourceとして公開した。狙いは、AI agentがMCP、plugin、function callなどを通じてdata sourceへ到達するとき、tool invocationを許可するかだけでなく、返却するobjectをfield、row、column、endpoint、storage prefix、result limitまで制御することにある。公式発表は、policyをdata sourceに近いtoolの処理で適用し、許可されないdataをagentのcontextへ入れない設計として説明する。

ここで重要なのは、TOLAPを『prompt injectionを解決するMCP server』と読まないことだ。TOLAPはMCP protocolを話すserverではなく、既存toolがdataを返す前後に組み込むlibraryとspecificationである。repositoryのarchitecture guideも、secure wrapperを通らない経路があればその経路は境界外であり、non-bypassableかどうかはSDK単体でなく統合の構造に依存すると明記する。

- Fact：AWSは9月22日、object-level policyをtoolの実行境界で適用するTOLAPをopen sourceとして発表した
- Fact：公開repositoryはTOLAPをMCP serverではなく、tool layerが呼ぶfunction周辺のenforcement libraryと説明する
- Inference：agent導入で『このtoolを使える』というscopeだけでは、利用者ごとの返却dataを安全に分けられないcaseがある
- Recommendation：導入判断ではSDKやpromptより先に、data sourceへの全経路をwrapperへ閉じられるかを確認する

## 何が起きたか：AWSがpolicy schema、SDK、reference serverを公開

発表主体はAWS Open Source Blog、公開日は2026年9月22日である。発表によればrepositoryには、policy definition、user／group／roleへのassignment、実際にenforceするeffective policyという三層のversioned schema、canonical signingとfail-closed ruleを定めるspecification、.NET・Python・TypeScriptのSDK、reference policy serverとauthoring consoleが含まれる。AWSはdatabase、API、knowledge base、object storageの四categoryを一つのpolicy modelで扱う方針を示した。

公開repositoryはApache-2.0 licenseで、core／store／MCP用の各packageを三言語に分けている。coreはpolicy model、merge、HMAC signing、enforcement engineを担い、storeはpolicy storage interface、MCP packageはtool layerが呼ぶfunction向けwrapperを担うという説明である。これはmanaged AWS serviceの一般提供開始ではなく、source codeとspecificationを公開したdeveloper toolingの発表として捉えるべきである。

## 以前との違い：identityやgatewayの許可に加え、返却objectを実行時に絞る

AWSの問題設定は、IAM、OAuth、RBAC、ABACが不要だというものではない。これらは主に『誰がresourceやtoolへ到達できるか』を判定する。一方でagentがqueryを組み立て、そのtoolが患者table、社内API、knowledge base、object storageからdataを返す場合、同じtool invocationでも利用者ごとに返せるrowやfieldを変える必要がある。TOLAPはその後段、toolがagentへ結果を渡す直前をpolicy enforcement pointに置く。

公式例では、patients tableへのqueryを許可しながら、SSNと生年月日はhidden、emailはhash、氏名はpartial masking、rowは担当regionに限定し、result数にも上限を置く。複数policyが同時に適用されると、allow listはintersection、deny listはunion、boolean permissionはAND、numeric limitはより厳しい値、maskもより厳しい方式を採る『most-restrictive-wins』と説明されている。これはNumeric factではなく、公開specificationが定めるpolicy semanticsについてのFactである。

TOLAPが扱う境界と、別途必要な統制

| 問い | TOLAPの公開資料が扱う範囲 | TOLAPだけで確定しないこと |
| --- | --- | --- |
| agentはtoolを呼べるか | tool側でeffective policyを受け、query可否やobject ruleをenforceできる | 本人確認、OAuth／IAMの設計、toolを公開する判断 |
| agentは何を見られるか | field masking、row filter、hidden object、endpoint・prefix・result limitを結果へ適用する | policyがdata modelを正しく網羅していること |
| wrapperを迂回できるか | secure wrapperが唯一のdata pathなら、wrapper内ではpolicyを適用する | 別tool、direct database connection、side channelが存在しないこと |
| contextは安全か | 署名・expiry・optional replay guardを含むsecurity contextを説明する | key management、TLS、replay guardの共有store、agent以外のdata exposure |

## 誰に影響するか：MCPやagent toolが利用者ごとのdataを返すteam

MCP serverやagent toolを、複数tenant、部署、顧客、地域、roleごとのdataへ接続するteamに関係する。たとえばhelpdesk agentが同じsearch toolを使っても、operator AとBで閲覧できる顧客recordが異なるなら、agent promptに『他人のdataを出さない』と書くだけでは返却前のdata exposureを制御できない。TOLAPは、policyをdata-return pathへ置く設計材料を提供する。

反対に、単一利用者のローカルtool、data sourceを持たない計算tool、またはwrapper外のservice accountが広い権限でdatabaseへ接続できる構成では、TOLAPを足すだけでriskが解消するわけではない。architecture guideはpolicy correctness、data-at-rest security、network security、authenticationを保証外として列挙し、HMAC signingはsymmetric keyのためverifierもsignできること、replay guardを使わなければexpiryまでreplay可能なことを明記する。

## 今できること：一つのread-only toolで『唯一の経路』を先に検証する

最初の評価対象は、顧客dataやproduction databaseを直接渡すagentではなく、synthetic dataを使ったread-only toolに絞るのがよい。利用者identityからeffective policyを解決し、署名付きcontextにsource identifierと短いexpiryを入れ、toolが返す直前にfield、row、limitを適用する経路を作る。その後、許可外field、別region、empty／null、large result、期限切れcontext、invalid signature、wrapper外経路を含むnegative testを置く。これはTOLAPの公開資料とarchitecture guideから導くRecommendationであり、本稿で実行した検証ではない。

特に『masked responseが返った』だけでは十分でない。policyを意図的に緩めた場合にtestが失敗すること、secure wrapperを通らないqueryがtechnicalに不可能または明示的にdenyされること、実行したtestがskipではなく実際に走ったことを確認したい。repositoryのtesting antipatternsは、security testがearly returnをpass扱いした例や、credentialなしで重要suiteがskipしても成功に見えた例を示している。

- Recommendation：agent用service accountとpolicy authoring権限を分け、agentが署名keyやpolicy storeを書き換えられないようにする
- Recommendation：schema／field名の変更をpolicy reviewと結び、hiddenFieldsが実dataのcolumn名とずれたときにfail-closedにできるかをtestする
- Recommendation：tool resultのmaskだけでなく、query log、trace、cache、error message、download pathへraw dataが残らないかを別途確認する

## まだ分からないこと：成熟度、配布形態、実運用の性能と相互運用性

AWSの発表は14 integrationsを継続的integrationで同じpolicyにenforceすると説明するが、各integrationをどのversionのframework・connector・data sourceで検証したか、throughputやlatency、large resultでのresource consumption、failure時の運用、stable compatibility policyは発表だけでは十分に確認できない。本稿はbenchmarkや独立したsecurity assessmentを確認しておらず、TOLAPがprompt injectionやdata exfiltrationを一般に防止すると断定しない。

配布にも確認すべき不一致がある。AWS blogはPython、.NET、TypeScriptのinstall commandを掲載する一方、repository READMEはSDKがpackage registryにpublishされておらずsourceからlocal artifactをbuildすると書く。公開repositoryにはGitHub releaseも確認できなかった。評価を始めるteamは、利用時点のREADME、package registry、tag／commit、license、SBOM、依存関係、CIの実行条件を自ら固定してから導入可否を判断したい。

## 次に確認する条件：versioned release、配布手順、第三者検証、connector coverageが出たとき

次回は、versioned releaseまたはpackage publishが出たとき、supported integrationとcompatibility matrixが具体化したとき、policy serverのoperational guidanceとkey managementが整備されたとき、そして独立したreviewや再現可能なsecurity evaluationが公開されたときに再確認する価値がある。導入teamでは、wrapperを通らないdata pathを増やす新しいtoolやconnectorが追加されるたび、policyの網羅性を再評価する条件にしたい。

結論として、TOLAPはagentを『良い振る舞いをするように促す』仕組みではなく、toolが返せるdataを絞るenforcement layerとして読むと役割が明確になる。ただし、その層を有効にするのはpolicy modelそのものだけではない。identity、key管理、network、data source権限、統合の唯一経路、negative testを一緒に設計できるteamにとって、今回の公開は具体的な出発点になる。後半は編集部のInferenceである。

## 制約と未検証範囲

- TOLAPのsecurity propertyは、対象data sourceへのすべての経路がsecure wrapperを通るように実装されている場合に限られる。wrapper外のdirect access、過度に許可的なpolicy、identity verification、network／storage securityをTOLAP自身は防がない。
- AWSの発表はPython／.NET／TypeScript向けSDKと複数framework integrationを説明するが、対応framework・database／API／knowledge base／object storage connectorの実装範囲、成熟度、性能、互換性、運用supportは個別に確認が必要である。
- AWS blogのinstall例はregistry package名を示す一方、公開repositoryのREADMEはSDKがregistryへpublishされておらずsourceからbuildすると説明する。2026年9月23日の確認ではGitHub Releases APIもreleaseを返さなかったため、本稿は安定packageの一般提供や推奨install経路を断定しない。
- 本稿は公開資料の照合であり、repositoryのclone、依存packageのinstall、policy serverの起動、MCP／agent frameworkとの接続、database・API・knowledge base・object storageへの実データ適用、penetration testを行っていない。TOLAPをprompt injectionやdata exfiltrationへの万能な防御として扱えない。

## 確認したもの

- [AWS Open Source Blog — Introducing TOLAP: object-level access control for AI agent tools (2026-09-22)](https://aws.amazon.com/blogs/opensource/introducing-tolap-object-level-access-control-for-ai-agent-tools/)
- [awslabs/tolap — README, SDK layout, local-build guidance, and Apache-2.0 license (checked 2026-09-23)](https://github.com/awslabs/tolap)
- [awslabs/tolap — Architecture guide: enforcement boundary and non-guarantees (checked 2026-09-23)](https://github.com/awslabs/tolap/blob/main/docs/architecture.md)
- [awslabs/tolap — Testing antipatterns: proving security suites actually ran (checked 2026-09-23)](https://github.com/awslabs/tolap/blob/main/docs/testing-antipatterns.md)
