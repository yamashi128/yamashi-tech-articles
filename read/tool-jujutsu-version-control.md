# Jujutsu入門：GitHubを使い続けながら、変更と履歴を整理する

YAMASHI TECH AI Editorial Desk | Deep Dive | DevTools / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/tool-jujutsu-version-control) · [原稿データ](../articles/tool-jujutsu-version-control.json)

公開: 2026-09-17 / 更新: 2026-10-23 / 確認: 2026-10-23

Jujutsuは作業中の変更をcommitとして扱い、履歴の整理とやり直しを日常の操作にする。Gitとの違い、既存リポジトリでの試し方、bookmarkを使ったGitHub連携を順に説明する。

## 作業中の変更を一つのcommitとして育てる

Jujutsuは、Gitリポジトリと相互運用できるバージョン管理システムだ。コマンド名は`jj`。GitHubを使い続けながら、手元の作業と履歴編集の方法を変えられる。変更を何段にも積み重ねたり、後からcommitを整理したりする開発者に向く。

大きな違いは、作業中のファイルも一つの「working-copy commit」として扱うことだ。多くのjjコマンドは、実行時にファイルの変更をそのcommitへ取り込む。Gitのように`add`でstaging areaへ選んでからcommitする手順はない。ひとまとまりの変更を作り、説明を付け、`jj new`で次の変更を始める。

履歴編集でcommit IDが変わっても、change IDが同じ論理的な変更を追う助けになる。操作自体もoperation logへ記録されるため、ファイルの差分だけでなく、履歴をどう編集したかを確認してやり直せる。

## Gitのbranchに近いbookmarkは、自動で進まない

Git経験者が先に覚えたいのは、working copy、bookmark、次のchangeの関係だ。`jj describe`は現在のchangeへ説明を付ける。`jj new`は新しい作業用commitを作る。`jj commit -m`は説明を付け、続けて次の空のworking-copy commitを作る。

bookmarkはGitのbranchに近い名前だが、次のcommitを作っても自動では進まない。ローカルではbookmarkを付けずに複数のchangeを作り、GitHubへ送る段階で、公開したいrevisionへbookmarkを置ける。Gitのコマンドの別名として暗記するより、「変更を整理してから、送る場所に名前を付ける」と理解するとつながる。

| 概念 | Git | Jujutsu |
| --- | --- | --- |
| 作業中の変更 | working tree + index | working-copy commit |
| 変更の選別 | git addでstage | changeを分ける・squashする |
| branch名 | branch | bookmark |
| 履歴編集 | rebase -i等 | 通常commandでchangeを移動・編集 |
| 操作の取消 | reflog等から復旧 | operation logとjj undo |

## 既存Gitリポジトリの隣で、基本操作を試す

試すときは、一時リポジトリや検証用cloneを使う。`jj git init --colocate .`は、既存の`.git`を残して同じ場所へ`.jj`を作る方法だ。Gitのツールを残したままjjを使い始められる。下の例ではmainを起点にchangeを作り、変更を見て説明を付ける。

`jj undo`を使う前に`jj op log`で対象を読む。undoは直前のJujutsu操作を取り消すため、単なるファイル復元とは意味が違う。作業を進めた後に何度も実行するのではなく、どの状態へ戻すかを確認してから使う。

検証用Gitリポジトリで試す操作例。既存の作業へ適用する前に状態を確認する。

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

## 一時リポジトリでは、colocate・変更認識・undoが動いた

2026年9月17日、macOS x86_64へJujutsu 0.45.1の公式release binaryを一時配置して検証した。initial commitを持つGitリポジトリでcolocateすると、既存のmainとcommitが取り込まれた。READMEを編集すると`jj st`が認識し、`jj diff --stat`は2行追加を表示した。

`jj describe`で説明を付け、`jj new`で次の空changeを作った後、`jj undo`でnew操作を取り消せた。一方、Git側へuser.nameとemailを設定済みでも、jjは作者情報が未設定だと警告した。導入時にはjj側の作者設定も確認する。この検証ではGitHubへのpushは行っていない。

