# GitHub Actionsにロックファイル。タグを読みやすく残し、実行コードを固定する

YAMASHI TECH AI Editorial Desk | News | DevTools / Software Engineering / Security

[掲載ページ](https://yamashi-tech.com/articles/news-github-actions-workflow-lockfiles-public-preview) · [原稿データ](../articles/news-github-actions-workflow-lockfiles-public-preview.json)

公開: 2026-10-15 / 更新: 2026-10-23 / 確認: 2026-10-23

GitHub Actionsは、タグやブランチで指定したアクションの実行コミットをロックファイルへ固定する機能をプレビュー公開した。間接依存と配布元の識別情報も記録し、Dependabotの更新と一緒にレビューできる。

## タグの移動で、レビューしたコードが変わるのを防ぐ

GitHubは2026年10月14日、GitHub Actionsのワークフロー依存ロックファイルをPublic Previewとして発表した。例えばusesにアクションのv3タグを書いていても、そのタグの指す先が移動すれば、次の実行で別のコードを取得する可能性がある。ロックファイルは、レビュー時に選んだコミットを実行へ使い続ける仕組みだ。

これまで推奨されてきた、ワークフローへ完全なコミットSHAを直接書く方法と、固定する目的は共通する。新方式ではタグ名などを読みやすく残し、具体的に実行するコミットを.github/workflows/actions.lockへ分けて記録する。依存先の変更を一か所で確認しやすくなる。

## コミットに加え、配布元と間接依存も記録する

ロックファイルは、各ワークフローが使う依存関係と、参照名から解決したコミットを持つ。配布元のowner_idとrepo_idも記録し、名前の背後にあるリポジトリが同じかを実行時に確かめる。

アクションがさらに使うアクションも固定対象になる。一方、再利用可能ワークフローの内部依存は、そのワークフローを定義するリポジトリ側で管理する。組織共通のワークフローがある場合は、まず定義元から導入すると、利用側だけ固定して内部が変わり続ける状態を避けやすい。

対象に登録したワークフローでは、必要な依存がすべてロックファイルに存在しなければ実行できない。GitHub Actionsはタグの現在値ではなく、記録したコミットを使う。固定先のコードを安全と判断するレビュー自体は、導入前後とも必要だ。

## 生成はCLIへ任せ、ワークフローを含む差分をレビューする

ファイルはGitHub CLIのactions-lock拡張で生成し、手編集しない。すべてを一度に切り替えず、一つのワークフローだけ対象にすることもできる。次は公式資料の手順例で、編集部では実行していない。

生成時にはワークフローも書き換わる。例えばv3が解決済みのv3.1.0になり、同じリポジトリ内の相対参照は、実行中のコミットへ固定される$/…へ変わる。ロックファイルだけでなく、action.ymlなども含む差分全体を確認する。

許可済みアクションの制限も、導入後は固定コミットを基準に判定する。タグに限定した許可設定が合わなくなる場合があるため、生成と同時に既存の許可規則を照合する。

未実行の導入例。拡張の導入と、対象リポジトリのファイル変更を伴う。

```bash
gh extension install github/gh-actions-lock

# 一つのワークフローを対象にロックファイルを生成
gh actions-lock .github/workflows/ci.yml

# 変更せず、ロックファイルの更新漏れを検査
gh actions-lock --verify
```

## 更新・検査・必須化を一緒に運用する

対象ワークフローのアクションをDependabotが更新すると、対応するロック情報も同じPRで更新する。ただし、未登録のワークフローを自動で登録する機能ではない。新しい依存やワークフローを追加したときは、CLIで生成し直す。

コミットが変わった差分は依存バージョン更新として読み、owner_idやrepo_idが変わった場合は配布元の変化を調べる。移動したタグを受け入れるための再解決操作もあるが、単にエラーを消す目的で使わず、移動した理由を確認する。

Require lockfileポリシーを使うと、対象の未登録ワークフローの実行を止められる。更新漏れの検査と、ファイルを維持する流れが整ってから広げるのがよい。発表の対象プランはEnterprise Cloud、データ所在地対応版、Team、Free。一方、管理ガイドにはEnterprise Cloud表記やEnterprise限定のEvaluateモードもあるため、利用する管理機能の条件は区別して読む。

## 制約と未検証範囲

- Public Previewの公式発表とガイドを10月23日に照合した。拡張の導入、ロックファイル生成、Actions実行、Dependabotやポリシーの設定変更は行っていない。
- ロックファイルは実行コードと配布元を固定する仕組み。アクションの権限、秘密情報、実行環境の安全性まで確認するものではない。

## 確認したもの

- [GitHub Changelog — GitHub Actions workflow lockfiles in public preview (2026-10-14)](https://github.blog/changelog/2026-10-14-github-actions-workflow-lockfiles-in-public-preview/)
- [GitHub Docs — Workflow dependency lockfiles (Public Preview, checked 2026-10-23)](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)
- [GitHub Docs — Locking action dependencies in a repository's workflows (checked 2026-10-23)](https://docs.github.com/en/actions/how-tos/secure-your-work/lock-workflow-dependencies)
- [GitHub Docs — Enforcing lockfiles for action dependencies (checked 2026-10-23)](https://docs.github.com/en/actions/how-tos/administer/enforce-workflow-lockfiles)
