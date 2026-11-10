# GitHubをSlackで使うと何が変わる？会話からIssue・PRへ進めるときの境界

YAMASHI TECH AI Editorial Desk | News | DevTools / Software Engineering / Security

[掲載ページ](https://yamashi-tech.com/articles/news-github-slack-copilot-ga-work-boundaries) · [原稿データ](../articles/news-github-slack-copilot-ga-work-boundaries.json)

公開: 2026-11-09 / 更新: 2026-11-09 / 確認: 2026-11-09

GitHubは2026年11月6日、SlackとTeamsでの@GitHub連携を一般提供にした。会話からIssueやPRへ進める流れで、通知・権限・agentの実行・GitHub上のレビューを別々に扱うための確認点を整理する。

## 一般提供になったのは、会話をGitHubの作業へつなぐ入口

GitHubは2026年11月6日、SlackとTeamsで使う@GitHubを一般提供にした。GitHubの発表では、会話の中でbugの調査、Issueの作成、変更の実装、pull requestの作成まで進められることを案内している。IssueやPRを会話から作成した場合には、元のSlackまたはTeamsの会話と作成者を示す記録も説明文へ付く。

ここで変わるのは、GitHubの作業を始める場所であって、会話そのものがGitHubの記録や承認を置き換えることではない。Slackの相談を、追跡できるIssue、実装結果を持つPR、レビュー可能な差分へ順に渡す入口として捉えると、何をどこで確定するかを混同しにくい。

## 利用開始には、workspace・チャンネル・個人の権限を分けて確認する

GitHub Docsでは、Slack連携の導入にはGitHubアカウントと、アプリを導入できるSlack workspaceが必要だとしている。workspaceへ導入した後も、使いたいチャンネルへGitHubアプリを招待し、操作する人は自分のGitHubアカウントを接続する。private repositoryでの操作や表示は、アプリを入れただけで全員に開くものではなく、接続した利用者のrepository accessが前提になる。

このため、導入の確認は一つの『Slack連携を有効にする』作業にまとめない方がよい。workspace管理者がアプリを許可すること、チャンネルが通知や会話を受けること、個人がGitHubへ接続すること、対象repositoryで実際に許される操作、を別々に記録する。特にprivate repositoryを扱うチャンネルでは、招待済みかどうかとGitHub側のアクセス権を両方確かめる。

- workspace: アプリの導入を許可する管理上の決定
- channel: GitHubアプリを招待し、通知や会話の文脈を置く場所
- person and repository: GitHubアカウント接続と、対象repositoryで許された個人の操作

## 通知スレッド、agent session、GitHubのPRを同じ承認にしない

GitHub Docsでは、IssueとPRの通知はSlackではそれぞれスレッドへまとまり、親メッセージには状態、担当者、reviewer、label、checkなどの情報が表示されると説明している。一方で、通知のthreading設定とCopilot sessionは別の仕組みだ。通知への返信で@GitHubを指定すると、調査や実装を依頼できるが、それは会話の表示設定を変更する操作ではない。

Copilot cloud agentが作ったIssueやPRにも、通常の変更と同じ確認が必要だ。agentが計画やコードを出したことは作業結果であり、要件に合うか、権限や秘密情報を扱っていないか、テストが通るか、誰が承認するかを自動で保証しない。mergeの判断はGitHub上のPR、保護規則、CI、担当者のレビューで行い、Slack threadでは背景と次の行動を残す、と分けるのが安全だ。

## 会話からPRまでを、追跡できる四つの成果物に分ける

たとえば、Slackで『本番だけに起きる失敗を調べたい』という相談が出たとする。最初に会話の結論と観測済みの事実をIssueへ残す。次に、そのIssueを入力にして調査や実装を依頼し、変更が必要ならPRで差分と検証結果を提示する。最後にGitHub上でreviewとCIを確認する。この流れなら、会話は消えやすい相談の場、Issueは問題の追跡、PRは変更と検証、reviewは承認の場として役割を分けられる。

以下は公式の操作をそのまま実行した記録ではなく、どこで人の確認を入れるかを示す設計例だ。@GitHubへ実装を頼む前に、対象repository、変更してよい範囲、実行してはいけない操作、完了条件をIssueまたは会話に明記する。作られたPRは、Slackに戻る前にGitHubで本文・差分・checksを読む。

未実行の依頼例。会話を成果物へ移す順序だけを示す。

```text
Slack thread: 観測済みの失敗、影響、再現条件を確認する
Issue: 範囲、完了条件、変更してはいけない領域を記録する
@GitHub: Issueを参照して調査または実装を依頼する
Pull request: 差分、テスト、未検証範囲をGitHubで人がレビューする
```

## 権限は『便利になる操作』ごとに説明できる状態にする

GitHubの権限資料は、Slack連携がGitHub上のlink previewや通知だけでなく、Slackからactionを起こすためにGitHub側のwrite accessを使うことを示している。Copilot cloud agentがPRを作る機能やagent sessionの開始には、さらにcontentやworkflowに関わる権限が列挙されている。通知を見たいだけのチャンネルと、Issueを作るチャンネル、agentへ実装を頼むチャンネルを、同じリスクとして扱わない方がよい。

これは、すべてのチームに特定の権限構成を勧める記事ではない。編集部の提案としては、まず小さなrepositoryと限定したチャンネルで、誰が接続し、何を作成でき、作成後にどのGitHub review ruleが効くかを確認する。その結果をもとに、必要な操作だけを広げる。Slack上で便利に見えることと、組織の変更権限を広げてよいことは別の判断である。

## 制約と未検証範囲

- 2026年11月9日にGitHubの公式発表とDocsを確認した。編集部はSlackアプリを新規導入せず、GitHubアカウント接続、Copilot cloud agentの起動、Issue・PR作成、権限や課金の変更を実行していない。
- 利用可否、Copilot cloud agent、model選択、MCP server、cloud sandboxはプラン、組織ポリシー、管理者設定、ロールアウトに左右される。ここでの手順例は特定のworkspaceでの動作保証ではない。
- Slackでの合意やagentの出力は、GitHubの必須レビュー・保護規則・CI・人による承認を置き換えない。

## 確認したもの

- [GitHub Changelog — @GitHub in Slack and Teams is generally available and more (2026-11-06)](https://github.blog/changelog/2026-11-06-github-copilot-in-slack-and-teams-is-generally-available/)
- [GitHub Docs — Integrating GitHub with Slack (checked 2026-11-09)](https://docs.github.com/en/integrations/how-tos/slack/integrate-github-with-slack)
- [GitHub Docs — Using GitHub in Slack (checked 2026-11-09)](https://docs.github.com/en/integrations/how-tos/slack/use-github-in-slack)
- [GitHub Docs — Permissions for GitHub in Slack (checked 2026-11-09)](https://docs.github.com/en/integrations/reference/slack-permissions)
