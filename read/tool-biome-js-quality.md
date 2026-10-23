# Biome入門：整形・lint・import整理を一つのコマンドへまとめる

YAMASHI TECH AI Editorial Desk | Deep Dive | DevTools / TypeScript

[掲載ページ](https://yamashi-tech.com/articles/tool-biome-js-quality) · [原稿データ](../articles/tool-biome-js-quality.json)

公開: 2026-09-17 / 更新: 2026-10-23 / 確認: 2026-10-23

BiomeはJavaScript・TypeScriptの整形と静的検査をまとめる。導入、読み取り検査と自動修正の分離、ESLint・Prettier設定の移行を具体例で説明し、既存ルールを残す判断まで整理する。

## formatterとlinterを同じ設定で動かす

Biomeは、コード整形、lint、import整理を一つのツールで実行する。JavaScript・TypeScriptのプロジェクトなら、`biome check`でまとめて確認し、`biome check --write`で修正できる。設定ファイルも`biome.json`へ集約でき、エディターとCIで別々の設定を維持する負担を減らせる。

PrettierとESLintの組み合わせですでに必要な検査が揃っている場合は、設定を一つにする利点と、移せないルールを比べる。採用の判断で先に見るべきなのは、速さの印象より、今の品質検査をどこまで引き継げるかだ。

## プロジェクトへ導入し、検査と修正を分ける

dev dependencyへexact versionで入れると、開発者とCIで使う版を共有できる。`biome init`で設定を作り、まず`src`など小さな範囲を検査する。下のインストール例は実行時の版を固定保存する。過去の検証版2.5.14を再現したい場合は、パッケージ名の後ろに`@2.5.14`も指定する。

`check`は整形・lint・assistの検査をまとめ、`--write`で修正を適用する。CIにはファイルを書き換えない`biome ci`を使う。自動処理が突然全ファイルを整形しないよう、検査と修正を別のnpmスクリプトにすると使い分けが明確になる。

新規導入の例。依存追加、設定ファイル作成、--writeによるソース変更を伴う。

```shell
npm install --save-dev --save-exact @biomejs/biome
npx biome init
npx biome check src
npx biome check --write src
npx biome ci src
```

## 読み取りのcheckと、書き込むfixを用意する

エディターからもCIからも、同じプロジェクトのBiomeを使う。下の`check`は検査だけ、`fix`は変更を適用する入口だ。失敗時に「検査が見つけた差分」なのか「修正した差分」なのかを区別しやすい。

導入時は生成コード、vendor、ビルド出力の扱いも決める。既存のignoreとVCS連携を確認し、検査したいソースだけが対象になるようにする。全体のformatを適用するなら、機能変更とは別の差分に分けるとレビューしやすい。

package.json scripts

```json
{
  "scripts": {
    "check": "biome ci .",
    "fix": "biome check --write ."
  }
}
```

## 小さなプロジェクトでは、整形と2ルールの移行を確認した

2026年9月17日、macOS x86_64の一時ディレクトリでBiome 2.5.14を実行した。整形を崩したJavaScriptへ`biome check`をかけると、ファイルを変更せず差分を示して非0で終了した。`biome check --write`では1ファイルが修正され、semicolon、空白、indentが整った。

続いてflat形式のESLint設定に、`no-console: warn`と`no-unused-vars: error`を定義して移行した。レポートは2ルール中2ルール、100%のdirect migrationとなり、`noConsole`と`noUnusedVariables`が設定へ入った。ここでの100%はこの2ルールに限った結果で、実際のリポジトリの移行率ではない。

| 確認 | 結果 | 意味 |
| --- | --- | --- |
| Version | Biome 2.5.14 | 記事のcommandを実行した版 |
| check | format差分を示して非0終了 | CI用の読み取り検査に使える |
| check --write | 1 fileを修正 | 変更commandを分離できる |
| ESLint migration | 2 / 2 ruleを変換 | 単純ruleでは自動移行を確認 |

## ESLint・Prettierからは、設定変換と挙動比較を進める

`biome migrate eslint --write`と`biome migrate prettier --write`で設定の移行を始められる。ESLintのlegacy・flat設定や共有設定の変換に対応するが、変換できたルールでも、すべてのオプションや挙動が一致するとは限らない。既定では直接対応するルールを移し、元ルールを参考にした別実装まで含めるには`--include-inspired`を使う。

移行後は、必須ルール、代替できるルール、不要なルールに分け、代表的なファイルで旧ツールと診断を比較する。たとえば100〜500ファイル程度を対象に、format差分、診断、実行時間を見る方法がある。この件数は編集部の導入案で、ツールの要件ではない。

formatterをBiomeへ移し、framework固有・社内独自の検査だけESLintへ残す構成も選べる。その場合は両方が同じ整形を戻し合わないように担当を決める。テストとビルドを通してから旧設定を削除する。

| 観点 | Biome | ESLint + Prettier |
| --- | --- | --- |
| 設定 | 整形・lint・import整理を集約 | 用途ごとに設定を管理 |
| 追加ルール | 対応ルール・拡張機能を確認 | 既存プラグイン資産を利用 |
| 移行 | CLIによる変換を支援 | 既存の挙動を維持しやすい |
| 採用時に見ること | 必要な診断が残るか | 設定とプラグインの保守負担 |

作業ブランチで設定を変換し、差分を確かめる例。

```shell
npx biome migrate eslint --write
npx biome migrate prettier --write
npx biome check src
npm run test
npm run build
git diff -- biome.json package.json src
```

## 対応言語と必須ルールが合えば、日常の検査をまとめやすい

2026年10月23日の公式対応表では、JavaScript、TypeScript、JSX、TSX、JSON、JSONC、CSSなどがparse・format・lintに対応する。Vue、Svelte、AstroやHTML・SVGには実験的な範囲が残る。拡張子の認識だけでなく、使っている構文と機能の対応を確認する。

Biomeが向くのは、標準的な整形と静的検査を簡潔な入口へ揃えたいプロジェクトだ。既存ESLintの必須ルールを代替できるかを先に調べ、段階的な併用も含めて選べばよい。採用後はexact versionを更新するたびに診断とformatの差分を確認し、大規模な整形変更は単独でレビューする。

## 制約と未検証範囲

- 実行結果は2026年9月17日のmacOS x86_64・Biome 2.5.14による既存の小規模検証。2026年10月23日は公式資料と対応表を再確認した。大規模移行、frameworkプラグインの代替、性能比較は試していない。

## 確認したもの

- [Getting Started — Biome](https://biomejs.dev/installation/quick-start/)
- [Migrate from ESLint and Prettier](https://biomejs.dev/installation/migrate-from-other-tools/)
- [Language support — Biome](https://biomejs.dev/introduction/language-support/)
- [Biome CLI reference](https://biomejs.dev/reference/cli/)
