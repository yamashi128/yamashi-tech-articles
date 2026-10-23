# git worktree入門：作業を残したまま、別ブランチの仕事場を作る

YAMASHI TECH AI Editorial Desk | Deep Dive | DevTools / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/tool-git-worktree-parallel-branches) · [原稿データ](../articles/tool-git-worktree-parallel-branches.json)

公開: 2026-10-20 / 更新: 2026-10-23 / 確認: 2026-10-23

git worktreeは一つのリポジトリから、別ブランチの作業ディレクトリを増やす機能だ。緊急修正や並行レビューのための追加・確認・片付けを示し、共有されるGit情報と分離すべき実行環境を説明する。

## 途中の変更をそのまま残して、緊急修正へ着手できる

長い改修の途中で別の不具合を直すとき、`git worktree`なら現在のファイルを動かさず、別ディレクトリへ別ブランチを展開できる。未commitの変更をstashしてから同じ場所を切り替える手順を減らし、二つの作業を並べて持てる。

新しいcloneを丸ごと増やす場合と違い、commitを保存するobject databaseは同じリポジトリのものを使う。手元で作ったcommitを互いに参照しやすい一方、ブランチやremoteなど共有される状態もある。ここを理解すると、並行作業の準備と片付けを見通せる。

## ファイル・HEAD・indexは別、commitと多くのrefsは共有

`git worktree add`で追加するlinked worktreeには、別の作業ファイル、HEAD、indexがある。HEADは現在のcommit、indexは次のcommitへ入れる内容を表す。元のworktreeで変更中のファイルを、そのまま別の作業で上書きせずに済む。

一方、commit objectや多くのbranch ref、tag、remote-tracking refは共有する。通常のcloneを二つ持つ場合よりGitの情報が密接につながる構成だ。Gitは原則として、一つのブランチを複数のworktreeへ同時にcheckoutさせない。並行する作業ごとに別ブランチを使う。

| 項目 | worktreeごと | リポジトリで共有 |
| --- | --- | --- |
| 作業中のファイル | 別々のディレクトリ | — |
| HEADとindex | 別々に保持 | — |
| commit object | — | 同じobject database |
| ブランチ・tagなど多くのrefs | 一部を除く | 共通の参照先を使う |
| 実行中のサーバーやDB | Gitは分離しない | 用途ごとに別途設定する |

## 新しいブランチを、隣のディレクトリへ追加する

まず`git status --short`で現在の作業を読み、追加先のパスとブランチ名を決める。下はorigin/mainを起点に修正用ブランチを作る例だ。`git fetch`はremoteへ接続する。取得済みのローカルcommitを起点にする場合は、そのrefやSHAを指定できる。

`git worktree add -b`では、ブランチ、追加先、起点を順に指定する。起点を省略すると現在のHEADを使うため、作業の再現や自動化では明示すると追いやすい。作成後はそのディレクトリで通常どおり編集・テスト・commitする。一覧を機械処理するなら`--porcelain`を使う。

修正用worktreeを追加する例。origin/mainとnpm testを使うプロジェクトを想定。

```shell
git status --short
git fetch origin
git worktree add -b fix/login-timeout ../repo-fix-login origin/main
git worktree list --porcelain
cd ../repo-fix-login
npm test
git status --short
```

## 使い捨てリポジトリでは、HEADを分けて作成・削除できた

2026年10月20日、macOS x86_64、Git 2.49.0で、一時ディレクトリに検証用リポジトリを作った。mainに空commitを置き、`git worktree add -b feature`で別worktreeを作成した。featureでも空commitを作り、`git worktree list --porcelain`で両方の状態を確認した。

mainのHEADは`f4077b9...`、featureは`14f3265...`で、それぞれ`refs/heads/main`と`refs/heads/feature`に対応した。最後に`git worktree remove`を実行すると、一覧にはmainだけが残り、操作は終了コード0で完了した。これは作成・確認・削除の動作確認で、並列ビルドの速度や外部接続の試験ではない。

