# OpenAI Agents APIが公開ベータに。長時間のAI作業を保存・再開する基盤を提供

YAMASHI TECH AI Editorial Desk | News | AI / ML / AI Agents / DevTools / Software Engineering / Industry

[掲載ページ](https://yamashi-tech.com/articles/news-openai-agents-api-public-beta) · [原稿データ](../articles/news-openai-agents-api-public-beta.json)

公開: 2026-09-17 / 更新: 2026-10-23 / 確認: 2026-10-23

OpenAIは2026年9月10日、Codexの実行基盤を使うAgents APIを公開ベータとして提供した。作業の保存・再開、文脈の圧縮、ツール実行の管理をサービスへ任せられ、長時間動くエージェントを構築しやすくなる。

## エージェントを動かし続ける仕組みを、APIで使える

モデルが回答を作るだけなら、一度のAPI呼び出しで済む。ところが、資料を調べ、コードを書き、実行結果を見て修正する作業では、複数の処理をつなぎ、途中経過を保つ仕組みが必要になる。Agents APIは、この実行基盤をOpenAIが管理して提供するサービスだ。2026年9月10日に公開ベータが始まった。

基盤にはCodexで使われるharnessを採用している。harnessとは、モデルへの入力、ツールの実行、文脈の管理などを組み合わせ、エージェントの作業を進める仕組みのこと。Agents APIでは、長い会話の文脈を圧縮し、作業を再開し、必要ならサブエージェントへ分担する機能まで利用できる。

調査や開発支援のために、履歴の保存、復旧、実行環境の準備を自作していたチームが主な対象になる。アプリ側は業務固有のデータやツールを用意し、OpenAI側へ任せる部分を増やせる。

## 一つのセッションに作業を保存し、追加の指示を送る

作業の単位は「セッション」だ。モデル、指示、ツール、実行環境を指定して作成し、入力を送ると作業が始まる。アプリはイベントを受け取って進行状況を追い、同じセッションへ続きの依頼や修正指示を送れる。

たとえば、最初にディレクトリの一覧を出すプログラムを作り、次の入力で「表示する深さを指定できるようにして」と頼む。毎回最初から会話を組み立て直すのではなく、保存したセッションを継続して機能を追加できる。

コードやファイルを扱う場合は、OpenAIが管理するsandbox、自社で接続するsandboxを選ぶ。外部ツールへの問い合わせだけなら、sandboxなしでも利用できる。セッションの状態と、実際にコマンドを動かす環境を分けて選べる構成だ。

## Responses API・Agents SDKとは、管理する範囲が違う

既存のAPIからの選択では、「エージェントの実行と状態を誰が管理するか」が目安になる。短い生成処理ならResponses APIが直接的で、独自の実行ルールをアプリ内で組み立てたい場合はAgents SDKが候補になる。

Agents APIが向くのは、複数の手順をまたぐ作業を長く続け、途中状態の保存と再開をサービスへ任せたい場合だ。たとえば、複数の資料を読み比べる調査や、不具合の再現から修正まで進める開発支援では、文脈や作業結果を持ち越す利点が大きい。

公式の実行基盤比較を、管理範囲で整理

| 選択肢 | エージェントの実行 | 作業状態の管理 |
| --- | --- | --- |
| Agents API | OpenAIがCodexのharnessを運用 | サービスがセッション、入力、途中経過を保存 |
| Agents SDK | 自分のアプリ内でSDKを運用 | アプリの保存先やSDKのセッションを組み合わせる |
| Responses API | モデルを直接呼び出し、アプリが処理を組み立てる | 履歴、応答の連結、Conversationsなどを選ぶ |

## 最初の作業は、生成ファイルと実行結果まで確認する

公式quickstartは、tree.pyを作成して実行する例を示している。下のJavaScriptも同じ構成で、OpenAI-hosted sandboxに作業を依頼し、進行イベントを表示する。APIキーと課金が必要な手順例であり、編集部では接続実行していない。

準備には、セッション操作用のapi.agents.read・api.agents.writeと、モデル推論用のapi.responses.writeを許可したアプリ用APIキーを使う。キーはアプリ側に保持し、エージェントのsandboxへ置かない。SDKはbeta.agents名前空間を使い、cURLではOpenAI-Beta: agents=v1ヘッダーを付ける。

確認するのは「作業が終わった」という文章だけではない。公式資料も、agent.session.turn.completedはすべてのツールの成功を保証せず、agent.session.idleだけでも成功を意味しないと説明する。この例なら、生成されたファイルと実行出力が依頼どおりかを確かめれば、最初の動作確認になる。

公式quickstartに基づく手順例。APIキーと利用料金が必要。編集部では未実行。

```javascript
import OpenAI from "openai";

const client = new OpenAI();
const events = await client.beta.agents.sessions.create({
  agent: {
    model: "gpt-6-astra",
    instructions: "Write clean code, run it, and report the actual output.",
  },
  environment: { type: "openai_hosted" },
  input: "Create tree.py, run it, and report the directory tree.",
  stream: true,
});

for await (const event of events) {
  console.log(JSON.stringify(event));
}
```

## 費用はモデル・ツール・実行環境の合計で考える

Agents APIの利用では、選択したモデルのAPI料金、OpenAIのツール料金、OpenAI-hosted sandboxの料金がかかる。サブエージェントや再試行を増やすと、それに伴う利用量も増える。比較するなら、同じ仕事を完了するまでの合計費用と、自作していた基盤の運用負担を見るとよい。

2026年10月23日に再確認した公式overviewでは、Agents APIのデータ所在地は米国のみで、Zero Data Retentionには対応していない。自社のsandboxを接続しても、このAPI側の制約は変わらない。米国外の保存要件やZDRが必須の用途では、この条件が採用判断を決める。

公開ベータの新機能を試すなら、完了条件が明確な一つの仕事から始めやすい。実行基盤をサービスへ任せることで、アプリ側はデータへのアクセス範囲、必要な承認、成果物の判定に集中できる。

## 制約と未検証範囲

- 2026年9月10日の発表と、10月23日に確認した公式資料に基づく。公開ベータの機能であり、掲載コードでのAPI接続・課金・sandbox実行は行っていない。
- Agents APIは米国のdata residencyのみをサポートし、ZDR非対応。実行環境を自社管理にしてもこの制約は変わらない。

## 確認したもの

- [OpenAI：Agents API公開ベータの発表（2026年9月10日）](https://openai.com/index/introducing-the-agents-api/)
- [Agents API overview：セッション、実行環境、料金、データ条件（10月23日確認）](https://developers.openai.com/api/docs/guides/agents-api/overview)
- [Agents API quickstart：権限、実行例、イベントの読み方（10月23日確認）](https://developers.openai.com/api/docs/guides/agents-api/quickstart)
- [公式比較：Agents API・Agents SDK・Responses APIの管理範囲](https://developers.openai.com/api/docs/guides/agents#compare-agent-runtimes)
- [OpenAI Platform：エンドポイント別のデータ保持条件](https://developers.openai.com/api/docs/guides/your-data#storage-requirements-and-retention-controls-per-endpoint)
