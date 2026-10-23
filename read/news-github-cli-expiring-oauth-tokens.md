# GitHub CLIに期限付きOAuth認証：tokenを使い回すスクリプトは何を見直すべきか

YAMASHI TECH AI Editorial Desk | News | DevTools / Security / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/news-github-cli-expiring-oauth-tokens) · [原稿データ](../articles/news-github-cli-expiring-oauth-tokens.json)

公開: 2026-10-23 / 更新: 2026-10-23 / 確認: 2026-10-23

GitHubは10月21日、GitHub CLI 2.103.0から期限付きOAuth認証を選べるPublic Previewを発表した。保存した認証情報の自動更新と、外部へ取り出したtokenの寿命は別に考える必要がある。対象version、Gitのcredential helper、環境変数で渡すtokenの扱いを整理する。

## 要点：自動更新されるのは、ghが管理する認証情報

GitHub CLIの新しい認証方式は、開発端末で長期間有効なaccess tokenを持ち続ける運用を見直す選択肢になる。一方、ghから一度取り出したtokenを別のスクリプトへ固定して渡す構成では、その値がいつまでも使えるとは考えられなくなる。導入判断では、ログインの成功だけでなく、誰がtokenを取得し直すのかまで確認したい。

この記事が答えるのは「新しい認証に切り替えると、普段のGit操作や自動処理のどこが変わるか」だ。新方式へのログインやtokenの更新は実行していない。公式資料で確認した仕様と、手元のCLIのversion・helpを観測した結果を分けて説明する。

- GitHub CLI 2.103.0以降の選択制のPublic Preview。既存のログインや手動で渡すtokenを一括変換する変更ではない。
- HTTPSのGit操作ではghをcredential helperとして使う経路を確認する。Git 2.46以降は推奨であり、古いGitがすべて動作不能になるという発表ではない。
- 一度取得したaccess tokenの保存・再利用と、GH_TOKENなどで渡すtokenを点検する。環境変数由来のtokenは、この機能で自動更新されない。

## 何が発表されたか：期限付きaccess tokenと更新用tokenを組み合わせる

GitHubは、公式Changelogの表記で2026年10月21日、期限付きで自動更新されるOAuth認証情報をGitHub CLIから選べると発表した。同日公開のGitHub CLI v2.103.0のrelease notesにも、この機能がPreviewとして記載されている。発表日はGitHubの表記、この記事の確認日は日本時間の10月23日である。通常版CLIのreleaseと、認証機能自体のPreviewという位置付けは分けて読む必要がある。

選択すると、ghは期限付きaccess tokenと、ローテーションするrefresh tokenを保存する。access tokenはAPIなどへのアクセスに使う値、refresh tokenは新しいaccess tokenを得るための値だ。必要に応じてghが更新を行うため、通常の利用で毎回対話ログインを繰り返すための機能ではない。

発表は、漏えいしたaccess tokenが無期限に利用可能な状態を減らす利点を説明している。ただし、この記事では寿命を一律に何時間と固定しない。更新用の認証情報も保管する仕組みであり、端末や保存先が侵害された場合の影響を、この発表だけで解消できると評価してはいけない。後半は、仕組みから導く編集部のセキュリティ上の注意点である。

## 以前との違い：flagを付けても発行結果はホストに依存する

ログイン時の選択には gh auth login --expiring を使う。毎回のサインインで期限付き認証を優先したい場合には、expiring_credentials設定を有効にする方法も公式に示されている。ただし、設定を変える前に一つのホスト・一つの作業環境で確認する進め方を編集部は勧める。

重要なのは、--expiringが期限付き認証を要求する指定だという点だ。現在のlogin manualは、実際の発行がホストとOAuth appの設定に依存すると説明する。対応しないホストでは期限のないtokenへフォールバックし、ホスト側の設定によってはflagなしでも期限付きtokenが発行される場合がある。flagの有無だけを見て、保存されたtokenの種類を決め付けない。