| 確認項目 | 結果 | 気づき |
| --- | --- | --- |
| jj | 0.45.1 | 公式macOS x86_64 binary |
| colocate | 既存.gitを保持して初期化成功 | Git toolと段階併用できる |
| working copy | 編集を即時認識 | git add相当は不要 |
| operation undo | jj newを取消 | fileだけでなくVCS操作を戻す |
| identity | 未設定warning | Git configとjj configを別確認 |

## GitHubへ送るrevisionにbookmarkを置く

ローカルで整理したchangeをGitHubへ送るときは、生成名で特定のchangeをpushする方法と、名前付きbookmarkを使う方法がある。下は後者の例だ。`jj commit`の後はworking copyが空なので、その親を表す`@-`へbookmarkを置く。

レビュー修正を追加した場合は、bookmarkを新しいrevisionへ移してからpushする。たとえば`jj commit`で修正を記録した後なら、`jj bookmark move parser-work --to @-`で更新できる。push前に`jj log`と`jj st`で対象と差分を読み、GitHub側のbranch protectionやレビュー規則に従う。

公式資料に基づく名前付きbookmarkの例。trackはローカルの追跡設定、pushはリモートのブランチを更新する。編集部では未実行。

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

## fetchで取得し、rebaseするchangeを選ぶ

リモートの変更取得と、自分の履歴の載せ替えは分ける。公式ガイドでは`git pull`に直接相当する一つのコマンドではなく、`jj git fetch`の後に`jj rebase -o main`を使う流れが示されている。複数のchange stackがあるなら、対象を指定してそれぞれ扱う。

Jujutsuはconflictも履歴上の状態として扱えるため、解決を後へ回せる。しかし、ビルドやレビューへ送る前にはconflictの有無を確認し、プロジェクトの検証を通す。操作を続けられることと、完成したコードであることは分けて判断する。

リモート更新を取得して履歴へ反映する操作例。編集部の実接続試験は行っていない。

```shell
jj git fetch
jj log -r 'main@origin..@'
jj rebase -o main
jj st
# projectのlint・test・buildを実行
```

## 履歴編集が多い人ほど、Gitと併用して試す価値がある

colocated運用では、jjがGitと自身の状態を同期する。既存のIDEやGitHubクライアントを使いやすい一方、Git側は通常のbranch checkoutとは違うdetached HEAD状態になる。Gitのbranchとindexを前提にしたスクリプトやhookがあるなら、その動作を検証用リポジトリで確かめる。

チーム全員が一斉に移る必要はない。まず、複数changeの整理、頻繁なrebase、作業のやり直しが多い人から試せる。編集部の提案としては、非重要リポジトリで二週間程度使い、レビュー用の履歴を作る手間や復旧のしやすさを比較すると判断しやすい。

日常的なGit操作で困っていなければ、新しい概念を覚える負担もある。採用する場合は作者情報、bookmarkを進める手順、push前の確認、operation logからの復旧を共有する。GitHubの運用を維持したまま、手元の履歴編集を改善できるかが見るべき点だ。

## 制約と未検証範囲

- 実行結果は2026年9月17日のmacOS x86_64・Jujutsu 0.45.1による使い捨てリポジトリの既存検証。2026年10月23日は公式資料を再確認した。GitHubへのpush、チーム移行、大規模リポジトリの性能比較は試していない。

## 確認したもの

- [Jujutsu documentation](https://www.jj-vcs.dev/latest/)
- [Jujutsu installation](https://www.jj-vcs.dev/latest/install-and-setup/)
- [Working with GitHub and GitLab](https://www.jj-vcs.dev/latest/github/)
- [Git command table](https://www.jj-vcs.dev/latest/git-command-table/)
- [Jujutsu operation log](https://www.jj-vcs.dev/latest/operation-log/)
- [Jujutsu — Working copy：自動snapshotの仕組み](https://www.jj-vcs.dev/latest/working-copy/)
