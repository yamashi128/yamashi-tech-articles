# GitHub Security Labがファジング作業をつなぐAIを公開。カバレッジを読み、テストを改善する

YAMASHI TECH AI Editorial Desk | News | AI / ML / Security / DevTools / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/news-github-security-lab-agentic-fuzzing-taskflow) · [原稿データ](../articles/news-github-security-lab-agentic-fuzzing-taskflow.json)

公開: 2026-09-25 / 更新: 2026-10-23 / 確認: 2026-10-23

C/C++のテスト対象選び、入力の生成、AFL++の実行、結果を使った改善を、GitHub Security LabのFuzzing Taskflowがつなぐ。人が繰り返していた作業をどう自動化し、何を実行環境とレビューに残すかを紹介する。

## 大量の入力を試すだけでなく、届いていないコードを追う

GitHub Security Labは2026年9月24日、C/C++向けのFuzzing Taskflowを紹介した。ファジングは、多様な入力をプログラムへ与え、クラッシュなどの異常を探すテスト手法。今回の仕組みは、どの関数へ入力するかを選び、テスト用の呼び出しコードを作り、実行結果から改善する作業をAIにつなぐ。

その呼び出しコードをハーネスと呼ぶ。ファザーが何度動いても、ハーネスから問題の処理へ届かなければ検査は進まない。Taskflowは、実行されたコードの範囲であるカバレッジを読み、未到達の分岐へ届く入力やハーネスの変更を考える。継続的なファジングで人が担っていた反復作業を減らすのが狙いだ。

## 判断はAI、コンパイルと実行はツールが担当する

Taskflow Agent上で、対象の取得、ビルド解析、ハーネス作成、AFL++による入力テスト、カバレッジ解析、クラッシュの整理、報告書作成を段階的に進める。AIは次に試す対象や変更を判断し、MCPツールがコンパイルやAFL++の実行を担う。記録はSQLiteへ保存する。

反復の実行予算は30、60、120、240、480、960秒と増える。既定では、行カバレッジの増加が1.0ポイント未満の回が2回続くと、改善が頭打ちになったと判断して次へ進む。ここでいう1.0ポイントは、例えば50%から51%への差を表す。

AFL++が見つけた入力群は保存され、再開後にも引き継げる。10月23日のREADMEでは、入力テスト用の.afl、比較値を記録するCMPLOG用の.cmplog、人が読めるカバレッジ測定用の.covという三つの実行ファイルを作る構成になっている。

## クラッシュを絞り込み、修正案をレビューへ渡す

クラッシュを見つけると、入力を小さくし、サニタイザーのスタックトレースで重複をまとめる。その後AIが公開APIからの到達経路を読み、ライブラリの問題、ハーネス自体の不具合、再現しないものなどへ分類する。報告書には根拠のファイル位置、修正案、回帰テスト案を添える。

公開READMEの参照結果では、Onigurumaに対し10対象・10ハーネス・60回のAFL実行で13件のクラッシュを得て、うち2件を範囲外読み取りの脆弱性に分類している。これは開発元がCodespaceの開発用イメージで実行した結果だ。同じ表にはハーネスの不具合なども含まれ、クラッシュ数がそのまま脆弱性数にはならない。

修正案にはレビューが必要と明記されている。実際の問題か、外部から悪用できるか、提案で別の動作を壊さないかを、再現入力とコードで確認する工程は利用側に残る。

## 試す対象はC/C++。実行は使い捨て環境へ限定する

必要環境はPython 3.11以降、aptを使えるLinuxまたはCodespaces、AFL++、clang、lcovなど。素直にビルドできるパーサー、デコーダー、シリアライザーが主な検討対象で、独自ビルドシステムなどでは対象をビルドできず処理を飛ばすこともある。発表時の既定モデルは、同チームの内部試験を通ったClaude Sonnet 5だった。

導入時に外せない条件は、実行環境の隔離だ。公式の注意書きは、AIが選んだ任意のビルドコマンドを、確認ダイアログなしでホスト上に実行すると説明している。コード中の不正な指示に従った場合、実行ユーザーの権限で操作できる。そのため、非特権の使い捨てVMやCodespacesを使い、ネットワークも必要な範囲に絞る。Taskflow AgentのDockerイメージも、それ自体を安全境界とはしていない。

初回はビルド方法が分かる小さな公開プロジェクトで、実行ログ、カバレッジ、再現入力を人が読み切れる範囲にするのがよい。報告書を受け取るだけでなく、指摘の採否まで確認できれば、チームでどこまで手作業を減らせるかを判断できる。

更新（2026年10月23日）：発表時の二つのビルドに対し、現行READMEで追加されているCMPLOG用ビルドを説明へ反映した。

## 制約と未検証範囲

- Taskflowの導入、APIやGitHubトークンの設定、ファジング、クラッシュの再現、修正の適用は行っていない。
- 参照結果とモデル選択はGitHub Security Labの報告。編集部が精度、費用、カバレッジを独立に測定したものではない。

## 確認したもの

- [GitHub Blog — AI-powered fuzzing with the GitHub Security Lab Taskflow Agent (2026-09-24)](https://github.blog/security/application-security/ai-powered-fuzzing-with-the-github-security-lab-taskflow-agent/)
- [GitHubSecurityLab/seclab-taskflows-fuzzing — README, requirements, pipeline, benchmark and security warning (checked 2026-10-23)](https://github.com/GitHubSecurityLab/seclab-taskflows-fuzzing)
- [GitHubSecurityLab/seclab-taskflow-agent — README, API types, credentials and Docker boundary (checked 2026-10-23)](https://github.com/GitHubSecurityLab/seclab-taskflow-agent)
