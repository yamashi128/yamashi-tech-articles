# Biome入門：formatとlintを一つの入口にする

YAMASHI TECH AI Editorial Desk | Deep Dive | DevTools / TypeScript

[掲載ページ](https://yamashi-tech.com/articles/tool-biome-js-quality) · [原稿データ](../articles/tool-biome-js-quality.json)

公開: 2026-09-17 / 更新: 2026-09-17 / 確認: 2026-09-17

JavaScript・TypeScriptのformatterとlinterをBiomeへまとめる。v2.5.14で自動修正とESLint設定移行を試し、置き換えられない範囲まで確認する。

## Biomeは、formatterとlinterの境界を一つにする

JavaScriptとTypeScriptでは、Prettierがformat、ESLintがcode qualityを担当する構成が広く使われている。成熟した組み合わせだが、二つの設定、plugin、ignore、editor integration、CI commandを同期する必要がある。rule同士が競合すると、片方のfixをもう片方が戻すこともある。

Biomeはparser、formatter、linter、import整理を一つのtoolchainへまとめる。Rust製の実装による速度だけでなく、一つのbinaryと`biome.json`をeditor、local、CIで共有できる点が強みだ。ただし、ESLint ecosystemのすべてのpluginや型情報を使うruleを同じ意味で置き換えるものではない。

## 採用判断は、速度よりrule coverageで行う

新規のTypeScript projectで、標準的なformat、bug pattern、import整理が中心ならBiomeだけで始めやすい。既存projectでframework plugin、社内custom rule、type-aware lintが品質gateになっているなら、Biomeへ完全移行する前にcoverageを表へする。formatterだけBiomeへ移す、重なるruleだけ移すという併用も可能だ。

公式のlanguage supportではJavaScript、TypeScript、JSX、TSX、JSON、JSONC、CSSがparse・format・lintを広くsupportする。一方、HTML、SVG、Vue、Svelte、Astroにはexperimentalな領域がある。file拡張子が読めることと、productionの全syntaxを安全にformatできることを同一視しない。

| 観点 | Biome | ESLint + Prettier | 判断 |
| --- | --- | --- | --- |
| 設定とbinary | 一体 | 別々 | 入口の少なさはBiome |
| plugin ecosystem | 拡大中 | 非常に広い | 特殊ruleは既存構成を確認 |
| formatとlintの競合 | 同一toolで抑えやすい | 設定調整が必要 | 大規模formatでは差が出る |
| migration | CLIで設定変換を支援 | 既存資産をそのまま利用 | 自動変換後の差分reviewが必須 |

## v2.5.14で、check・write・ESLint移行を確認した

2026年9月17日、macOS x86_64の一時directoryでBiome 2.5.14をnpmの一時cacheから実行した。意図的にformatを崩したJavaScript fileへ`biome check`を実行すると、変更せず差分を表示し、errorで終了した。`biome check --write`は1 fileを修正し、semicolon、space、indentを適用した。

次にflat形式の`eslint.config.js`へ`no-console: warn`と`no-unused-vars: error`を定義し、`biome migrate eslint --write`を実行した。出力では2 rule中2 rule、100%がdirect migrationされ、`noConsole`と`noUnusedVariables`がbiome.jsonへ入った。これは小さなsampleの結果であり、実projectの移行率を保証しない。pluginとoptionが増えるほど差分確認が重要になる。

| 確認 | 結果 | 意味 |
| --- | --- | --- |
| Version | Biome 2.5.14 | 記事のcommandを実行した版 |
| check | format差分を示して非0終了 | CI用の読み取り検査に使える |
| check --write | 1 fileを修正 | 変更commandを分離できる |
| ESLint migration | 2 / 2 ruleを変換 | 単純ruleでは自動移行を確認 |

## project dependencyとしてversionを固定する

公式guideは、projectごとのdev dependencyとしてexact versionを入れる方法を勧める。global installだけに依存すると、memberやCIでformatter結果が変わる可能性がある。`biome init`で設定を作り、まず狭いdirectoryへcheckをかける。

localでは`check --write`、CIではfileを書き換えない`ci`を使う。package.jsonへ`check`と`fix`を分ければ、自動処理が意図せず大規模formatをcommitするのを避けやすい。editor extensionもproject binaryと設定を使うよう揃える。

新規projectへ固定versionで追加

```shell
npm install --save-dev --save-exact @biomejs/biome
npx biome init
npx biome check src
npx biome check --write src
npx biome ci src
```

## checkとfixを別scriptにする

format、lint、assistをまとめて確認できるのが`check`だ。だが、CIで自動修正まで行うと、失敗を検出するjobがrepositoryを書き換える責務も持つ。読み取りの`biome ci .`と、人が明示的に呼ぶ`biome check --write .`を分ける。

大規模repositoryでは対象fileとignoreを先に確認する。generated code、vendor、build outputへformatをかけると、巨大なdiffや壊れたartifactを作る。VCS integrationを有効にし、既存ignoreとの関係をtestする。

package.json scripts

```json
{
  "scripts": {
    "check": "biome ci .",
    "fix": "biome check --write ."
  }
}
```

## ESLint・Prettier移行は、変換後からが本番

`biome migrate eslint --write`はlegacyとflat configを読み、共有設定やplugin設定も可能な範囲で変換する。だがYAML形式のESLint設定は未supportで、inspired ruleは既定では移行せず`--include-inspired`が必要だ。公式も、rule optionや実装差により完全に同じ挙動にはならないと明記している。

Prettier設定もmigration commandがあるが、format結果が完全一致するとは限らない。安全な順番は、設定変換、対象directory限定のcheck、既存toolとの結果比較、format-only PR、CI追加、旧tool削除だ。機能変更と全file formatを同じPRへ混ぜない。

作業branchで移行差分を作る

```shell
npx biome migrate eslint --write
npx biome migrate prettier --write
npx biome check src
npm run test
npm run build
git diff -- biome.json package.json src
```

## ESLintを残す判断も正しい

Biomeに対応ruleがあっても、optionやdiagnostic timingが異なる場合がある。framework固有plugin、型checkerと連携するrule、組織custom ruleが事故を防いでいるなら、その部分はESLintへ残す。tool数を一つにすることより、既存の品質保証を落とさないことが優先だ。

併用する場合は責務を重ねない。formatterはBiome、特殊lintだけESLintと決め、同じruleを二重実行しない。CIの順序とfailure messageを明確にし、将来の削除条件をissueへ残す。暫定構成が無期限に増殖するのを防ぐ。

## 導入checklist

まず代表的な100〜500 fileでformat差分、lint finding、実行時間を比べる。次に、既存ESLint ruleを必須、代替可能、不要へ分類する。Biomeのmigration reportは出発点であり、0件のerrorが品質同等を意味するわけではない。

採用後はexact versionを更新するprocessを決め、release noteとformat差分を確認する。formatter upgradeで全fileが変わる場合は独立PRにする。速いtoolを入れることではなく、editorからCIまで一つの規則で安定して動くことを完了条件にする。

- project dependencyとしてexact versionを固定する
- checkとwriteを別commandにする
- language supportと必須plugin ruleを棚卸しする
- migration後にtestとbuildまで通す
- 大規模format差分を機能変更から分離する

## 制約と未検証範囲

- Biome 2.5.14を使った小規模な使い捨てprojectで確認し、大規模monorepo移行、framework固有pluginの代替、性能比較は検証していない。

## 確認したもの

- [Getting Started — Biome](https://biomejs.dev/guides/getting-started/)
- [Migrate from ESLint and Prettier](https://biomejs.dev/guides/migrate-eslint-prettier/)
- [Language support — Biome](https://biomejs.dev/internals/language-support/)
- [Biome CLI reference](https://biomejs.dev/reference/cli/)
