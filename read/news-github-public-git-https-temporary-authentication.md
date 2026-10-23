# GitHub、公開リポジトリの一部のHTTPS取得で一時的に認証を要求。CIは取得経路の確認を

YAMASHI TECH AI Editorial Desk | News | Industry / DevTools / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/news-github-public-git-https-temporary-authentication) · [原稿データ](../articles/news-github-public-git-https-temporary-authentication.json)

公開: 2026-10-20 / 更新: 2026-10-23 / 確認: 2026-10-23

GitHubは2026年10月19日、異常な通信がある期間に、一部の未認証HTTPS clone・fetchへ認証を求める場合があると告知した。公開状態は変わらない。自動ビルドでは認証方法と、保護解除後の再試行を用意する。

## 公開のままでも、cloneやfetchに認証を求められる場合がある

GitHubは2026年10月19日、異常な通信からgithub.comの可用性を守るため、一部の公開リポジトリのHTTPS clone・fetchで、一時的に認証を要求する場合があると発表した。対象の操作は、認証が必要だと分かるメッセージを伴って失敗する。

利用者が取れる方法は二つある。認証して再試行するか、一時的な保護が解除されたあとに未認証で再試行する。公開リポジトリ全体を恒久的に認証必須へ変えるものではない。

GitHubは適用範囲をできるだけ狭くすると説明している。ただし、正当な通信と異常な通信が同じ特徴を持つ場合には、通常の取得も影響を受けることがある。取得に失敗しても、リポジトリが非公開になったと決めつけず、表示されたエラーを読む必要がある。

## 影響するのは未認証HTTPS。SSHや認証済み取得は対象外

確認したいのは、CI、Dockerfile、初期設定スクリプトなどで公開ソースを未認証のHTTPS経由で取得している箇所だ。毎回ソースを取り直すビルドでは、一つの取得失敗が後の処理を止める。

今回の保護はgithub.com上の公開リポジトリに全プラン共通で適用される。認証済みのHTTPS操作、SSH、push、無関係なWeb・API通信は対象外だ。GitHub Enterprise Serverやパッケージレジストリへ同じ変更が入るという告知ではない。

今回の一時保護が影響する取得方法

| 操作 | 今回の扱い |
| --- | --- |
| 未認証HTTPSのclone・fetch | 一部で一時的に認証を要求 |
| 認証済みHTTPSのGit操作 | 対象外 |
| SSHのGit操作・push | 対象外 |
| 無関係なGitHub Web・API通信 | 対象外 |

## CIの認証は、ActionsのトークンかGitHub Appから選ぶ

自動取得を安定させるため、GitHubはGitHub Actionsでは組み込みのGITHUB_TOKEN、他のCIではGitHub Appのinstallation access tokenを推奨している。personal access tokenも利用できる。

GITHUB_TOKENはジョブごとに発行され、権限はそのワークフローがあるリポジトリに限定される。別リポジトリの取得まで同じ権限で扱えるとは限らないため、取得先と認証主体を対応させる。

GitHub Appのinstallation access tokenは、インストール先の範囲内でリポジトリと権限を絞れ、有効期間は1時間だ。取得だけなら読み取り権限を使い、トークンをremote URLやログへ残さない渡し方にする。自動化で既に使っている認証の仕組みがあれば、その権限と対象を確認するところから始められる。

## 再試行は同じソースへ戻し、回数と待ち時間に上限を設ける

認証できない処理は、保護が解除されてから再試行する。GitHubは保護の適用時間や推奨の再試行間隔を示していないため、すぐ何度も取得を繰り返す実装は避ける。下の例は、試行回数と合計時間に上限を置く設計案だ。

ビルドの再現性が必要なら、再試行でも同じcommitを取得する。ブランチの先端を取り直すと、待っている間に別の変更が含まれることがある。キャッシュを使う場合も、どのcommitのソースかを残しておけば、取得方法が変わっても内容を照合できる。

最初の対応は、未認証の取得箇所、取得先、認証の有無、失敗時の動作を一度並べることだ。認証が必要というエラーと、DNSや権限不足などの別の失敗を分けて記録すると、止まったビルドを復旧しやすくなる。

再試行の設計例。GitHubが指定した回数・間隔ではなく、編集部の案。未実行。

```text
target = immutable_commit
attempts = 3
retry = exponential_backoff_with_jitter
fallback = authenticated_read_only_clone_if_configured
stop = deadline or unexpected_error
record = commit, transport, attempts, final_status
```

## 制約と未検証範囲

- 2026年10月19日の公式告知と、10月23日確認のGitHub Docsに基づく。防御を発火させる試験、トークン発行、認証済みclone、CIの実行は行っていない。
- GitHubは具体的な判定条件、適用時間、再試行間隔を公表していない。掲載した再試行の値は設計例。

## 確認したもの

- [GitHub Changelog：一時認証の対象と対処（2026年10月19日）](https://github.blog/changelog/2026-10-19-some-git-over-https-may-temporarily-require-authentication/)
- [GitHub Docs：GITHUB_TOKENの発行とリポジトリの権限範囲](https://docs.github.com/en/actions/concepts/security/github_token)
- [GitHub Docs：installation access tokenの権限と1時間の有効期間](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
