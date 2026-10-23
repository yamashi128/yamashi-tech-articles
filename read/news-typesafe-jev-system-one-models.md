# TypeSafe AIのJevは文章を生成せず判断を返す。問い合わせの振り分けをコードへ組み込む

YAMASHI TECH AI Editorial Desk | News | AI / ML / DevTools / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/news-typesafe-jev-system-one-models) · [原稿データ](../articles/news-typesafe-jev-system-one-models.json)

公開: 2026-09-19 / 更新: 2026-10-23 / 確認: 2026-10-23

TypeSafe AIは、状態と選択肢を受け取り、判断と確率を返すJevを先行公開した。自由文を読み解く工程を省き、分類や採点をプログラムの分岐へ組み込む設計だ。三つの判断形式、処理例、価格と速度比較の条件を整理する。

## モデルの答えを、そのままプログラムの分岐へ渡す

TypeSafe AIは2026年9月15日、最初のSystem One ModelとしてJevを先行公開した。入力するのは、問い合わせや文書などの状態と、それについて答えてほしい質問。返るのは生成された説明文ではなく、あらかじめ定義した選択肢や確率だ。

例えば「この問い合わせを請求担当、技術担当、その他のどこへ送るか」を質問し、返った選択肢で処理を分ける。曖昧な文章を読む部分をモデルが担い、送信先や実行条件はアプリケーションのコードが管理する。固定ルールだけでは扱いにくい分類を、通常のソフトウェアへ組み込むのが狙いだ。

## Choice・Score・Noulで、質問の形を決める

Choiceは候補から一つを選ぶ質問、Scoreは段階付きの基準に沿った採点、Noulは命題が真である確率を求める質問だ。ChoiceとScoreは確率分布に加えて確信度を返す。Noulの値は0から1で、別の確信度項目はない。

複数の質問を一回のリクエストへまとめ、それぞれを同じ状態に対して並列・独立に評価する。総合的な判断を一問で求めるより、論点を小さく分け、結果の重み付けや組み合わせをコードへ残す使い方を同社は勧めている。

構造化出力を使うLLMとも、結果をコードで扱う目的は共通する。Jevの特徴は、自由な文章を生成する機能を省き、判断と確率を中心に設計している点にある。型が正しいことは、分類内容が正しいことまで保証しない。「請求担当」という正しい形式の値でも、問い合わせを読み違える可能性はある。

## 低い確信度は、人が確認する処理へ回せる

次の例は公式JavaScript SDKを基に、請求・技術・その他へ問い合わせを分けるもの。SDKの実行にはNode.js 22以降とAPIキーが必要になる。編集部では接続しておらず、API呼び出しと、その後の分岐を示す手順例である。

0.8という基準値は説明用で、同社がどの用途にも推奨する値ではない。実際には代表的な問い合わせで誤分類を確かめ、誤送信の影響と人が確認する量に応じて決める。請求に分類できたことを、そのまま返金の許可には使わない。

未実行のTypeScript例。queueForHumanReviewとrouteTicketはアプリ側の処理を表す。

```typescript
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

const client = new TypeSafeClient();
const result = await client.systemOne({
  model: "jev-1.13.0",
  state: { ticket: "二重請求された。返金してほしい。" },
  questions: {
    route: choice("この問い合わせをどこへ送るか", {
      billing: "請求、返金、支払いの問題",
      technical: "障害や連携の問題",
      other: "どちらにも明確には当てはまらない",
    }),
  },
});

const answer = result.answers.route;
if (answer.confidence < 0.8 || answer.choice === "other") {
  await queueForHumanReview();
} else {
  await routeTicket(answer.choice);
}
```

## 価格は入力100万トークン0.042ドル。速度比較には評価条件がある

10月23日に確認したモデル資料では、Jev 1.13と1.14の入力価格は100万トークンあたり0.042米ドルで、出力は無料。通常の上限はリクエスト全体64k、質問ごと32kトークンで、処理できる量は組織ごとに設定される。モデル名を固定するか、更新される別名を使うかも選べる。同資料ではjev-latestは1.13.0、jev-previewは1.14.0を指している。

発表は応答時間70〜500ミリ秒、同種の判断で従来LLMの40〜200倍の速度を掲げる。また193.6倍高速、444.6倍安価という比較は、同社が作った四つの処理フローによるものだ。比較の基準回答はGPT-6 AstraとFable 5.1の予測の平均で、LLM側にも確率付きの互換出力を求めている。同社自身が実際の改善幅の大きい側の数字と説明しており、一般的な文章生成との速度差には使えない。

## 向くのは狭い意味判断。計算と日付の比較はコードへ残す

問い合わせの振り分け、検索結果の関連度判定、候補の採点など、答えの候補を先に決められる仕事が検討対象になる。Jev 1.13の既知の弱点として、数の集計、正確な計算、日時比較、複雑な間接推論が挙げられている。こうした処理はコードが担当し、モデルには意味の判断を任せると役割が明確になる。

日本語も処理できるが、公式資料は英語と同等の精度とはしていない。日本語の問い合わせを扱うなら、日本語の実例で基準値を調整する。また同社は入力を学習に使わないと説明するが、それだけで保持期間がゼロになるわけではない。機密情報を送る場合は契約上のデータ処理条件も確認する。

更新（2026年10月23日）：固定の処理上限に関する旧記述を、現行資料の組織別上限へ更新し、Jev 1.14とモデル別名の対応を追記した。本文の三つの判断形式と例は、Jev 1.13のテキスト処理を対象とする。

## 制約と未検証範囲

- 接続例は未実行。APIキーの取得、有料APIの利用、待機リストへの登録、速度・精度の測定は行っていない。
- 速度・費用・確信度の特性はTypeSafe AIの報告に基づく。紹介する比較は同社の評価条件に限定される。

## 確認したもの

- [TypeSafe AI — Introducing System One Models & Jev (2026-09-15)](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [TypeSafe AI documentation — Introduction and decision primitives](https://docs.typesafe.ai/introduction)
- [TypeSafe AI documentation — Models, price, limits, language, and data handling](https://docs.typesafe.ai/models)
- [TypeSafe AI documentation — HTTP API reference](https://docs.typesafe.ai/api)
- [TypeSafe AI — Official JavaScript/TypeScript SDK](https://github.com/typesafe-ai/typesafe-sdk-js)
- [TypeSafe AI documentation — Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13)
- [TypeSafe AI — Privacy policy](https://typesafe.ai/legal/privacy-policy)
- [TypeSafe AI — Data processing addendum](https://typesafe.ai/legal/data-processing)
