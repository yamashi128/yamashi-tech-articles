# zizmor入門：GitHub Actionsの危険な書き方をローカルで見つける

YAMASHI TECH AI Editorial Desk | Deep Dive | DevTools / Security

[掲載ページ](https://yamashi-tech.com/articles/tool-zizmor-github-actions-security) · [原稿データ](../articles/tool-zizmor-github-actions-security.json)

公開: 2026-09-17 / 更新: 2026-10-23 / 確認: 2026-10-23

zizmorはGitHub Actionsに特化した静的解析ツールだ。トークンなしのoffline検査から始め、外部入力の直接展開、ActionのSHA固定、権限設定を具体的に見直す方法を説明する。

## YAMLの文法検査だけでは見えない、Actions固有の問題を探す

zizmorは、GitHub ActionsのworkflowやAction定義にある危険なパターンを見つけるツールだ。外部入力をシェルへ直接埋め込む記述、強すぎる権限、固定されていないAction参照などを検査する。GitHubトークンを渡さず、手元のファイルをofflineで調べるところから使える。

workflowは設定に見えても、認証情報やリリース権限を使ってコードを実行する。たとえばIssueのタイトルを`run:`へ直接埋め込むと、入力がコマンドの一部になる場合がある。zizmorはこうした、入力データが実行コードへ変わる境目をレビューする助けになる。

## 最初はトークンを渡さず、検出結果を読む

導入済みのuvxから実行する例を下に示す。検証時と同じ1.30.1を指定し、`--offline`でネットワーク取得を行わずローカルの定義を検査する。uvx自体はツールがキャッシュにないとパッケージを取得するため、zizmorのoffline指定とツール導入は分けて考える。

通常の出力なら、findingの最大severityに応じた非0終了をCIで利用できる。JSONは機械処理、SARIFはコードスキャン連携向けだ。ただしSARIF出力時はfindingがあっても通常の11以上の終了コードを使わない。SARIFを生成した処理の成功だけを、問題がなかった証拠にしない。

ローカル検査の手順例。初回のuvx実行ではパッケージ取得が生じる。

```shell
uvx zizmor==1.30.1 --version
uvx zizmor==1.30.1 --offline .

# 機械処理向けの出力
uvx zizmor==1.30.1 --offline --format json .
uvx zizmor==1.30.1 --offline --format sarif .github/workflows
```

## 意図的に問題を含めた定義から、6件を検出した

2026年9月17日、macOS x86_64の一時ディレクトリでzizmor 1.30.1を試した。サンプルには`permissions: write-all`、`actions/checkout@v4`、Issueタイトルの直接展開を入れ、トークンを渡さず`zizmor --offline .`を実行した。危険なworkflowをGitHubで実行した試験ではない。

結果は6 findingsで、表示上は3件がsuppressed、unsafe fixの候補は2件だった。見えていた診断は`artipacked`がmedium、`template-injection`と`unpinned-uses`がhigh。終了コードは14で、最大severityがhighだったことに対応する。自動修正をそのまま採用せず、指摘の原因と変更内容を読める状態になった。

| 実測項目 | 結果 | 補足 |
| --- | --- | --- |
| zizmor | 1.30.1 | uvxの隔離cacheから実行 |
| mode | offline・tokenなし | local filesだけを検査 |
| findings | 6件 | 3 suppressed、2 unsafe fix候補 |
| visible severity | medium 1 / high 2 | artipacked、template injection、unpinned |
| exit | 14 | findingありとしてCIで検出可能 |

## 外部入力はenvへ渡し、シェルの変数として扱う

`${{ github.event.issue.title }}`のようなGitHub式は、シェル実行前に展開される。これを`run:`本文へ置くと、入力に含まれる記号がスクリプトへ入り込む。修正の基本は、式の値をstepの`env`へ渡し、スクリプト内では引用符付きのシェル変数として扱うことだ。

下の例はタイトルに「: 」が含まれるかをBashで検査する。`run:`内を`${{ env.ISSUE_TITLE }}`にしてしまうと再びテンプレート展開になるため、`${ISSUE_TITLE}`を使う。値を後から`eval`へ渡す処理や、ファイルパスとして扱う場合の検査は別途必要だ。

Issueイベントを扱うworkflowのsteps内へ置く例。

```yaml
- name: Check issue title
  shell: bash
  env:
    ISSUE_TITLE: ${{ github.event.issue.title }}
  run: |
    if [[ ! "${ISSUE_TITLE}" =~ ^.*:\ .*$ ]]; then
      echo "Bad issue title"
      exit 1
    fi
```

## Actionの固定と最小権限を、一緒に見直す

Actionをタグだけで参照すると、タグが指すコードの変更を受ける。full commit SHAへ固定すると参照先を明確にできる。zizmor 1.20.0以降の`unpinned-uses`は、既定で`actions/*`も含む全ActionのSHA固定を要求する。例外が必要なら設定で定義する。

SHAを固定した後も、更新用のPRとリリース内容の確認が必要だ。checkoutした認証情報を後工程へ残さない設定、jobに必要なトークン権限だけを与える設定も合わせて読む。下はjob定義の抜粋で、SHA部分は実在する検証済みの40文字へ置き換える。

| 代表rule | 検出するrisk | 主な修正 |
| --- | --- | --- |
| template-injection | 外部入力をshell等へ直接展開 | envへ渡し、shell側で変数展開 |
| unpinned-uses | Action参照先の変更 | full commit SHAへ固定 |
| artipacked | checkout credentialがartifact等へ混入 | persist-credentials: false |
| excessive-permissions | 不要に強いGITHUB_TOKEN | job単位で最小permission |
| dangerous-triggers | fork由来codeと強権限triggerの組み合わせ | eventとcheckout対象を分離 |

job内の設定例。SHAのプレースホルダーは実際の値へ置き換える。

```yaml
permissions:
  contents: read

steps:
  - uses: actions/checkout@<40-character-commit-sha> # 対応するタグもコメントに記録
    with:
      persist-credentials: false
```

## 既存の問題を整理し、新しいworkflowで繰り返さない

初回の検査では、すぐCIを必須化する前に、指摘を読み、外部入力の注入や危険なtriggerなどから修正する。例外には理由・対象・ownerを残す。既存のfindingと追加されたfindingを区別できるようにすると、導入直後の大量警告へ埋もれにくい。

zizmorはActions固有の静的解析に向き、一般のコード検査やGitHub側の設定確認とは役割が違う。外部スクリプトの全動作や実際のsecret配置は、workflowの定義だけからは分からない。CIへ導入する際はツールの版と実行条件を固定し、必要な診断をローカルのレビューで理解してから自動化するとよい。

## 制約と未検証範囲

- 実行結果は2026年9月17日のmacOS x86_64・zizmor 1.30.1による使い捨て定義のoffline検査。2026年10月23日は公式のruleと終了コードを再確認した。実在組織のworkflow実行、トークンを使う検査、本番設定の監査は行っていない。

## 確認したもの

- [zizmor documentation](https://docs.zizmor.sh/)
- [zizmor quickstart](https://docs.zizmor.sh/quickstart/)
- [zizmor usage](https://docs.zizmor.sh/usage/)
- [zizmor audit rules](https://docs.zizmor.sh/audits/)
- [zizmor integrations](https://docs.zizmor.sh/integrations/)
