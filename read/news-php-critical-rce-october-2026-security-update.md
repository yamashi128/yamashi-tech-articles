# PHPの緊急更新：2件のcritical RCEに、runtimeとcontainerをどう直すか

YAMASHI TECH AI Editorial Desk | News | Security / Software Engineering / DevTools

[掲載ページ](https://yamashi-tech.com/articles/news-php-critical-rce-october-2026-security-update) · [原稿データ](../articles/news-php-critical-rce-october-2026-security-update.json)

公開: 2026-10-22 / 更新: 2026-10-22 / 確認: 2026-10-22

PHPは2026年10月21日、未認証RCEにつながり得る2件のcritical脆弱性を修正した。対象はweb requestを処理するPHPで、8.5.12／8.4.27／8.3.36／8.2.35への更新が完全な対処とされる。package更新だけで終えず、実行中のruntime・base image・redeployまで棚卸ししたい。

## 要点：まず実行中のPHPを特定し、修正版を動かす

PHP projectは2026年10月21日、未認証remote code execution（RCE）につながり得るcritical脆弱性2件、CVE-2026-109618とCVE-2026-109619を公表した。公式advisoryは、web requestを処理するPHP installationをrisk対象に挙げ、PHP 8.5.12、8.4.27、8.3.36、8.2.35へ直ちに更新するよう求めている。

実務上の要点は、lockfileやimage definitionだけを更新済みにすることではない。packageを取り込んだ後、実際にrequestを受けるFPM worker、Apache module、CGI、container image、serverless revisionが修正版になったかを確認し、必要なrestartまたはredeployまで終えて初めて対処の候補になる。

- Fact：PHPは2件をcriticalとし、未認証RCEにつながり得ると説明している
- Numeric fact：upstreamの修正版は8.5.12、8.4.27、8.3.36、8.2.35の4系列
- Fact：PHP 8.1以前はupstreamの通常update対象外で、vendorのbackportまたはsupported versionへの移行確認が要る
- Recommendation：version確認、artifact更新、restart／redeploy、稼働revision確認を一つのchangeとして記録する

## 何が起きたか：10月21日に2件のcritical脆弱性と修正版を公開

PHPの2026年news archiveは、CVE-2026-109618をout-of-memory handling中の不整合、CVE-2026-109619を解放後のrequest-owned stateが後続requestで使われ得る問題として説明する。いずれも内部request stateに関する脆弱性であり、PHP projectは認証前にRCEへ至り得るとしている。ここで重要なのは、アプリケーションのloginやframework middlewareの有無だけで優先度を下げないことである。

公式advisoryが列挙する対象はPHP-FPM、Apacheのmod_php、php-cgi、FrankenPHP、LiteSpeedを含むweb requestを提供するinstallationである。mod_phpはapplication codeより前に未認証requestがattackを起こせる実証例があるとして、PHPは特にriskが高いと記している。これは各環境での侵害済み判定や成功率を示す数値ではなく、更新判断のためのupstreamのrisk説明である。

## 以前との違い：通常の月例更新ではなく、実行経路を含む緊急patch判断

PHP 8.5.11、8.4.26、8.3.35、8.2.34を含む、それ以前の各対応系列を使う場合、今回の修正版またはvendorが修正済みと確認したbackportへ更新する必要がある。PHP projectは2026年10月20日に事前noticeを出し、翌21日に修正版と詳細を公開した。翌月の定例upgradeまで待つ、またはapplication dependencyを次のfeature releaseと一緒に処理する、という通常の更新計画とは分けて扱うべき種類の発表である。

2026年10月22日訂正：初版の『8.5.11、8.4.26、8.3.35、8.2.34より前』という表現では、列挙したversion自身が対象外に読めたため、『を含む、それ以前』へ改めた。distributionなどのbackportはupstreamのversion文字列だけで判定せず、vendor advisoryで修正の有無を確認する。

一方で『package managerが最新版を解決した』ことは、server processが入れ替わった証拠ではない。immutable containerなら新しいdigestでimageをbuildしてdeploymentを切り替える必要があり、VMやbare metalならFPM poolやweb serverをrestartする場面がある。複数PHP binary、sidecar、queue worker、古いrollback revisionを抱えるsystemでは、source repositoryの変更だけでcoverageを判断できない。

PHP公式資料から整理する更新対象と確認単位

| 対象 | upstreamの修正版 | 確認すべき単位 | ここからは断定できないこと |
| --- | --- | --- | --- |
| PHP 8.5 | 8.5.12 | 実行中binary、FPM／web server、container digest | 個別siteが攻撃済みか |
| PHP 8.4 | 8.4.27 | 同上。distribution packageのrelease noteも照合 | vendor packageがいつ反映するか |
| PHP 8.3 | 8.3.36 | 同上。build cacheとworker restartを確認 | WAFだけで防げるか |
| PHP 8.2 | 8.2.35 | 更新後のruntime versionとredeploy結果 | 次回以降もsupportされる期間 |
| PHP 8.1以前 | upstream通常releaseなし | distribution／LTS vendorのbackport、移行計画 | 公式backportが全環境にあるか |

## 誰に影響するか：PHPをweb requestで受けるteamと、その供給経路

影響確認の出発点は、repositoryにPHP fileがあるかではなく、internet-facing requestをどのPHP runtimeが処理しているかである。VM上のFPM、Apache module、Kubernetes pod、PaaSのbuildpack、独自Dockerfile、CMS appliance、managed hostは、更新の配布者と確認方法が異なる。productionだけでなく、staging、preview、regional failover、scheduled workerが同じimageを使う場合もinventoryに含めたい。

Google Cloudの公式案内でも、Cloud RunまたはApp Engine Flexibleで自前containerを使う場合はpatched PHPでimageをrebuildしてredeployするよう説明される。一方、automatic base image updateを有効にした一部のserverless runtimeではproviderによる更新があり得る。これはGoogle Cloud固有の案内であり、他cloud、Kubernetes、shared hostingが自動で安全になる意味ではない。

## 今できること：version、artifact、稼働revisionを順に照合する

最初にasset inventoryからweb requestを受けるPHP entry pointを列挙し、runtime seriesとdistribution／base imageを記録する。次にvendor advisoryとpackage availabilityを確認し、修正版へ更新する。自前buildならbase imageまたはpackage versionを固定してbuildし直し、image digest・SBOM・build logをchange recordへ残す。managed hostingではcontrol panelやvendorのadvisoryで、実際に適用済みのruntimeを確認する。

deployment後は、稼働中processやrevisionが意図したversionか、health checkと通常requestが成立するか、古いreplica・rollback candidate・long-lived workerが残っていないかを確認する。これは安全な運用手順のRecommendationであり、本稿で特定commandを実行した記録ではない。顧客dataを使うrequestや攻撃payloadで更新を試す必要はなく、承認済みのhealth checkとversion observationで範囲を狭められる。

変更記録の最小項目（概念例。編集部では未実行）

```text
asset: public-api / php-fpm / production
old runtime: 8.4.26
target runtime: 8.4.27
artifact: rebuilt image digest or vendor package release
activation: restart or redeploy completed
observation: running revision reports expected version; health check passed
remaining scope: legacy worker, rollback image, vendor backport status

# exploit requestや本番dataは使わず、組織承認済みの確認手順で記録する
```

## 更新できない間の扱い：軽減策を完了条件にしない

PHPは、直ちにupdateできない場合のexposureを下げる設定例も示している。CVE-2026-109618にはmemory limitやrequest sizeの境界、CVE-2026-109619にはsession upload progressの無効化などが挙げられる。しかし同じadvisoryは、これらは特定pathを軽減してもinstallationをsafeにしないと明記する。設定を入れたことをpatch完了としてticketを閉じるのは危険だ。

短い猶予が必要なら、公開範囲を維持したまま更新可能な環境を優先し、temporary mitigation、owner、expiry、更新予定時刻をincident recordへ残すとよい。memory limitを無制限にする設定やupload上限の変更はresource usage、application behavior、multi-tenant isolationにも影響し得る。PHP公式の記載を自組織へ機械的にcopyせず、責任者のreviewとrollback planを通す必要がある。

## まだ分からないこと：侵害状況、vendor反映、個別環境のexposure

公開資料だけから、任意のapplicationが攻撃可能か、既に侵害されているか、どのconfigurationでどの程度の成功率になるかは判断できない。今回確認したPHP資料は修正版と一時的な軽減策を示すが、個別network、plugin、CMS、reverse proxy、container policy、monitoringの状態を評価するものではない。侵害兆候の調査やforensicsは、ログ保全を含む組織のincident response手順で別途行うべきである。

また、Linux distributionやcommercial LTS vendorのbackport、managed hostの適用時刻、Cloud Run以外のplatformの責任分界は変動する。PHP 7.4、8.0、8.1についてPHP security teamがminimal source-backportを提示した事実と、各teamがsupportされたpackageをすぐ使えることは別である。source patchを独自に適用する判断はbuild、test、support、将来のsecurity updateを含むため、緊急性だけで決められない。

## 次に確認する条件：全runtimeが修正版へ切り替わり、vendor情報が更新されたとき

次の確認条件は、全ての公開endpointとbackground runtimeで対象versionまたはvendor-confirmed backportを確認できたとき、さらにPHP project、OS／hosting vendor、利用するmanaged platformが追加advisoryや修正版を出したときである。8.2はPHP projectの案内で2026年12月31日にend of lifeを迎える予定のため、今回の緊急更新と別にsupported seriesへの移行計画も見直したい。

現時点の結論は、これは『PHP applicationを更新すれば終わり』ではなく、『requestを処理するruntimeを更新済みartifactへ実際に切り替えたか』を確認するsecurity changeだということだ。CVEの技術詳細や一時mitigationに注意を奪われず、asset inventory、patched artifact、稼働revision、未対応assetのownerを結びつけて管理することを編集部は勧める。最後の文は公開資料に基づくRecommendationである。

## 制約と未検証範囲

- 本稿はPHPプロジェクトのsecurity advisory、公式downloads、Google Cloudの対応ガイドを2026年10月22日に照合した資料調査である。脆弱性の再現、exploit、攻撃traffic、公開PoCの取得・実行、稼働中server・container・cloud accountへの接続は行っていない。
- CVE-2026-109618／CVE-2026-109619の攻撃可能性、実際の影響、vendor packageの提供時刻、backport、managed platformの自動更新、WAFや設定による軽減度は、PHP application、SAPI、OS distribution、hosting構成ごとに異なる。本稿は個別環境の安全性を保証しない。
- PHPが示す一時的な設定変更は特定attack pathのexposureを下げ得る対策であり、更新の代替ではない。影響確認・maintenance window・rollback・顧客通知は、組織のincident processとvendor support情報に従って判断する必要がある。

## 確認したもの

- [PHP — Security advisory: Critical remote code execution vulnerabilities (2026-10-21)](https://www.php.net/archive/2026.php#2026-10-21-5)
- [PHP — Downloads and release artifacts (checked 2026-10-22)](https://www.php.net/downloads.php)
- [Google Cloud — Responding to core PHP vulnerabilities (2026-10-21)](https://cloud.google.com/blog/products/identity-security/responding-to-core-php-vulnerabilities-cve-2026-109618-cve-2026-109619)
