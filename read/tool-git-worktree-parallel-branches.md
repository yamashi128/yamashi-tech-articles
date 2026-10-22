# git worktree入門：作業中の変更をstashせず、別branchを安全に並べる

YAMASHI TECH AI Editorial Desk | Deep Dive | DevTools / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/tool-git-worktree-parallel-branches) · [原稿データ](../articles/tool-git-worktree-parallel-branches.json)

公開: 2026-10-20 / 更新: 2026-10-20 / 確認: 2026-10-20

git worktreeは一つのrepositoryへ複数のworking treeを関連付け、branchごとに別directoryで作業できる。使い捨てrepositoryで追加・一覧・独立commit・removeを確認し、並列作業で共有されるrefと分離されるfileを整理した。

## 結論：stashの代替ではなく、branchごとに仕事場を分ける道具

`git worktree`は、一つのGit repositoryへ複数のworking treeを関連付け、異なるbranchを別directoryへ同時にcheckoutする機能だ。長いrefactorの途中で緊急fixへ切り替えるとき、未commit変更をstashして同じdirectoryを入れ替えず、現在の作業をそのまま残して別のcleanなtreeを作れる。

AI agentや複数人のlocal pairingでも便利だが、worktreeを作れば自動的に安全に並列化できるわけではない。同じbranchは通常複数worktreeへcheckoutできず、refs、remote、object databaseは共有される。担当file、base commit、merge順、外部resourceを先に分ける必要がある。

- 向く：緊急fix、review用checkout、独立した複数branch、agentごとの作業directory
- 向かない：同じfile・同じbranchを同時編集、submodule多用、shared databaseやportを分離できない作業
- Verified observation：Git 2.49.0で二つのworktreeが別HEADとbranchを持つことを確認
- Recommendation：削除はfilesystem操作ではなく`git worktree remove`を使う

## 仕組み：working treeは増えるが、repositoryは複製しない

通常のcloneには一つのmain working treeがある。`git worktree add`はlinked worktreeを追加し、main repositoryのadministrative areaへmetadataを保存する。各worktreeは自分のHEADとindexを持ち、checked-out fileも別になる。一方、commit object、branch ref、remote設定など多くのrepository dataは共有される。

cloneを丸ごと増やす方法と比べ、同じobjectを再downloadせず、local branchやcommitをすぐ共有できる。反面、一方のworktreeでbranch refを進めると、別のworktreeからもそのrefの新しい位置が見える。directoryが別だからrepository stateも完全に独立している、とは考えない。

clone、branch切替、worktreeの違い

| 方法 | fileの分離 | Git object／ref | 向く場面 |
| --- | --- | --- | --- |
| 同じtreeでbranch切替 | 一つだけ | 共有 | 順番に作業できる |
| 別clone | 分離 | 原則別repository | 強めに独立させたい |
| linked worktree | 分離 | 同じrepositoryで共有 | 同じhistory上の並列branch |

## 検証環境：使い捨てrepositoryでaddからremoveまで確認した

2026年10月20日、macOS x86_64、Git 2.49.0で`/private/tmp`配下に空の検証directoryを作った。main branchへbaseのempty commitを作成し、`git worktree add -b feature`でlinked worktreeを追加した。feature側で別のempty commitを作り、`git worktree list --porcelain`を実行した。

出力ではmain worktreeのHEADが`f4077b9...`、feature worktreeのHEADが`14f3265...`となり、それぞれ`refs/heads/main`と`refs/heads/feature`へ関連付けられた。続けて`git worktree remove`を実行すると、一覧にはmainだけが残った。これは操作modelの確認であり、実projectの並列build性能を測ったものではない。

| 項目 | 検証値 | 観測 |
| --- | --- | --- |
| OS／architecture | Darwin x86_64 | 一時directoryのみ使用 |
| Git | 2.49.0 | add／list／remove成功 |
| main HEAD | f4077b9... | refs/heads/main |
| feature HEAD | 14f3265... | refs/heads/feature |
| 終了状態 | exit code 0 | remove後はmainのみ |

## 最小チュートリアル：新しいbranchを隣のdirectoryへ作る

main worktreeで変更中なら、まず`git status --short`を読み、現在の変更を消さないことを確認する。次にrepositoryの外側へ明示的なpathを決め、`git worktree add -b <branch> <path> <start-point>`を実行する。`start-point`を省くと現在のHEADが使われるため、automationでは明示する方が追跡しやすい。

追加後は新directoryへ移動し、通常どおりedit、test、commitを行う。worktreeのlistはmachine向けなら`--porcelain`を使う。人向けの一行表示をparserで読むより、field単位の安定した出力を使う方がよい。

新branchをlinked worktreeへ作る

```shell
git status --short
git fetch origin
git worktree add -b fix/login-timeout ../repo-fix-login origin/main
git worktree list --porcelain
cd ../repo-fix-login
npm test
git status --short
```