発表ではgithub.comとghe.comで利用でき、GitHub Enterprise Serverは3.23から対応するとされる。利用するホストの提供形態とversionを確認することが先である。既存のログインや手動指定tokenがそのまま使えるという互換性の説明は、既存tokenの寿命が自動的に短くなるという意味ではない。

## 影響を受ける経路を、CLI・Git・外部スクリプトに分ける

gh自身が保存した認証情報を使う場合と、別のプログラムが文字列として受け取ったtokenを使う場合では、更新を担当する場所が異なる。公式release notesは、GH_TOKENまたはGITHUB_TOKENで供給されたtokenを自動更新しないと明記している。新しいCLIを入れたことだけを理由に、環境変数へ置いたtokenまで更新されると考えない。

HTTPSのGit操作では、ghをGitのcredential helper、つまり認証情報の供給役として使う経路を確認する。公式のsetup-git manualでは、既定で認証済みの全ホストを対象とし、--hostnameで一つに絞れると説明されている。共有端末や複数ホストの環境では、どの設定へ影響する操作なのかを先に把握したい。

公式仕様に基づく経路の違いと、編集部が勧める確認点

| 利用経路 | 更新に関する境界 | 確認すること |
| --- | --- | --- |
| ghが保存OAuth認証を利用 | 対応する期限付き認証情報をghが必要時に更新 | 利用ホストと発行された認証方式を確認する |
| HTTPSのGit＋ghのhelper | Gitが認証情報を求めたときにghが供給する | helperの経路と他のcacheの関与を確認する |
| 外部処理がtokenの文字列を保存 | 保存した文字列自体は差し替わらない | 必要時に取得し直せる設計かを確認する |
| GH_TOKEN / GITHUB_TOKENを指定 | その環境変数由来のtokenはghが自動更新しない | tokenの発行元・寿命・更新担当を確認する |

## Git 2.46以降の推奨を、必須versionと混同しない

GitHubはGit 2.46以降への更新を推奨している。このversion以降では、ghが期限付きcredentialをcache対象にしないよう指定でき、別のcredential caching helperが期限を過ぎて使い回す問題を避けやすくなる。古いGitでもghは動作し、更新を勧める案内が出るという説明である。

したがって「Gitが2.46未満なら新方式は利用できない」という読み方は強すぎる。一方、古いGitで動いたからといって、組織内のすべてのhelper構成で期限切れ後も問題がないと判断することもできない。編集部の提案は、Gitのversionとcredential経路を同じ確認項目に入れることだ。

確認対象には、個人端末だけでなく、開発container、共用VM、リモート開発環境も含まれる。同じrepositoryを触っていても、それぞれ別のCLIやGit、認証情報を使うことがあるためだ。これは移行時の確認範囲についての提案であり、これらの環境で障害が発生したという報告ではない。

## 今できること：まず認証を変更しない確認から始める

最初はversionとhelpを見るだけでよい。次の3コマンドは今回の編集部環境で実行した。OSはDarwin x86_64、ghは2.69.0、Gitは2.49.0だった。古いghのlogin helpに--expiringがないことを確認しており、この環境で新しいflagの動作を検証したとは扱わない。

ここから判断できるのは、手元のCLIをそのまま新機能の検証環境に使えないということだ。Gitだけが推奨versionを満たしていても、ghの対応versionの確認は省略できない。今回、記事を書くために既存のghを更新したり、ログインを変更したりはしていない。

実行済み：versionとhelpの表示だけで、ログイン・設定変更は行わない

```bash
gh --version
git --version
gh auth login --help
```

## 導入例と見送り条件：tokenを先に取り出す処理を棚卸しする

次は公式仕様に沿った導入例であり、今回実行した手順ではない。対応するghを用意し、github.comで期限付き認証を選ぶことと、そのホストのGit helper設定を変更することを、それぞれ理解したうえで実行する。既存の認証・Git設定へ影響するため、共有環境へそのまま適用するための一括移行スクリプトではない。