| 項目 | 検証値 | 観測 |
| --- | --- | --- |
| OS／architecture | Darwin x86_64 | 一時directoryのみ使用 |
| Git | 2.49.0 | add／list／remove成功 |
| main HEAD | f4077b9... | refs/heads/main |
| feature HEAD | 14f3265... | refs/heads/feature |
| 終了状態 | exit code 0 | remove後はmainのみ |

## 並行実行するなら、port・依存・データの置き場も分ける

ソースが別でも、開発サーバーが同じportを使えば衝突する。テストが同じDBを書き換えれば結果も干渉する。作業ごとにport、DBやqueueの名前、ビルド成果物のパスを決める。依存のキャッシュを共有することと、`node_modules`などの導入済みツリーを共有することも分けて考える。

Git側でも、一方のfetchは共通のremote-tracking refを更新する。hookや認証設定などが完全に独立するわけではない。worktreeは危険なコードを隔離するsandboxではないため、信頼できないコードを実行する場合は、コンテナーやOS側の権限も別に設計する。

複数人やagentへ割り当てる場合は、ブランチだけでなく担当ファイルと統合順を決める。同じファイルを同時に変える仕事なら、直列にするか主担当を一人にすると調整しやすい。共通interfaceを先にcommitしてから別々の実装へ進む方法もある。

## 作業を保存してからremoveし、ブランチ削除は別に判断する

片付ける前に、linked worktree内の`git status --short`で未保存の変更やuntracked fileを確認する。必要なcommitやpatchを残したうえで、元のworktreeから`git worktree remove <path>`を実行する。変更があるため拒否された場合は、中身を確認する。通常の片付けで`--force`を使う必要はない。

removeしてもブランチは残る。統合済みを確認した後に、必要なら`git branch -d`で削除する。下の`git log main..fix/login-timeout`に必要なcommitが残っていれば、先に統合や保存方法を決める。未mergeのブランチを`-D`で消す操作を、通常のcleanupへ混ぜない。

ディレクトリを先に手動削除すると管理情報が残る場合がある。移動したパスには`repair`、普段接続していないディスクのworktreeには`lock --reason`という管理方法もある。

元のworktreeから行う終了確認の例。ブランチ削除は統合済みを確認してから実行する。

```shell
git -C ../repo-fix-login status --short
git log --oneline main..fix/login-timeout
git worktree remove ../repo-fix-login
git worktree list --porcelain
git branch -d fix/login-timeout
```

## 緊急修正やレビュー用checkoutから取り入れる

worktreeは、今の変更を保ったまま別の仕事を始めたいときに向く。まず緊急修正やレビュー用のcheckoutを一つ作り、置き場所、命名、依存の導入、port、削除手順を共有すると使い始めやすい。

Git公式資料はsubmoduleを含むsuperprojectの複数checkoutについて、サポートが不完全で推奨しないと注意している。固定パスを前提にした古いビルドや、外部の状態を分けられないテストも、そのまま並行化しない。別の仕事場を作れる利点と、Git情報や実行環境を共有する条件を合わせて使う機能だ。

## 制約と未検証範囲

- 実行結果は2026年10月20日のmacOS x86_64・Git 2.49.0による空commit中心の既存検証。2026年10月23日は公式資料を再確認した。remote、push、merge、submodule、LFS、sparse checkout、IDE連携、network filesystem、実プロジェクトの並行ビルドは試していない。
- worktreeはGitの作業場所を増やす機能で、権限・secret・外部サービスを隔離する機能ではない。submoduleを使うsuperprojectへの適用は公式の注意事項を参照する。

## 確認したもの

- [Git — git-worktree Documentation](https://git-scm.com/docs/git-worktree)
- [Git — git-branch Documentation](https://git-scm.com/docs/git-branch)
