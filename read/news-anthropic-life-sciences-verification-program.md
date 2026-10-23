# Anthropicが生命科学向けLSVPを開始。研究用途に応じてClaudeの利用範囲を広げる

YAMASHI TECH AI Editorial Desk | News | AI / ML / AI Agents / Security / Industry

[掲載ページ](https://yamashi-tech.com/articles/news-anthropic-life-sciences-verification-program) · [原稿データ](../articles/news-anthropic-life-sciences-verification-program.json)

公開: 2026-09-18 / 更新: 2026-10-23 / 確認: 2026-10-23

生命科学の研究でClaudeが回答を止める場面を減らすため、Anthropicは組織と用途を審査するLSVPをβ公開した。チーム向けと研究案件向けの二つの利用許可を設け、利用範囲の拡大と30日間のデータ保持・監視を組み合わせる。

## 正当な研究を進めやすくする、組織審査付きの利用制度

Anthropicは2026年9月17日、Life Sciences Verification Program（LSVP）を発表した。生命科学のチームや研究機関を審査し、生物学関連の安全策を調整したMythos、Opus、Sonnetを提供するβプログラムだ。創薬、基礎研究、臨床開発、製造などで、一般提供モデルが制限する質問にも対応できるようにする。

背景には、同じ生物学の情報が研究にも悪用にも使われる問題がある。質問一件だけでは意図を判定しにくいため、研究実績、セキュリティ基準、倫理面の監督体制を持つ組織を確認し、申請した用途に結び付けてアクセスを認める。研究組織がClaudeを業務へ接続する際の、新しい利用経路になる。

## 日常業務はチーム単位、高リスク用途は研究案件単位で許可する

LSVPの利用許可は「grant」と呼ばれる。Standard Useはチームの日常的な生命科学業務を対象とし、年1回更新する。発表時の対象モデルはMythos 5.1、Opus 5、Sonnet 5。High-risk UseはStandard Useで制限される研究のための追加許可で、一つの研究案件に限定し、6か月ごとに更新する。

例えば、通常の調査にはチーム共通のStandard Useを使い、追加審査が必要な研究だけ別のHigh-risk Useへ分ける。発表時に後者を広く提供する対象はOpus 5とSonnet 5で、Mythosは追加審査を受ける少数の組織に限られる。High-risk Useでもサイバー分野など、生命科学以外の安全策は残る。

利用許可を得ることと、研究結果の正しさを確認することは別の作業だ。組織の研究審査や、出力を専門家が点検する工程は、そのまま必要になる。

## 用途の逸脱を継続監視するため、通信データを30日間保持する

LSVPでは、組織が宣言した安全な用途から外れる利用を、複数のリクエストやセッションにまたがって監視する。Anthropicは、リアルタイムで回答を止める方式から、利用の流れを事後に調べる方式へ重点を移すと説明する。逸脱を見つけた場合は組織の管理者へ連絡し、事前に合意した時間内で調査・対処する。

この監視のため、LSVPの通信には30日間のデータ保持が必須となる。同社は、保持データをモデルの学習へ使わず、自社の生命科学研究チームも閲覧できないとしている。利用組織にとっては、回答できる範囲だけでなく、研究データをその条件で送信できるかが導入判断になる。

β版はBAAを有効にした組織では利用できない。保護対象の医療情報（PHI）を扱う構成は、一般の研究情報を使う構成と分けて検討する必要がある。

## 利用する製品と、案件ごとの権限の切り替えを確かめる

発表時の提供先は、Anthropicのコンソール経由のAPI、Enterprise、Teamプラン。個人向けプランと第三者プラットフォームは対象外だった。APIとClaude Scienceでは利用許可を切り替えられる一方、Claude.aiとClaude Codeは初期対応では選択済みの既定許可を使う。API認証のClaude Codeは例外となる。

導入を検討する研究チームは、業務で使う製品、研究案件、送信データ、管理者を対応させるとよい。同じ担当者が複数案件を扱う場合も、どの許可で処理したかを追える構成にする。これで、研究用途の拡大を日々の運用へ落とし込める。

更新（2026年10月23日）：公式発表の9月30日追記に合わせ、案内先フォームは正式な参加申請ではなく、参加への関心を登録するフォームであることを明確にした。

## 制約と未検証範囲

- 2026年9月17日のβ開始発表を、10月23日に公式資料と照合した解説。参加手続き、API接続、研究作業は実行していない。
- 研究上・医療上の妥当性や規制適合性を評価した記事ではない。製品ごとの対応はβ開始時の説明であり、利用時の契約条件に従う。

## 確認したもの

- [Anthropic — Introducing the Life Sciences Verification Program (2026-09-17)](https://www.anthropic.com/news/life-sciences-verification-program)
- [Anthropic — Countering misuse of AI: September 2026](https://www.anthropic.com/threat-intelligence-report-september-2026)
- [Anthropic — Transparency Hub: safeguards and post-deployment monitoring](https://www.anthropic.com/transparency/voluntary-commitments)
