# zizmor入門：GitHub Actionsの危険な書き方を探す

YAMASHI TECH AI Editorial Desk | Deep Dive | DevTools / Security

[掲載ページ](https://yamashi-tech.com/articles/tool-zizmor-github-actions-security) · [原稿データ](../articles/tool-zizmor-github-actions-security.json)

公開: 2026-09-17 / 更新: 2026-09-17 / 確認: 2026-09-17

GitHub Actions専用の静的解析zizmorを、危険なsample workflowへoffline実行。template injectionや未固定Actionをどう直し、CIへ入れるかを整理した。

## workflowは、権限を持ったprogramとして読む

GitHub ActionsのYAMLは設定fileに見えるが、token、secret、artifact、release権限を持つcommandを実行するprogramだ。pull_requestのtitleやbranch名のような外部入力をshellへ直接展開すればcode injectionが起きる。第三者Actionの参照がtagだけなら、参照先が変わるsupply-chain riskもある。

zizmorはGitHub ActionsのworkflowとAction定義に特化したstatic analysis toolだ。general-purpose YAML linterでは見つけにくい、template injection、過剰permission、credential persistence、unpinned `uses`などをruleとして検出する。local fileをofflineで検査でき、online modeではGitHub APIから追加情報も取得する。

## 検査対象はsyntaxではなく、実行時のtrust boundary

たとえば`${{ github.event.issue.title }}`を`run:`へ直接書くと、GitHubがYAMLを展開したあとshellが実行する。issue titleへquoteやcommand substitutionを混ぜられると、作者の想定と違うcommandになる可能性がある。zizmorの`template-injection`は、この境界を追跡する。

`uses: actions/checkout@v4`は読みやすいが、tagが指すcommitは理論上変更できる。`unpinned-uses`は既定で、GitHub公式を含むすべてのActionへfull SHA pinを要求する。厳しすぎる場合はpolicyを設定できるが、例外を入れる前に更新方法と責任者を決める。

| 代表rule | 検出するrisk | 主な修正 |
| --- | --- | --- |
| template-injection | 外部入力をshell等へ直接展開 | envへ渡し、shell側で変数展開 |
| unpinned-uses | Action参照先の変更 | full commit SHAへ固定 |
| artipacked | checkout credentialがartifact等へ混入 | persist-credentials: false |
| excessive-permissions | 不要に強いGITHUB_TOKEN | job単位で最小permission |
| dangerous-triggers | fork由来codeと強権限triggerの組み合わせ | eventとcheckout対象を分離 |

## 危険なsampleから、offlineで6件を検出した

2026年9月17日、macOS x86_64の一時directoryでzizmor 1.30.1を`uvx`から実行した。sample workflowには`permissions: write-all`、`actions/checkout@v4`、issue titleの`run:`直接展開を意図的に入れた。tokenを渡さず`zizmor --offline .`を実行した。

結果は6 findingsで、3件は表示上suppressed、unsafe fix候補は2件だった。画面には`artipacked`がmedium、`template-injection`と`unpinned-uses`がhighとして表示され、processはexit code 14で終了した。非0終了するためCI gateに使えるが、既存workflowへ初導入すると大量検出で止まる可能性がある。baselineと修正順を先に決める。

| 実測項目 | 結果 | 補足 |
| --- | --- | --- |
| zizmor | 1.30.1 | uvxの隔離cacheから実行 |
| mode | offline・tokenなし | local filesだけを検査 |
| findings | 6件 | 3 suppressed、2 unsafe fix候補 |
| visible severity | medium 1 / high 2 | artipacked、template injection、unpinned |
| exit | 14 | findingありとしてCIで検出可能 |

## 最初はtokenなしのlocal auditから始める

local repositoryは、zizmorへdirectoryまたはfileを渡せば検査できる。tokenがない場合はofflineが基本となり、`--offline`を明示すればnetwork前提を避けられる。まず読み取りだけでfindingを一覧化し、何を直すかreviewする。experimentalなfix機能を最初から全fileへ適用しない。

remote repositoryを直接検査するmodeもあるが、再現性が必要ならcommit SHAを指定する。branch名だけでは検査中に対象が動く。GitHub tokenを渡す場合はread-onlyの最小scopeにし、command historyやCI logへ露出しない。

local workflowをoffline検査

```shell
uvx zizmor --version
uvx zizmor --offline .

# machine-readable output
uvx zizmor --offline --format json .
uvx zizmor --offline --format sarif .github/workflows
```

## template injectionは、envを境界にする

GitHub expressionを`run:`のscript本文へ直接展開せず、stepの`env`へ渡す。scriptでは`${ISSUE_TITLE}`のようにshell variableとして参照する。これにより、値はYAML展開でcodeへ埋め込まれず、shellの通常のquoting ruleでdataとして扱える。PowerShellではsyntaxが異なるため、必要ならshellを明示する。

`env`へ置けばどんな使い方も安全になるわけではない。後で`eval`へ渡す、quoteせずcommand引数を組み立てる、file pathとして無検証で使う場合は別のinjectionが起こる。入力の用途に合わせてvalidationとquotingを行う。

issue titleをscriptへ直接展開しない

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

## SHA pinは、更新automationとセットにする

full SHAへ固定すると、tagの移動による意図しないcode変更を防げる。しかし固定したままではsecurity updateも入らない。DependabotやRenovateで新しいSHAをPRにし、release noteとpermission差分をreviewする運用が必要だ。commentへ元tagを残すと、人がversionを読みやすい。

zizmor 1.20.0以降の既定policyは、`actions/*`を含むすべてのActionへhash pinを要求する。組織policyで公式Actionだけtagを許すこともできるが、例外はzizmor設定へ明示し、口頭ルールにしない。

Action参照とcredentialを明示する

```yaml
- uses: actions/checkout@<40-character-commit-sha> # v4
  with:
    persist-credentials: false

permissions:
  contents: read
```

## CI導入は、既存findingと新規findingを分ける

成熟したrepositoryでは、初回auditのfindingを一日で全修正できないことがある。severityとexploitabilityで優先順位を付け、template injectionや危険なtriggerを先に直す。例外を設定する場合は、理由、対象file、期限、ownerを残す。単にCIをgreenにするためのglobal ignoreは避ける。

pull requestではGitHub annotationやSARIFを使うと、該当行へfindingを出せる。CI Action自体もSHA pinし、zizmor versionを固定する。offlineで十分なruleと、online metadataが必要なruleを分けると、fork PRへtokenを渡さずに済む。

## static analysisの限界を理解して使う

zizmorはworkflowの静的な構造を検査する。called workflowの実行時data、外部scriptの中身、自前Actionのbinary、組織secretの設定、GitHub側permissionまですべて保証するものではない。findingが0でも安全証明にはならない。

それでも、Actions固有の危険なpatternをreviewerの記憶だけに頼らず検出できる価値は大きい。導入の完了条件はtoolを置くことではなく、high severityを修正し、例外policyをdocument化し、新しいworkflowで同じriskが増えないことだ。

- tokenなし・offlineで現状を読むところから始める
- high severityと外部入力のinjectionを優先する
- SHA pinとdependency update automationを組み合わせる
- fixはdiffをreviewしてから採用する
- static analysis、GitHub設定、外部script reviewを併用する

## 制約と未検証範囲

- zizmor 1.30.1を使った使い捨てworkflowで確認し、実在organizationのpolicyやGitHub Actionsの全機能は検証していない。

## 確認したもの

- [zizmor documentation](https://docs.zizmor.sh/)
- [zizmor quickstart](https://docs.zizmor.sh/quickstart/)
- [zizmor usage](https://docs.zizmor.sh/usage/)
- [zizmor audit rules](https://docs.zizmor.sh/audits/)
- [zizmor integrations](https://docs.zizmor.sh/integrations/)
