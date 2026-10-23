# Responses APIが12時間のPrompt Cachingに対応。数時間後も同じ指示や資料を再利用する

YAMASHI TECH AI Editorial Desk | News | AI / ML / AI Agents / DevTools / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/news-openai-responses-api-12-hour-prompt-caching) · [原稿データ](../articles/news-openai-responses-api-12-hour-prompt-caching.json)

公開: 2026-10-21 / 更新: 2026-10-23 / 確認: 2026-10-23

OpenAIは2026年10月20日、Responses APIへ12時間のPrompt Cachingを追加した。同じ指示や資料を時間を空けて使う処理で、入力の再利用を選べる。書き込みは通常入力の2.5倍となるため、再利用回数で費用を比較する。

## 同じ資料を数時間後に読む処理へ、キャッシュの選択肢が増えた

OpenAIは2026年10月20日、Responses APIで12時間のprompt cache lifetimeを選べるようにした。GPT-5.6以降の既定値である30分に加え、数時間の間隔を空けて同じ指示、ツール定義、資料を使う処理へ向けた選択肢だ。

prompt cachingは、入力の先頭から共通する部分を再利用する仕組み。たとえば、製品マニュアルと回答方針を共通で持ち、朝と昼に別の問い合わせへ答えるアプリで検討できる。毎回同じ部分を通常料金で入力する代わりに、再利用した部分へキャッシュ読込料金が適用される。

## 固定の情報を先頭へ、今回の質問を後ろへ置く

再利用の対象は、先頭から一致するprefixだ。共通の指示や資料を先に置き、質問や案件ごとの情報を後ろへ追加すると、どこまで同じ入力なのかを分けやすい。GPT-5.6以降の最小長は1,024トークンで、OpenAIが提供する隠れたsystem内容はこの判定へ数えない。

設定にはprompt_cache_options.ttlで12hを指定する。explicitモードでは、再利用したい部分の終わりへprompt_cache_breakpointを置く。explicitモードでbreakpointがなければ、キャッシュの利用も書き込みも行われない。以前のモデルのprompt_cache_retentionとは別の設定だ。

長期間変わらない資料には12h、会話中に増える文脈には30mと、一つのリクエスト内で分けることもできる。個別のbreakpointへttlを指定すると、リクエスト全体の値より優先される。

## 初回の書き込みと再利用2回なら、費用は2.7回分になる

キャッシュには書き込み料金がある。GPT-5.6以降では、30分の書き込みは通常入力の1.25倍、12時間は2.5倍。読込はどちらの期間でも同じで、多くの対象モデルは通常入力の0.1倍、GPT-6.1 Solは0.05倍だ。書き込み倍率は通常入力に上乗せする追加額ではなく、その部分の合計料金を表す。

通常入力で同じprefixを一度送る費用をpとする。初回に12時間で書き込み、残りはすべて0.1倍で完全に再利用できると仮定すると、合計3回のリクエストは2.5p＋0.1p＋0.1p＝2.7p。キャッシュなしの3pより低くなる。2回だけなら2.6pとなり、キャッシュなしの2pより高い。

この比較は同じprefix部分だけの計算で、今回の質問、出力、ツール利用は含まない。また30分の間に再利用できるなら、より安い30分書き込みとも比較する。2026年10月22日訂正：初版の「3回の完全reuse」を「初回書き込みを含む合計3回のリクエスト」へ改めた。再利用回数は2回である。

12時間・読込0.1倍・初回以外は完全再利用と仮定した編集部の再計算

| 合計リクエスト | 書込／読込 | 12時間キャッシュ | キャッシュなし |
| --- | --- | --- | --- |
| 1回 | 1／0 | 2.5p | 1p |
| 2回 | 1／1 | 2.6p | 2p |
| 3回 | 1／2 | 2.7p | 3p |

## 12時間は最低期間。データの削除期限を指定するものではない

公式guideは、12hをキャッシュ読込料金が適用される最低期間として説明する。OpenAIがそれより長く保持する場合もあり、12時間で必ず削除する指定ではない。最大のデータ保持方針も、この設定では変わらない。

また、最低期間は毎回の内部状態の再利用や、応答時間の短縮を保証するものではない。キャッシュは入力の処理を最適化する仕組みで、回答文はその都度生成される。データの保存要件があるアプリでは、ttlの値とは別に、利用モデルと組織のデータ保持条件を確認する。

## 読込と書込を分けて、実際の合計費用を比べる

導入を検討するなら、共通部分が十分に長いか、何時間おきに何回使うかを調べる。資料やツール定義を更新するとprefixも変わるため、版を残しておけばキャッシュの変化を説明しやすい。

usageでは、読込のcached_tokens、書込のcache_write_tokens、書込期間別のttl_30m_tokens・ttl_12h_tokensを分けて見る。通常入力はinput_tokensから読込と書込を引いた量になる。書込総量と期間別の内訳を二重に加算しない。

合計費用、応答時間、回答の正しさを同じ仕事で比べれば、30分と12時間のどちらが合うか判断できる。数時間後にも同じ長い資料を使うアプリなら12時間、短い間隔で続く処理なら30分を、最初の比較候補にするとよい。

費用計算に使うusageの読み分け。概念例であり、編集部ではAPI未実行。

```text
ordinary_input = input_tokens - cached_tokens - cache_write_tokens

# cache_write_tokensの内訳
cache_write_tokens = ttl_30m_tokens + ttl_12h_tokens

# 通常入力単価に対する倍率。読込倍率は利用モデルの料金を使う
input_cost = ordinary_input * input_rate
           + cached_tokens * cached_input_rate
           + ttl_30m_tokens * input_rate * 1.25
           + ttl_12h_tokens * input_rate * 2.5
```

## 制約と未検証範囲

- 2026年10月20日のAPI Changelogと10月23日確認のPrompt Caching guideに基づく。API、ダッシュボード、課金明細を使う実測は行っていない。
- 2.7pの例は、初回書き込み後の全リクエストで同じprefixを0.1倍で完全再利用する仮定の計算。実際の再利用量や追加書き込みで費用は変わる。

## 確認したもの

- [OpenAI API Changelog：12時間のPrompt Caching追加（2026年10月20日）](https://developers.openai.com/api/docs/changelog)
- [Prompt caching：最低期間、料金、breakpoint、usage（10月23日確認）](https://developers.openai.com/api/docs/guides/prompt-caching)
