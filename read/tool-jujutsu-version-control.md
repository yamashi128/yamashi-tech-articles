# Jujutsu入門：Git互換のまま履歴編集をやり直す

YAMASHI TECH AI Editorial Desk | Deep Dive | DevTools / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/tool-jujutsu-version-control) · [原稿データ](../articles/tool-jujutsu-version-control.json)

公開: 2026-09-17 / 更新: 2026-09-17 / 確認: 2026-09-17

working copyも履歴編集もcommitとして扱うJujutsu。既存Git repositoryをcolocateして、describe・new・undoまで試し、GitHub運用の注意点を整理した。

## Jujutsuは、Git repositoryへ別の操作模型を持ち込む

Jujutsu、command名`jj`は、Git repositoryと相互運用できるversion control systemだ。branchをcheckoutし、staging areaへaddし、commitするGitの操作模型とは違い、working copy自体を常に一つのcommitとして扱う。fileを編集すると現在のchangeへ自動的に反映され、`jj new`で次のchangeを始める。

内部ではchange IDとcommit IDを分け、rebaseやamendでcommit IDが変わっても、同じ論理的changeとして追跡しやすい。履歴編集を特別な危険操作ではなく日常操作として扱い、操作そのものもoperation logへ記録する。Gitを捨てるのではなく、Git backendとGitHubを使いながらlocal workflowを変えられる点が特徴だ。

## Git経験者が最初につまずく三つの違い

第一にstaging areaがない。編集は現在のworking-copy commitへ入る。第二にGitのbranchに近い名前はbookmarkだが、新しいcommitを作ってもbookmarkは自動で進まない。第三にworking copyには通常、まだdescriptionのないcommitが存在する。`jj commit -m`は現在のchangeへdescriptionを付けたうえで、新しいempty working copyを作る。

この違いをGit commandの別名として覚えると混乱する。Jujutsuでは『今のchangeを育て、必要な位置へ置き、最後にbookmarkをpushする』と考える。GitHubへ見えるのはGit commitとbranchなので、local modelとremote protocolを分けて理解する。

| 概念 | Git | Jujutsu |
| --- | --- | --- |
| 作業中の変更 | working tree + index | working-copy commit |
| 変更の選別 | git addでstage | changeを分ける・squashする |
| branch名 | branch | bookmark |
| 履歴編集 | rebase -i等 | 通常commandでchangeを移動・編集 |
| 操作の取消 | reflog等から復旧 | operation logとjj undo |

## 既存Git repositoryをcolocateして検証した

2026年9月17日、macOS x86_64の一時directoryへJujutsu 0.45.1の公式release binaryを配置した。sample Git repositoryにinitial commitを作り、`jj git init --colocate .`を実行した。`.git`を残したまま`.jj`が作られ、既存の`main`とcommitがimportされた。

READMEを編集すると`jj st`が変更を認識し、`jj diff --stat`は2行追加を表示した。`jj describe`で現在のchangeへ説明を付け、`jj new`で次のempty changeを作成したあと、`jj undo`で直前のnew操作を取り消せた。なおGit側へuser.nameとemailを設定していても、Jujutsuは作者情報が未設定だと警告した。`jj config`側の設定が別途必要になる点は導入時に確認したい。

| 確認項目 | 結果 | 気づき |
| --- | --- | --- |
| jj | 0.45.1 | 公式macOS x86_64 binary |
| colocate | 既存.gitを保持して初期化成功 | Git toolと段階併用できる |
| working copy | 編集を即時認識 | git add相当は不要 |
| operation undo | jj newを取消 | fileだけでなくVCS操作を戻す |
| identity | 未設定warning | Git configとjj configを別確認 |

## sandbox repositoryで基本loopを覚える

本番repositoryへいきなり導入せず、cloneまたは一時repoで`jj st`、`jj diff`、`jj describe`、`jj new`、`jj log`を触る。Jujutsuではfile editが現在のchangeへ入るため、作業を始める前に`jj new main`などで目的のbaseから新しいchangeを作る習慣が重要になる。

`jj undo`は直前のJujutsu operationを戻す。何が戻るかを確認せず連打しない。`jj op log`でoperation履歴を見て、対象を理解してから復旧する。外部Git toolによる変更もcolocated workspaceへ同期されるが、同時操作や自動toolの前提を小さなrepoで確認する。