## 同じbranchを二重checkoutできない理由

Gitは通常、既にあるworktreeでcheckout中のbranchを別worktreeへcheckoutさせない。二つのindexとfile treeが同じbranch refへ別々のcommitを進めると、どちらのworking copyが最新なのか分かりにくくなるためだ。強制optionはあるが、通常運用の解決策として使うべきではない。

並列taskにはbranchも一つずつ割り当てる。agent Aが`feature/api`、agent Bが`feature/ui`を持ち、共通interfaceを先にcommitしてから分ける。同じfileへ触れるなら、worktreeを増やすよりtaskを直列化するか、ownerを一人に決める方がmerge conflictと意味上の衝突を減らせる。

## 共有されるもの：branch、remote、object、hookの影響を見る

linked worktreeは同じrepositoryに属するため、一方で作ったcommitは他方から参照できる。branch ref、tag、remote-tracking refも多くが共有される。`git fetch`やbranch deletionなどrepository-wideな操作は、別worktreeの作業へ影響し得る。削除対象branchが他のworktreeでcheckout中ならGitが拒否する場合もある。

configurationにはrepository共通とworktree固有の層がある。hookやcredential、large-file cache、commit signingも完全に隔離されるとは限らない。信頼できないcodeを別worktreeで開いてもsandboxにはならないため、実行権限、network、secret、filesystem scopeは別のcontainerやOS isolationで制御する。

## 依存とruntimeを分ける：node_modules、port、databaseはGit管理外

source fileが別でも、同じpackage cache、Docker daemon、local database、port、environment variable、cloud accountを使えば衝突する。各worktreeへ`node_modules`を作るのか、package manager cacheだけ共有するのかを決める。build outputがrepository外の共通pathへ出るtoolにも注意が必要だ。

local serverはportをtaskごとに割り当て、database schemaやqueue topicはprefixを分ける。本番credentialを並列taskへ配らない。worktree directory名をenvironment identityへ流用する場合も、path変更や文字種で壊れないstable IDを別に持つ。

- source branchと同じくport、database、artifact pathにもownerを付ける
- dependency cache共有とinstalled tree共有を分ける
- production secretをlocal worktree分離の根拠にしない
- 並列testが同じexternal serviceを書き換えないようにする

## 終了手順：status、commit、merge確認の後にremoveする

作業終了時はlinked worktree内で`git status --short`を確認し、必要なcommitやpatchが残っていないことを確認する。次にmain側から`git worktree remove <path>`を使う。untracked fileや変更があるとGitは通常拒否するため、`--force`で押し切る前に内容を確認する。directoryを先に手動削除するとmetadataがprunableとして残る。

removeはbranchを削除しない。merge済みを確認してから`git branch -d`を使う。未merge branchを`-D`で消すのは別の破壊操作であり、自動cleanupへ入れない。移動diskや一時mount上のworktreeは`lock --reason`、pathが変わった場合は`repair`を検討する。

安全な終了確認

```shell
git -C ../repo-fix-login status --short
git log --oneline main..fix/login-timeout
git worktree remove ../repo-fix-login
git worktree list --porcelain
git branch -d fix/login-timeout
```

## 採用しない方がよい条件と実務導入

submoduleを多用するsuperproject、同じbranchへ複数toolが直接commitするworkflow、filesystem pathを固定値として持つlegacy build、外部stateを分離できないintegration testでは、worktreeが複雑さを増やすことがある。Git公式documentationもmultiple checkoutでsubmodule supportが不完全と注意する。

導入するなら、まず緊急fixかread-only review checkoutの一つから始める。branch命名、worktree置き場、port割当、dependency install、cleanupをteam手順へ書き、`git worktree list --porcelain`で残存treeを定期確認する。便利さはdirectory数ではなく、現在の変更を壊さず別の作業を完了できることで測りたい。

## 制約と未検証範囲

- 2026年10月20日にmacOS x86_64、Git 2.49.0の使い捨てrepositoryで`git worktree add -b`、`list --porcelain`、各worktreeのempty commit、`worktree remove`を実行した。remote、push、merge、submodule、LFS、sparse checkout、IDE integration、network filesystemは検証していない。
- 検証は空commitだけを使い、実projectのdependency install、build artifact、database、port、environment variableが並列作業で衝突するかは確認していない。
- Git公式documentationはmultiple checkoutとsubmoduleの組合せを不完全として注意している。submoduleを使うsuperprojectへ本稿の手順をそのまま適用しない。
- worktreeはfilesystemとHEADを分けるが、repositoryの多くのrefsとobject databaseを共有する。権限分離、secret隔離、危険commandのsandboxを提供する機能ではない。

## 確認したもの

- [Git — git-worktree Documentation](https://git-scm.com/docs/git-worktree)
- [Git — git-branch Documentation](https://git-scm.com/docs/git-branch)
