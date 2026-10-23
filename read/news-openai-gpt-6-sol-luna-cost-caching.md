# GPT-6 SolとLunaを追加。API単価の引き下げと、長い会話のキャッシュ改善

YAMASHI TECH AI Editorial Desk | News | AI / ML / AI Agents / DevTools / Software Engineering / Industry

[掲載ページ](https://yamashi-tech.com/articles/news-openai-gpt-6-sol-luna-cost-caching) · [原稿データ](../articles/news-openai-gpt-6-sol-luna-cost-caching.json)

公開: 2026-09-24 / 更新: 2026-10-23 / 確認: 2026-10-23

OpenAIは2026年9月22日、GPT-6 SolとGPT-6 Lunaを発表した。Solは複雑な開発やエージェント処理、Lunaは範囲の明確な大量処理向け。従来モデルからの価格差と、共通の文脈を再利用して入力費用を抑える仕組みを整理する。

## Solは複雑な作業、Lunaは範囲の明確な大量処理へ

OpenAIは2026年9月22日、GPT-6 SolとGPT-6 Lunaを発表した。APIで指定するモデルIDはgpt-6-solとgpt-6-luna。Solは複雑なコーディングやエージェント処理、Lunaは目的が絞られた高頻度の処理向けに位置付けられている。

両モデルはテキストと画像を入力し、テキストを出力する。context windowは1,050,000トークン、最大出力は128,000トークン。推論量をnone、low、medium、high、xhigh、maxから選べる。

発表時にはChatGPT WorkとCodexへも提供を開始し、Plus、Pro、Business、Enterprise、Edu向けに段階的に展開すると案内した。この記事は9月22日の追加を扱い、APIの仕様と料金は10月23日に再確認している。

## Solは入力2ドル・出力10ドル、Lunaは入力0.10ドル・出力0.50ドル

標準処理で入力272Kトークン以下の場合、100万トークンあたりの料金はSolが入力2米ドル・出力10米ドル、Lunaが入力0.10米ドル・出力0.50米ドル。GPT-5.6の比較表と並べると、どの利用量に値下げが効くかが分かる。

入力が272Kトークンを超えるリクエストでは、全体の入力・キャッシュ料金が2倍、出力料金が1.5倍になる。大きなcontext windowを使い切る処理と、短い問い合わせを大量に行う処理では、同じモデルでも計算の前提が変わる。

発表時の比較対象と標準処理の料金。100万トークンあたり、入力272Kトークン以下

| モデル | 通常入力 | キャッシュ読込 | 出力 |
| --- | --- | --- | --- |
| GPT-5.6 Sol | 4米ドル | 0.40米ドル | 20米ドル |
| GPT-6 Sol | 2米ドル | 0.20米ドル | 10米ドル |
| GPT-5.6 Luna | 0.20米ドル | 0.02米ドル | 1.20米ドル |
| GPT-6 Luna | 0.10米ドル | 0.01米ドル | 0.50米ドル |

## 同じ指示や資料を繰り返す処理では、キャッシュを生かせる

今回の発表では、共通の入力を再利用するprompt cachingの改善も示された。たとえば、長い開発ルール、ツールの定義、参照資料を毎回先頭へ送り、その後ろに今回の依頼を追加する構成なら、共通部分を再利用できる。SolとLunaのキャッシュ読込料金は、通常入力の10%だ。

キャッシュへ書き込む料金も計算に含める。10月23日時点の公式資料では、通常の30分の書き込みは入力料金の1.25倍、Responses APIの12時間オプションは2.5倍。最初の一回と、その後の再利用を合わせて比較する必要がある。

GPT-6では、途中で推論量や利用するツールを変えながら、以前の入力をキャッシュへ残す方法も案内された。推論量の変更にはconfiguration_updateという入力項目を追加し、リクエスト全体のreasoning.effortは維持する。対応条件は公式guideに従う。長い共通部分を書き換えず、追加の指示を後ろへ積む設計がしやすくなる。

## 開発や業務の評価では、どの条件で改善したのか

OpenAIの発表は、業務処理を測るAutomationBenchと、ソフトウェア開発を測るDeepSWEの結果を掲載した。下の値は同社の報告で、モデルの推論量と評価セットに結び付いた成績だ。

AutomationBenchの比較に載るClaude Fable 5.1は、約40%の課題でOpus 5へ処理を渡しており、その追加費用を比較値に含んでいないと注記されている。また、誤りの減少を測る社内評価は、過去に利用者が誤りを指摘した会話を対象にしている。通常の問い合わせ全体の誤り率としては扱えない。

採用候補を絞る材料にはなるが、最終的な比較は自分の仕事で行うとよい。たとえば修正コードなら、テストを通過したかに加え、レビューで手直しした時間と、再試行を含む費用を同じ単位で記録すれば、価格と成果を結び付けられる。

OpenAIが発表した評価結果。編集部による再実行ではない

| 評価 | モデルと推論量 | 報告値 |
| --- | --- | --- |
| AutomationBench 1.0.6 | GPT-6 Sol（xhigh） | 33.2%、1課題0.27米ドル |
| AutomationBench 1.0.6 | GPT-6 Astra（low）／Claude Opus 5（max） | 30.3%／26.9% |
| DeepSWE 1.1 | GPT-6 Sol（max）／GPT-6 Luna（max） | 68.8%／66.6% |

## 既存アプリでは、用途とツール呼び出し方から選ぶ

最初の使い分けとしては、分類や決まった項目の抽出など、答えを機械的に確かめやすい処理でLunaを比較し、複数ファイルの修正や長い調査ではSolを候補にすると評価を始めやすい。これはモデルの位置付けを基にした編集部の提案であり、業務ごとの品質は同じ課題で比べる。

既存のChat Completions実装で関数呼び出しを使う場合は、reasoning_effortをnoneにする制約がある。推論とツールを組み合わせる処理ではResponses APIを使う。モデル名を切り替える作業と、APIの呼び出し形式を変える作業を分けると、原因を追いやすい。

10月23日の仕様再確認では、SolとLunaのEU data residencyはStandard、Fast、Flex、Batchで利用可能とされている。初版の「Standardのみ」という記述を更新した。モデル、処理方式、地域の組み合わせを決めたうえで、実際の入力量、キャッシュの再利用量、出力、再試行を合わせて費用を比べたい。

## 制約と未検証範囲

- 性能値はOpenAI発表の評価条件に基づく。API、キャッシュ、競合モデルの比較測定、個別アカウントの提供状態は検証していない。
- 料金表は標準処理・入力272Kトークン以下の値。ツール、別の処理tier、地域指定などの追加費用は含まない。

## 確認したもの

- [OpenAI：GPT-6 Sol／Lunaの発表、価格と評価条件（2026年9月22日）](https://openai.com/index/introducing-gpt-6-sol-and-luna/)
- [GPT-6 Sol：モデルID、仕様、ツール・地域の条件（10月23日確認）](https://developers.openai.com/api/docs/models/gpt-6-sol)
- [GPT-6 Luna：モデルID、仕様、ツール・地域の条件（10月23日確認）](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [OpenAI API Pricing：標準料金と長文脈の料金（10月23日確認）](https://developers.openai.com/api/docs/pricing)
- [Prompt caching：書き込みと読込の料金](https://developers.openai.com/api/docs/guides/prompt-caching)
- [Using GPT-6：推論設定、configuration_update、ツール利用](https://developers.openai.com/api/docs/guides/latest-model)