先に棚卸ししたいのは、起動時に一度だけ gh auth token の出力を保存して、同じ値を長時間使う処理や、tokenを別の端末・toolへコピーする処理だ。token manualは、対応する認証情報が期限切れまたは期限間近なら、出力前に更新すると説明する。必要時に取得し直す経路と、取得した後の値をcacheしない扱いを確認したい。tokenを標準出力へ表示するコマンドなので、秘密をlogや画面共有へ出さない配慮も必要になる。

長時間固定のtokenを前提とし、取得し直す経路をまだ用意できない処理では、切替を急がず見送る判断もある。これは認証情報を無期限に放置してよいという提案ではなく、更新責任と失敗時の対応を明確にしてから移行するという順序の提案だ。GitHub Actionsなどの非対話処理は、利用中のtokenの発行元と権限を別に確認し、新しい対話ログイン方式へ一律に置き換えない。

資料に基づく未実行例：認証とGit設定を変更するため、対象ホストと影響を確認してから使う

```bash
# gh 2.103.0以降と、対象ホストの対応を事前に確認する
# 以下は今回の編集部検証では実行していない
gh auth login --hostname github.com --expiring
gh auth setup-git --hostname github.com
```

## まだ分からないことと、次に確認する条件

今回確認したのは公式Changelog、v2.103.0のrelease notes、認証ガイド、各コマンドのmanualと、旧versionのローカルhelpである。実際の新方式でのログイン、access tokenの期限到達、refresh tokenのローテーション、Git操作の継続、組織ごとのホスト設定は試していない。Public Previewの提供状況や仕様は今後変わり得る。

導入前には、使うghのrelease notes、利用ホストの対応、credential helperの構成を再確認する。Previewから正式提供へ変わる、期限付き認証が新規サインインの既定になる、scope変更やstatus表示の挙動が変わる、という場合も記事を見直す条件になる。

導入可否を決める観点は、単に期限が短くなるかではなく、tokenを必要な時点で供給する責任をどこに置くかだ。個人のCLI、HTTPSのGit、外部処理の境界を一つずつ確認できるなら段階的に試しやすい。確認できない経路が残る場合は、その箇所を未検証として残し、移行完了とは扱わない。

## 制約と未検証範囲

- 2026-10-23時点の公式資料を確認したNews。Public Previewの新しい認証方式を使ったログイン・期限切れ・自動更新の実接続試験は行っていない。
- ローカルで実行したのは既存gh 2.69.0とGit 2.49.0のversion、login helpの表示だけ。新しいCLIの導入や、既存の認証・Git設定の変更は行っていない。
- GitHub.com、ghe.com、GitHub Enterprise Server 3.23の各ホストや、組織のOAuth app設定・credential helper構成を網羅して検証したものではない。

## 確認したもの

- [GitHub Changelog（2026-10-21）：GitHub CLI: Opt in to expiring, auto-refreshing OAuth tokens](https://github.blog/changelog/2026-10-21-github-cli-opt-in-to-expiring-auto-refreshing-oauth-tokens/)
- [GitHub CLI v2.103.0 release notes：Preview、環境変数tokenの除外、Gitの推奨version](https://github.com/cli/cli/releases/tag/v2.103.0)
- [GitHub Docs：Authenticating with GitHub CLI](https://docs.github.com/en/github-cli/github-cli/authenticating-with-github-cli)
- [GitHub CLI manual：gh auth login（ホスト依存、--expiring、保存先）](https://cli.github.com/manual/gh_auth_login)
- [GitHub CLI manual：gh auth setup-git（対象ホストとcredential helper）](https://cli.github.com/manual/gh_auth_setup-git)
- [GitHub CLI manual：gh auth token（必要時の更新とtokenの出力）](https://cli.github.com/manual/gh_auth_token)
