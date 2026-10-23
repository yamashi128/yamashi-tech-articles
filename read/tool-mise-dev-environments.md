# mise入門：Node・Pythonのバージョンと検証コマンドを共有する

YAMASHI TECH AI Editorial Desk | Deep Dive | DevTools / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/tool-mise-dev-environments) · [原稿データ](../articles/tool-mise-dev-environments.json)

公開: 2026-09-17 / 更新: 2026-10-23 / 確認: 2026-10-23

mise.tomlへツールのバージョンと開発タスクをまとめると、開発者とCIが同じ入口で作業できる。シェル設定を変えずに試す手順から、asdfとの併用、バージョン固定の考え方まで解説する。

## 複数言語のセットアップをmise.tomlへまとめる

Nodeはnvm、Pythonはpyenv、検証コマンドはREADMEとpackage.json。こうした構成では、新しい開発者が複数の手順を追う必要がある。miseはツールのバージョン、プロジェクトの環境変数、開発タスクを`mise.toml`へまとめ、`mise install`と`mise run check`のような共通の入口を作る。

特に役立つのは、複数の言語やツールを使い、環境のずれが起きているプロジェクトだ。最初からマシン全体を管理する必要はない。まず言語バージョンと普段の検証コマンドを一つのファイルへ置けば、導入の効果を確かめやすい。

## シェル設定を変えずに、プロジェクトで試す

`mise exec -- コマンド`は、そのプロジェクトで選んだツールを使ってコマンドを実行する。`mise run タスク名`は設定したタスクを実行する。この二つなら、シェルの初期化ファイルへactivationを追加せずに始められる。日常的に使う段階で、ディレクトリ移動に合わせてPATHを切り替えるactivationを検討するとよい。

下の`mise use`は、Node 24系とPython 3.13系を導入し、設定へ保存する例だ。`24`は一つのpatch版を意味しない。同じ24系でも環境を構築した時期で解決される版が変わり得る。完全に同じ版が必要なプロジェクトでは、patchまで固定し、更新する機会を決める。

mise導入済みのプロジェクトで試す例。ツール取得とmise.tomlの更新を伴う。

```shell
cd your-project
mise use node@24 python@3.13
mise install
mise exec -- node --version
mise exec -- python --version
```

## Node導入からタスク実行まで、一時環境で確認した

2026年9月17日、macOS x86_64の一時ディレクトリへmise 2026.9.10を置き、data、cache、config、stateも一時領域へ分離して試した。`mise use node@24`によって、その時点ではNode 24.21.0が導入され、設定には`node = "24"`が保存された。

`mise tasks add check -- node --check index.js`で構文検査タスクを作ると、`mise run check`は成功した。`mise exec -- node --version`もv24.21.0を返した。シェルactivationを使わず、バージョン宣言・導入・実行がつながったという結果だ。これは過去の導入結果で、現在の24系の最新版を示すものではない。

| 確認項目 | 結果 | 補足 |
| --- | --- | --- |
| mise | 2026.9.10 | 公式installerを一時配置 |
| tool install | Node 24.21.0 | `node = "24"`から解決 |
| task | node --check index.js 成功 | mise run経由 |
| shell activation | 使用せず | mise execとmise runのみ |

## READMEの手順を、名前の付いたタスクにする

下の設定では、`mise run lint`と`mise run test`が既存のnpmスクリプトを呼ぶ。`mise run check`を実行すると、両方が前提タスクとして実行される。Node以外のツールも使うリポジトリで、開発者とCIのコマンド名を揃えられる。

`depends`へ並べた順番は実行順序を表さず、前提タスクは並列で動く場合がある。たとえばbuild成果物をテストが読む場合は、lintとtestを並べる例をそのまま使わず、順序を持つ実行ステップや依存関係を定義する。独立した検査かどうかを先に判断することが大切だ。

タスクは任意のコマンドを実行できるので、設定もコードとして読む。公開してよい環境変数は共有し、APIキーなどの値はCI secretsや承認された管理先から必要なプロセスへ渡す。個人用設定は共有設定と分ける。

独立したlintとtestを束ねるmise.tomlの例。

```toml
[tools]
node = "24"
python = "3.13"

[env]
NODE_ENV = "development"

[tasks.lint]
run = "npm run lint"

[tasks.test]
run = "npm test"

[tasks.check]
depends = ["lint", "test"]
```

## asdfの設定を残して、段階的に移行できる

miseは`.tool-versions`を読めるため、asdfから移るときに最初から設定を削除する必要はない。同じバージョンをmiseで導入し、既存のテストとビルドを通してから、タスクや環境変数をmise.tomlへまとめるか判断できる。

`.nvmrc`や`.python-version`など、言語別のバージョンファイルは、読み取りを有効にする設定が別に必要だ。既存のファイルを残す場合は、どれを正しい宣言として扱うかを決める。二つの設定へ異なるバージョンを書く状態は避けたい。

nvmやpyenvは単一言語の管理に向き、asdfは複数ツールのバージョン管理に使える。miseはそこへ環境変数とタスクをまとめられる点が違う。一方、OSライブラリまで揃える必要があるなら、コンテナーなどが担う範囲も残る。

| 選択肢 | 主に揃えるもの | 選ぶ目安 |
| --- | --- | --- |
| mise | 複数ツール・環境変数・タスク | セットアップと実行の入口を統一したい |
| asdf | 複数ツールのバージョン | 既存の.tool-versionsを活かしたい |
| nvm / pyenv | 特定言語のバージョン | 一つの言語の管理で十分 |
| コンテナー | OSを含む実行環境 | OS依存もまとめて再現したい |

## 導入のゴールは、開発者とCIが同じcheckを通せること

移行中は`mise install`、`mise current`で選択された版を確認し、定義したタスクを実行する。lint・test・buildを既存の環境と比較してから、CIとREADMEを切り替える。ツールごとのプラグイン、古いruntime、private registry、architecture固有のバイナリーは、実際のプロジェクトで追加確認する。

miseを入れても、Xcode、Docker daemon、OSライブラリまで同じ状態になるとは限らない。clean checkoutから必要な前提を揃え、同じ成果物を得られるところまでを導入作業に含める。単一のNode版だけを使い、既存の仕組みで困っていないなら、タスク統一の利点が設定追加の負担を上回るかを比べればよい。

lint・test・buildを定義したプロジェクトの移行確認例。

```shell
mise install
mise current
mise run lint
mise run test
mise run build
git diff -- .tool-versions mise.toml README.md
```

## 制約と未検証範囲

- 実行結果は2026年9月17日のmacOS x86_64・mise 2026.9.10での既存検証。2026年10月23日は公式資料を再確認した。組織全体の移行、private registry、本番CIへの展開は試していない。

## 確認したもの

- [mise-en-place — official documentation](https://mise.jdx.dev/)
- [mise walkthrough](https://mise.jdx.dev/walkthrough.html)
- [mise dev tools](https://mise.jdx.dev/dev-tools/)
- [mise tasks](https://mise.jdx.dev/tasks/)
