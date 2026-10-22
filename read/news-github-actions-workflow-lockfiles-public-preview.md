# GitHub Actionsにworkflow lockfile：tagのまま、実行するcommitを固定するPublic Preview

YAMASHI TECH AI Editorial Desk | News | DevTools / Software Engineering / Security

[掲載ページ](https://yamashi-tech.com/articles/news-github-actions-workflow-lockfiles-public-preview) · [原稿データ](../articles/news-github-actions-workflow-lockfiles-public-preview.json)

公開: 2026-10-15 / 更新: 2026-10-15 / 確認: 2026-10-15

GitHubは、GitHub Actionsのaction参照をworkflow fileではtagやbranchのまま保ちつつ、実行するcommitを`.github/workflows/actions.lock`へ固定するworkflow dependency lockfileをPublic Previewで公開した。導入価値はpinningの自動化ではなく、更新・review・policyを一つの運用にすることにある。

## 要点：`@v4`を読みやすく残しながら、実行するaction commitを固定できる

GitHubは2026年10月14日、GitHub Actionsのworkflow dependency lockfileをPublic Previewで公開した。workflow内の`uses: owner/action@v4`や`@main`のようなtag・branch参照は、実行時にその時点の参照先commitへ解決される。tagやbranchが動くと、repository側のworkflow fileを変えなくても、後のrunがreview時とは別のcodeを実行し得る。

新しい仕組みでは、`.github/workflows/actions.lock`へactionとreusable workflowの解決済みcommitを記録する。onboardしたworkflowは、lockfileにあるcommitを実行するため、tagを動かしてもrun対象は変わらない。これはGitHubの公式仕様に基づくFactであり、編集部はlockfileを生成・実行していない。

実務上の焦点は、workflow YAMLをSHAだらけにすることだけではない。lockfileの差分をdependency updateとしてreviewし、更新が滞留しない仕組みと、必要ならenforcementを揃えることにある。以下の運用上の勧めは公式Docsを導入判断へ翻訳した編集部のInferenceとRecommendationである。

- Fact：lockfileはaction、transitive dependency、reusable workflow参照を解決済みcommitへ対応付ける
- Fact：onboard済みworkflowは、lockfileにないdependencyを含むと実行できず、記録済みcommitを使う
- Fact：GitHubは`gh actions-lock` extensionで生成・更新し、lockfileを手で編集しないよう案内している
- Recommendation：まず一つのlow-risk workflowで差分、update経路、失敗時の扱いを確認してから広げる

## 何が起きたか：10月14日公開、workflow dependency lockfileとRequire lockfile policy

発表主体はGitHubで、changelogの公開日は2026年10月14日である。GitHubは、workflow dependency lockfileとRequire lockfile policyをPublic Previewとして案内した。changelogではGitHub Enterprise Cloud、data residency付きGitHub Enterprise Cloud、Team、Freeでpreviewを利用できると説明する。利用資格や設定画面は変わり得るため、導入時は対象organizationの最新Docsと管理画面を再確認したい。

lockfileはrepository内の`.github/workflows/actions.lock`に置かれるmachine-generated fileである。Docsによれば、`workflows` sectionはonboardしたworkflowとそのdependencyを、`dependencies` sectionは参照文字列、解決したcommit、source repositoryの`owner_id`と`repo_id`を記録する。後二者は、同じ名前の別repositoryへすり替わっていないことをGitHub Actionsがruntimeに確認するためのidentity情報である。

Require lockfile policyはenterprise、organization、repositoryの管理者が設定できるPreviewのpolicyである。Docsは、lockfileへonboardされていないaction dependencyを含むtarget workflowのrunをblockすると説明する。ただし、最初から全repositoryへ強制する設定ではない。GitHubはonboard済みrepositoryを絞り、Enterpriseで使えるEvaluate modeからpilotするよう案内している。

## 以前との違い：YAMLへfull SHAを直接書く方式に、依存グラフとidentityの記録を足す

GitHubは従来、third-party actionをfull-length commit SHAへpinする方法を推奨してきた。lockfileを採用するrepositoryでは、workflow YAML内をfull SHAへ書き換えず、より読みやすいtagまたはより具体的なversion参照を残せる。GitHub Docsは、lockfileがtransitive dependencyを扱い、workflow fileを読みやすくし、source repositoryのidentityを記録できる点を差として挙げる。

ただし、lockfileは『trusted actionの選定』を自動化しない。lockしたcommitが悪意あるcode、脆弱なcode、不要に強いpermissionを持つ可能性は残る。lockする前にversion、release provenance、maintainer、actionが要求する`permissions`、secret exposure、runnerへの影響をreviewするという順番は変わらない。これはGitHubの「lockしてもdependency自体の安全性は決めない」という説明に基づくRecommendationである。

また、lockfileは自動的に全workflowを対象にしない。workflowごとに段階的にonboardできる一方、新規workflowや新しい`uses` dependencyを追加してlockfileを更新し忘れると、verificationまたはpolicyで止まる。導入の成否はpinを作れたかではなく、変更者へ早くフィードバックできる更新経路を持てるかに左右される。後半は編集部のInferenceである。

full SHA pinningとworkflow dependency lockfileで変わる運用境界

| 論点 | workflow YAMLへfull SHAを直接書く | workflow dependency lockfile |
| --- | --- | --- |
| 実行対象の固定 | `uses`に書いたSHAを直接実行する | tag・branch参照をlockfileのcommitへ解決して実行する |
| 可読性 | SHAがworkflow fileへ現れ、更新差分が散りやすい | 参照と解決済みcommitをlockfileへ分け、workflow fileを比較的読みやすく保つ |
| dependency範囲 | 各参照を個別に管理する | actionのtransitive dependencyも記録対象にする。ただしreusable workflow側のdependencyは定義repositoryで管理する |
| 安全性の限界 | SHA固定だけでactionの安全性は証明しない | 同じくcommit固定であり、code review、permission、secret、runnerのcontrolを置き換えない |

## 誰に影響するか：tagやbranch参照のactionを使い、更新をreview可能に保ちたいteam

もっとも直接的なのは、GitHub-hostedまたはself-hosted runnerでthird-party actionを使い、`@v4`や`@main`のようなmutable referenceを残しているrepositoryである。upstreamのtagが意図せず移動した場合でも、onboard済みworkflowはlockfileのrecorded commitを実行する。build、release、deployment、package publishのようにcredentialやwrite権限を持つworkflowほど、この差をrisk modelへ入れる意味が大きい。

organizationでは、security teamが一律にYAMLを編集し続けるより、application teamが変更したdependencyとlockfileを同じpull requestでreviewし、platform側が必要に応じてpolicyで最低条件を定める形に向く。GitHubはDependabotによるaction更新時、onboard済みworkflowなら対応するlockfile entryも同じpull requestで再生成すると説明する。ただし、Dependabotは未onboard workflowを自動でonboardしない。

反対に、GitHub Actionsを使わないrepository、外部actionを呼ばないworkflow、またはPreview featureをCIの停止条件にできないteamは、ただちに導入する必要はない。shared reusable workflowを多用する組織では、workflowを呼ぶ側だけでなく、definition repositoryのlockfileも管理対象になる。自組織のworkflow graphと所有者が曖昧なままrequire policyを有効にするのは避けるべきだ。後半は編集部のRecommendationである。

## 今できること：1 workflowをpilotし、更新・review・verifyをセットで設計する

公式手順は、GitHub CLIへ`gh actions-lock` extensionをinstallし、repository rootでlockfileを生成する流れである。生成時はworkflow配下の`uses` dependencyをscanし、lockfileを作るだけでなく、参照をより具体的なversionへ書き換える場合がある。GitHubは生成結果をcommitする前にworkflow fileを含むfull diffをreviewするよう求めている。本稿ではこのcommandを実行していない。

pilotでは、read-only testなど影響の小さい一つのworkflowを選び、現在使っているaction reference、生成されたcommit、`owner_id`と`repo_id`、workflow内の`permissions`、Dependabot更新時のdiffを確認する。次にpull requestでstale lockfileを検出するverifyを置き、workflowまたはlocal actionの変更とlockfile updateを同じchange setに含める。これはGitHub Docsの運用例から整理したRecommendationである。

GitHub Docsは、pre-commit hookで`gh actions-lock --verify-local --no-fix`を使う例も示す。この確認はofflineでlockfile entryの存在を確かめるが、GitHub上のpinを再検証するものではない。local check、PR verify、Dependabot、code owner review、policy enforcementにはそれぞれ届く範囲があるため、どれか一つを完全なcontrolとして扱わないことが大切である。

- Recommendation：lockfileの変更をdependency updateとして扱い、commit、repository identity、許可済みaction policyをreview checklistへ入れる
- Recommendation：`.github/workflows/actions.lock`をCODEOWNERSへ加え、build securityの担当者が差分を読めるreview pathを作る
- Recommendation：Require lockfile policyは、更新の自動化とstale検出が動くpilot後に対象を広げる

## まだ分からないこと：Previewの互換性、policyの実運用、組織ごとのworkflow graph

今回の公開資料はlockfileのformat、onboarding、更新とpolicyの基本動作を説明する一方、全plan・全region・GitHub Enterprise Server・self-hosted runner・全action typeでの互換性をこの記事の調査だけで確定できるものではない。changelogとDocsのplan表記にも範囲差があるため、導入前にorganizationで実際に表示されるfeature availabilityを確認する必要がある。

local path action、reusable workflow、organizationのallowed actions policy、branch protection、rulesetとの組み合わせもmigration costを左右する。Docsはlocal path actionが期待するaction fileへ解決できない場合にextensionがworkflowをskipし得ること、reusable workflowのdependencyは定義repositoryのlockfileで扱うことを説明する。大きなorganizationでは、単一repositoryの成功をそのまま全体へ一般化できない。

lockfileで固定されたcommitが将来も到達可能か、tagの移動を正当な更新として受け入れる手順、Dependabot以外の更新者がlockfileをどう保つかも運用上の確認点である。GitHubは移動したtagの再解決に`--relock`を、元commitが到達不能になった場合の受け入れに別のoptionを示すが、どの変更を承認するかは各teamのreview policyに残る。最後の段落は編集部のInferenceである。

## 次に確認する条件：GA、対応範囲、policyの成熟、更新が止まったときの運用

次に確認するのは、workflow dependency lockfilesとRequire lockfile policyのgeneral availability、plan・GitHub Enterprise Server・data residencyの対応、lockfile formatとCLIのbreaking change、Dependabot連携、reusable workflowとlocal actionの対応範囲、policy insightsの評価結果である。Previewの更新は、workflowの実行可否へ直接影響し得るため、release noteとDocsを定期的に照合したい。

現時点の結論は、lockfileを『GitHub Actionsを安全にする一枚のfile』として扱わないことだ。mutable referenceと実行codeのずれを狭め、dependency inventoryとreviewを作りやすくする具体的なcontrolではある。だからこそ、まず一つのworkflowで更新とrollbackの流れを確認し、actionの選定、least-privilege permission、secret isolation、runnerの隔離、code owner reviewを残したまま段階的に採用するのがよい。後半は公開資料に基づく編集部のInferenceとRecommendationである。

## 制約と未検証範囲

- 本稿はGitHubが2026年10月14日に公開したchangelogとGitHub Docsを照合したものである。`gh actions-lock` extensionのinstall、lockfile生成、Dependabot更新、policy設定、GitHub Actions run、GitHub Enterprise Cloud環境での実行は行っていない。
- workflow dependency lockfilesとRequire lockfile policyはPublic Previewであり、利用可能なplan、UI、file format、CLI behavior、policyの対象範囲は変わり得る。個別organizationの利用資格、ruleset、allowed actions、self-hosted runner、reusable workflow構成は公開資料だけでは確認していない。
- lockfileは参照を特定commitへ結び付けるintegrity controlであって、actionの安全性、maintainerの信頼性、commit内の脆弱性、workflowの最小権限、secret管理、runner隔離を保証しない。導入後もdependency reviewとCI/CD全体のsecurity reviewが必要である。
- Docsはreusable workflowの依存関係をそのworkflowを定義するrepositoryのlockfileで扱うと説明する。cross-repository reusable workflowを含む組織で、どのrepositoryをどの順番でonboardするべきかは、実際のworkflow graphと所有権を確認して決める必要がある。

## 確認したもの

- [GitHub Changelog — GitHub Actions workflow lockfiles in public preview (2026-10-14)](https://github.blog/changelog/2026-10-14-github-actions-workflow-lockfiles-in-public-preview/)
- [GitHub Docs — Workflow dependency lockfiles (Public Preview, checked 2026-10-15)](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)
- [GitHub Docs — Locking action dependencies in a repository's workflows (checked 2026-10-15)](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies)
- [GitHub Docs — Enforcing lockfiles for action dependencies (checked 2026-10-15)](https://docs.github.com/en/actions/how-tos/administer/enforce-workflow-lockfiles)
