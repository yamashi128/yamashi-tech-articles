# GitHubのSSH要件が変更。新規RSA鍵は3072bit以上、SHA-1署名は2027年1月廃止

YAMASHI TECH AI Editorial Desk | News | Security / DevTools / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/news-github-ssh-security-changes-2026) · [原稿データ](../articles/news-github-ssh-security-changes-2026.json)

公開: 2026-10-20 / 更新: 2026-10-23 / 確認: 2026-10-23

GitHubは新規RSA鍵の最小長を3072bitに変更し、SHA-1を使うssh-rsa署名などを2027年1月13日に廃止する。既存RSA鍵はSHA-2署名で使えるため、全交換の前に利用クライアントと署名方式を確認したい。

## 11月と12月の一時停止を経て、2027年1月に古い方式を廃止

GitHubが2026年9月22日に告知したSSHの変更は、鍵の長さ、署名、鍵交換の三つに関わる。10月14日から新しくアップロードするRSA鍵は、認証用・署名用とも3072bit以上が必要になった。

次は、SHA-1を使うssh-rsa署名と、diffie-hellman-group-exchange-sha256という鍵交換方式を廃止する。2026年11月4日と12月9日に一時的な停止試験（brownout）を行い、2027年1月13日に削除する予定だ。古いクライアントを残すCIやデプロイ環境は、それまでに対応が必要になる。

公式告知の予定。2026年10月23日再確認

| 日付 | 変更 |
| --- | --- |
| 2026年10月14日 | 新規RSA鍵は3072bit以上。ML-KEMの新しい鍵交換も追加 |
| 2026年11月4日 | ssh-rsa署名と旧鍵交換の一時停止試験 |
| 2026年12月9日 | 二回目の一時停止試験 |
| 2027年1月13日 | ssh-rsa署名と旧鍵交換を削除 |

## RSA鍵があるだけでは、作り直す必要はない

混同しやすいのは、ssh-rsaという文字列の意味だ。公開鍵ファイルの先頭ではRSAという鍵の種類を表す一方、廃止対象の署名名では「RSAとSHA-1の組み合わせ」を表す。id_rsaという名前のファイルがあるだけで、SHA-1を使用中とは判断できない。

既存のRSA鍵でも、rsa-sha2-256やrsa-sha2-512というSHA-2署名を使える。GitHubは、クライアントが対応していれば、既存鍵を作り直さずに利用できると説明している。まず調べるのは鍵を使うソフトウェアと、その設定だ。

公式告知は、標準設定でRSAとSHA-2を使うための目安としてOpenSSH 7.2p1、libssh2 1.11.0、PuTTY 0.82などを挙げる。ターミナルのSSHだけでなく、IDEやCI製品に組み込まれた別のSSHライブラリも対象に含めると、確認漏れを減らせる。

## 開発端末とCIで、SSHを使う接続を洗い出す

影響するのは、SSHでGitへ接続する利用者と、GitHub Enterprise Serverで未認証のGitプロトコルを使う利用者だ。remote URLがhttps://で始まる接続には、今回のSSH方式の変更は直接影響しない。

手元の端末に加え、CI、デプロイ、ミラー、submoduleを取得する環境も確認する。下のコマンドは、remote、SSHのバージョン、クライアントが対応する方式、ssh-agentの鍵のfingerprintを調べる例だ。対応方式の一覧は、その接続で実際に選ばれた方式とは区別する。

接続試験に使う公式コマンドはssh -T git@github.com。GitHubはシェルを提供しないため、認証に成功しても終了コードは1になる。成功メッセージに意図したユーザー名があるかも確認する。初回接続では、表示されたホスト鍵のfingerprintを公式情報と照合する。

状態を読む手順例。編集部では認証接続を実行していない。

```shell
git remote -v
ssh -V
ssh -Q key
ssh -Q sig
ssh -Q kex
ssh-add -l -E sha256

# GitHubへの認証接続を試す場合
ssh -T git@github.com
```

## 鍵交換の追加と、GitHub Enterpriseの適用範囲も確認する

10月14日には、ML-KEMとX25519を組み合わせた鍵交換mlkem768x25519-sha256も追加された。github.comとGitHub Enterprise Cloud with Data Residencyが対象で、後者の米国リージョンは例外として記載されている。これは通信の鍵を共有する方法の更新であり、利用者が持つ認証鍵の交換とは別の話だ。

GitHub Enterprise Serverでは、新しい鍵交換は3.24、その他の変更は3.25へ入ると告知されている。github.comの日付と、自社サーバーのバージョンを分けて計画する。

新しい認証鍵が必要なら、GitHub Docsは通常Ed25519、未対応の古い環境ではRSA 4096bitを例示している。追加して接続を確かめ、必要なジョブを切り替えてから旧鍵を外す順序にすると、使える接続を残しながら移行できる。まずは11月4日の停止試験に向け、古いクライアントやSHA-1を強制する設定を見つけて直すことが実務の対応になる。

## 制約と未検証範囲

- 2026年9月22日の公式告知と10月23日確認のGitHub Docsに基づく。アカウントの鍵、デプロイ鍵、実際の署名交渉、GitHubへの認証接続は検証していない。
- 公開鍵の種類と使用する署名方式は別。停止予定、対象リージョン、GitHub Enterprise Serverの適用バージョンは公式告知に従う。

## 確認したもの

- [GitHub Changelog：SSH方式、日程、クライアント、Enterpriseの条件（2026年9月22日）](https://github.blog/changelog/2026-09-22-security-improvements-for-ssh/)
- [GitHub Docs：既存SSH鍵の確認](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/checking-for-existing-ssh-keys)
- [GitHub Docs：接続試験と、成功時の終了コード1](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/testing-your-ssh-connection)
- [GitHub Docs：新しい鍵の生成、Ed25519とRSA 4096bit](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
