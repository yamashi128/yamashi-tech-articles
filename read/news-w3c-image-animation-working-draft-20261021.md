# 動く画像をCSSで停止・再生する草案が更新：image-animationは何を制御するか

YAMASHI TECH AI Editorial Desk | News | Industry / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/news-w3c-image-animation-working-draft-20261021) · [原稿データ](../articles/news-w3c-image-animation-working-draft-20261021.json)

公開: 2026-10-23 / 更新: 2026-10-23 / 確認: 2026-10-23

W3Cの10月21日版草案は、画像の再生を扱うimage-animationと:animated-imageを整理した。4月版との違い、動画・canvasとの境界、制作時の停止UIと静止表示の考え方を解説する。

## アニメーション画像へ、ページ側の再生制御を加える提案

W3CのCSS Working Groupは2026年10月21日、CSS Image Animation Module Level 1のWorking Draftを更新した。image-animationで画像の再生状態を制御し、:animated-imageで動く画像を選び、ページに合った再生・停止UIを作れるようにする提案だ。[1]

GIF、APNG、WebPなどの動く画像は、動画プレーヤーのような共通の停止UIを持たずに使われる。草案はこの画像再生をページ側で扱う仕組みを定めようとしている。段階は作業中の草案で、今回の公開がブラウザへの実装完了やW3Cの正式勧告を意味するわけではない。

## 10月版は、画像の分類を整理した更新

image-animationと:animated-imageの提案自体は、4月9日の初公開草案にも存在した。10月版のChangesは内容画像と装飾画像の区別を取り除いたと説明し、適用対象の記述はdeclarative imagesへ整理されている。[1 §8][2]

したがって、今回の更新を「背景画像を止める機能の初追加」と読むのは適切でない。4月版にも装飾画像の制御が含まれていた。新旧を比べると、対象を説明する用語と分類が変わったことが分かる。

日付付きの仕様を比べた結果。ブラウザの動作比較ではない

| 確認項目 | 2026年4月9日版 | 2026年10月21日版 |
| --- | --- | --- |
| 文書の段階 | First Public Working Draft | Working Draft |
| 適用対象の用語 | 内容画像と、装飾画像を持つ要素 | declarative images |
| 制御するための提案 | 画像再生用のpropertyと疑似クラスが存在 | 引き続き同じ目的の仕組みを扱う |

## 対象は宣言的に表示する画像。動画再生やcanvasには別の制御が要る

草案が扱うのは、imgのような要素で表す画像やCSSで表示する画像などのdeclarative imagesだ。動画の再生自体や、canvasのようにプログラムで描く画像は対象外になる。同じ画面の「動き」でも、表示の仕組みによって制御するAPIが変わる。[1 §2・4]

例えば製品説明ページに、動く画像、操作デモ動画、canvasの図があるなら、一つの停止ボタンを作る際も、それぞれへどう停止を伝えるかを定義する。画像用CSSの設定だけで、ページ内のすべての再生が止まる設計にはならない。

## 停止UIは、操作後も本文を読み進められる形にする

関連するWCAG 2.2の達成基準2.2.2は、自動で始まり、5秒を超えて続き、他の内容と並行して示される動きなどに、必要不可欠な活動の場合を除いて、一時停止・停止・非表示の手段を求める。動く画像のすべてが無条件に違反するという基準ではない。[3]

編集部は、停止できるかと、その操作を保ったまま読めるかを一緒に確認することを勧める。例えばマウスを載せている間だけ止まるUIは、ポインターを本文へ移すと再開する。キーボード操作やフォーカス移動後の状態も試し、静止画と文章だけでも主要な情報を伝えられるようにしたい。

## prefers-reduced-motionと組み合わせ、静止表示から設計する

prefers-reduced-motionは、不要な動きを減らしたいという利用者の要望を検出する条件だ。検出後にどの画像を静止表示へ変え、どう再生を選べるようにするかはサイト側が実装する。[4]

制作時には、動きを減らす設定での初期表示、明示的に再生した後の停止操作、非対応環境の静止版を用意すると比較しやすい。新propertyの採用を待つ間も、静止画像と手順文で説明を成立させる作業は進められる。

本稿は2026年10月23日に日付付きの新旧仕様を比較した資料調査だ。主要ブラウザの対応一覧や、実画像の停止・再開、実機・支援技術の操作は検証していない。本番への採用では、対象browserと画像を固定して動作を確かめる必要がある。

## 制約と未検証範囲

- 2026年10月23日にW3Cの資料を確認。10月21日版はWorking Draftであり、正式勧告や全ブラウザの対応を示すものではない。
- 新旧の仕様記述を比較した資料調査で、画像の停止・再開、ブラウザ対応、支援技術や実機での操作を検証していない。
- 確認計画と採用条件は編集部の提案。個別サイトのWCAG適合性を判定したものではない。

## 確認したもの

- [[1] W3C — CSS Image Animation Module Level 1、2026年10月21日Working Draft（Status、2〜4、8 Changes）](https://www.w3.org/TR/2026/WD-css-image-animation-1-20261021/)
- [[2] W3C — 同仕様の2026年4月9日First Public Working Draft（比較対象）](https://www.w3.org/TR/2026/WD-css-image-animation-1-20260409/)
- [[3] W3C WAI — Understanding SC 2.2.2: Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- [[4] W3C — Media Queries Level 5、動きを減らす要望の検出](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion)