既存Git repoで試す最小loop

```shell
cd sandbox-repo
jj git init --colocate .
jj new main
# filesを編集
jj st
jj diff
jj describe -m 'refactor parser'
jj new
jj log

# 直前のJujutsu操作を確認して戻す
jj op log
jj undo
```

## GitHubへ送るときだけbookmarkが必要になる

localではbookmarkなしでchange stackを作れる。GitHubへpushするときは、Jujutsuに自動名を作らせて特定changeをpushするか、named bookmarkを作ってtrackし、pushする。公式guideはworking-copy commitがemptyの場合、そのparentへbookmarkを置く例を示す。

bookmarkはGitのbranchとしてremoteへ現れるが、新しいcommitを作っても自動追従しない。review修正を追加したら、bookmarkを新しいrevisionへmoveして再pushする。Gitの『現在branchがcommitと一緒に進む』感覚を持ち込まない。

change stackをnamed bookmarkでpush

```shell
jj new main
# 変更1
jj commit -m 'refactor parser'
# 変更2
jj commit -m 'add parser tests'

jj bookmark create parser-work -r @-
jj bookmark track parser-work
jj git push --bookmark parser-work
```

## fetchとrebaseは二段階

公式guideでは、現在`git pull`の直接対応commandはなく、`jj git fetch`でremote更新を取得し、`jj rebase -o main`で自分のchangeを新しいmainへ移す。複数のbranch stackがあるなら、対象を明示してrebaseする。自動で全部が正しいbaseへ移ると仮定しない。

conflictはJujutsu内でfirst-classな状態として扱われ、解決を後へ持ち越せる。ただし、conflictを含むrevisionをbuildやpushしてよいとは限らない。CIへ送る前に`jj st`と`jj log`でconflictとbookmark位置を確認し、testを実行する。

remote更新へ追従する

```shell
jj git fetch
jj log -r 'main@origin..@'
jj rebase -o main
jj st
# projectのlint・test・buildを実行
```

## colocated運用は、互換性と二重管理のtradeoff

colocated workspaceでは、各`jj` commandがJujutsuとunderlying Gitのviewを同期する。既存IDEやGitHub clientを残して段階移行できる利点がある。一方、Git toolがHEADやbranchを動かし、jjが再importするため、両者のmodelを理解しないまま交互に操作すると驚きが増える。

team全員がJujutsuへ移る必要はないが、repositoryのdocumentationには、bookmarkのpush方法、author設定、CI前check、問題時の復旧手順を書く。server側はGitのため、branch protectionやpull request policyは引き続きGitHub側で効く。localで履歴編集しやすいことと、remoteへforce updateしてよいことは別だ。

## 誰に向き、誰にはまだ早いか

複数changeのstack、頻繁なrebase、途中作業の整理、履歴編集のやり直しが多い開発者には価値がある。operation logとchange IDは、local historyを積極的に整えるworkflowと相性がよい。GitHubはそのまま使えるため、個人から試しやすい。

一方、Gitのbranch・indexを前提にした社内script、GUI、教育、hookが多い組織では移行costがある。Gitに困っていない小規模teamへ、新しい用語を増やすだけになる可能性もある。まず非重要repositoryをcolocateし、二週間程度、復旧時間とreviewのしやすさを記録して判断する。

- 本番repoではなくsandbox cloneで操作模型を覚える
- Git identityとは別にjjのuser.name・emailを確認する
- push前にbookmark位置と対象revisionを確認する
- jj op logを見てからundoや復旧を行う
- localの柔軟さとremote policyを混同しない

## 制約と未検証範囲

- Jujutsu 0.45.1を使った使い捨てrepositoryで確認し、production teamのmigration、hosted forge運用、大規模repositoryの性能は検証していない。

## 確認したもの

- [Jujutsu documentation](https://www.jj-vcs.dev/latest/)
- [Jujutsu installation](https://www.jj-vcs.dev/latest/install-and-setup/)
- [Working with GitHub and GitLab](https://www.jj-vcs.dev/latest/github/)
- [Git command table](https://www.jj-vcs.dev/latest/git-command-table/)
- [Jujutsu operation log](https://www.jj-vcs.dev/latest/operation-log/)
