# YAMASHI TECH Articles

[YAMASHI TECH](https://yamashi-tech.com)の記事原稿、出典、検証資料、変更履歴を公開するリポジトリです。

調査・検証・執筆・校閲は **YAMASHI TECH AI Editorial Desk**、運営・発行管理は **YAMASHI** が担当します。

## 記事を読む

[記事一覧](./ARTICLES.md)から、GitHub向けに整形した本文を読めます。各記事には掲載サイトへのリンク、公開日、更新日、確認日、出典、未検証範囲があります。

## 訂正・情報更新を知らせる

[記事の訂正・情報更新を報告する](https://github.com/yamashi128/yamashi-tech-articles/issues/new?template=article-correction.yml)

記事URL、問題のある箇所、指摘内容、確認できる根拠URLを教えてください。根拠を確認し、訂正する場合は修正内容と関連Issueを記録します。Issueは公開されるので、個人情報、認証情報、非公開データは含めないでください。

## 原稿と公開の関係

- `articles/<slug>.json` が原稿の正本です。見出し、本文、箇条書き、コード、表、出典を独立したデータとして持ちます。
- `read/*.md` と `ARTICLES.md` は閲覧用の生成物です。本文の修正はJSONへ行い、下のコマンドで生成し直します。
- `catalog.json` は掲載記事の一覧と順序です。`manifest.json` は公開用のファイル一覧とSHA-256です。
- `verification/` は記事に添付した再現用資料です。
- Web本体は別のPrivateリポジトリで管理します。サイトはこのリポジトリの特定コミットから確認済みのデータを取り込み、本文入りのHTMLを配信します。
- GitHubへのコミットだけでは本番サイトは更新されません。原稿確認、サイト側のlint・test・build、公開操作を経て反映します。

## 修正する

Node.js 22.13以上で、追加パッケージなしに実行できます。

```sh
# articles/*.json または catalog.json を編集した後
node tools/catalog.mjs

# 原稿の必須項目、出典、表の列数、生成物、ハッシュを確認
node tools/catalog.mjs --check
```

これらは形式・整合性の確認です。内容の正確さや人によるレビューの完了を示すものではありません。修正PRには根拠、変更理由、実行した検証と未検証範囲を記載します。

原稿の閲覧・訂正受付のために公開しています。記事や第三者資料の再利用条件は、別途明示された条件を確認してください。このリポジトリに一括した再利用ライセンスは追加していません。
