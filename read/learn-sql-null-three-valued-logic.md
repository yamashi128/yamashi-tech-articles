# SQLのNULLは空文字でも0でもない：三値論理・NOT IN・COUNTをSQLiteで確かめる

YAMASHI TECH AI Editorial Desk | Learn | Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/learn-sql-null-three-valued-logic) · [原稿データ](../articles/learn-sql-null-three-valued-logic.json)

公開: 2026-11-05 / 更新: 2026-11-05 / 確認: 2026-11-04

NULLを含む行がWHEREやNOT INで消え、COUNTの数字が変わる理由を、三値論理と15件のSQLite実験で学ぶ。欠損を含める条件、NOT EXISTS、LEFT JOINの件数、COALESCEの使い分けまで追う。

## 結論：NULLを含む条件では、真・偽に加えて不明を追う

NULLを含む通常の比較は、TRUEかFALSEのどちらかに必ず決まるわけではありません。UNKNOWN、つまり判定が不明という結果になり得ます。WHEREが残すのはTRUEの行だけなので、条件をNOTで反転しても、NULLの行が戻ってくるとは限りません。

この章では、NULL比較からNOT INによる除外、COUNTとLEFT JOINによる集計までを、一つの小さなデータで確かめます。読後の到達点は、NULLを含めるか除くかを要件から決め、その意図をSQLに書けることです。SELECTとWHEREの読み方を知っていれば始められます。

説明の根拠はSQLiteとPostgreSQLの公式資料です。実行したのはPython標準ライブラリから使うSQLiteだけで、他DBの動作や性能を実測した記事ではありません。末尾のスクリプトはインメモリDBを作り、この記事で扱う15件の結果をassertで確認します。

## NULL・空文字・0を、最初から別のデータとして置く

年齢が0であること、年齢が分からずNULLであることは異なります。ニックネームについても、文字が一つも入っていない空文字と、NULLを分けて用意します。NULLが未入力・不明・適用対象外のどれを意味するかは、列の設計と業務ルールで決めることです。NULLだけではその理由まで識別できません。

以下の4行を全例の共通データにします。Beniの年齢0と空文字は、欠損をゼロや空文字に置き換えると何が失われるかを見るための、意図した値です。SQLiteのstorage classでもNULL、INTEGER、TEXTは区別されます（資料1）。

例で使うusersの4行。NULLと空文字''は区別する

| id | name | age | nickname |
| --- | --- | --- | --- |
| 1 | Aki | 30 | NULL |
| 2 | Beni | 0 | ''（空文字） |
| 3 | Chika | NULL | chi |
| 4 | Dai | 20 | dai |

SQLiteで使う共通データ

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER,
  nickname TEXT
);
INSERT INTO users VALUES
  (1, 'Aki', 30, NULL),
  (2, 'Beni', 0, ''),
  (3, 'Chika', NULL, 'chi'),
  (4, 'Dai', 20, 'dai');
```

## NULL = NULLでもTRUEにならない理由

年齢が分からない人が二人いても、二人の年齢が同じとは決められません。通常の=による比較でNULL同士を比べても、等しいという結論を出さない、と考えると結果を追いやすくなります。PostgreSQLの比較演算子の説明も、NULLを含む通常の比較をunknownとして扱っています（資料2）。

SQLiteでSELECTした観測結果は下表のとおりでした。NULLかどうかを調べるIS NULLと、通常の値の比較である=を使い分けます。SQLiteの表示ではTRUEが1、FALSEが0、UNKNOWNがNULLです。Pythonで受け取ったNULLはNoneになり、JSONの実行結果ではnullと表示しています。

ここで使うIS NULL / IS NOT NULLの目的は欠損判定です。SQLiteには任意の二つの値を比べるa IS bもありますが、その省略形をすべてのDBへ持ち込めるとは扱いません。製品をまたぐ比較式は、対象DBの仕様を確認してください。

experiment.pyのnull_comparisonで観測した値

| 式 | 観測結果 | 読み方 |
| --- | --- | --- |
| NULL = NULL | NULL | 等しいか不明 |
| NULL <> NULL | NULL | 等しくないかも不明 |
| NULL IS NULL | 1 | NULLである |
| NULL IS NOT NULL | 0 | 非NULLではない |

通常の比較と欠損判定を並べる

```sql
SELECT NULL = NULL, NULL <> NULL,
       NULL IS NULL, NULL IS NOT NULL;
```

## NOT・AND・ORでUNKNOWNはどう伝わるか

三値論理は、TRUE・FALSE・UNKNOWNの三つで条件を考える方法です。UNKNOWNをNOTで反転してもUNKNOWNのままです。一方、FALSE AND UNKNOWNなら、もう一方が何であっても全体はFALSEと決まります。TRUE OR UNKNOWNも同様にTRUEと決まります。

下表はPostgreSQLの公式の論理表に対応する読み方です（資料3）。SQLiteでもnot_unknownの実験で同じ組み合わせを観測しました。この表は式の最終結果を説明するものです。ANDやORの左右が常に記述順に実行される、という保証には使わないでください。

UNKNOWNを含む論理式の主要な組み合わせ

| 式 | 結果 | 理由 |
| --- | --- | --- |
| NOT UNKNOWN | UNKNOWN | 不明を否定しても確定しない |
| FALSE AND UNKNOWN | FALSE | 両方TRUEにはならない |
| TRUE AND UNKNOWN | UNKNOWN | 残る条件が決まらない |
| TRUE OR UNKNOWN | TRUE | 片方がTRUEで成立する |
| FALSE OR UNKNOWN | UNKNOWN | もう片方が決まらない |

SQLiteではUNKNOWNをNULL、TRUE/FALSEを1/0として観測する

```sql
SELECT NOT NULL, 0 AND NULL, 1 AND NULL,
       0 OR NULL, 1 OR NULL;
-- 観測: NULL, 0, NULL, NULL, 1
```

## WHERE age <> 30が、年齢不明の行を返さない理由

SQLiteのWHEREは、条件がTRUEの行だけを残し、FALSEとNULLの行を除きます（資料4の2.3節）。age <> 30の結果は、AkiがFALSE、BeniとDaiがTRUE、ChikaがUNKNOWNです。観測されたidは2と4で、3は含まれませんでした。

「30歳ではないと分かっている人」と「30歳と確認されていない人」は違う要件です。後者として年齢不明も含めたいなら、age IS NULLをORで明示します。実験ではid 2・3・4が返りました。欠損を含めたのはSQLが自動的にそう判断したからではなく、こちらが含める条件を書いたからです。

抽出したい母集団を、欠損の扱いまで書く

```sql
-- 30歳ではないと分かっている行: id 2, 4
SELECT id FROM users
WHERE age <> 30 ORDER BY id;

-- 年齢不明も含める: id 2, 3, 4
SELECT id FROM users
WHERE age <> 30 OR age IS NULL ORDER BY id;
```

## NOT INの右側にNULLが一つあると、なぜ除外結果が消えるのか

除外リストblockedに、user_idが2の行とNULLの行を置きます。users.idはこの例では必ず非NULLです。id NOT IN (SELECT user_id FROM blocked)を実行すると、4人全員が結果から消えました。

id 1の場合は、「1は2と異なる」がTRUEでも、「1はNULLと異なる」はUNKNOWNです。すべての候補と異なると確認できないため、NOT INの結果がUNKNOWNとなり、WHEREでは残りません。id 2は一致する候補があるのでFALSEです。id 3・4もid 1と同じ理由でUNKNOWNになります。この条件はPostgreSQLのNOT INの説明とも対応します（資料5）。

したがって「NOT INはNULLがあると常にNULLになる」も言い過ぎです。一致があればFALSEになります。またSQLiteでは右側の集合が空なら、左側がNULLでもNOT INはTRUEです。実験not_in_edgesは、この二つの境界も含めて確認しています。

blockedが{2, NULL}のときの観測と解釈

| 左側のid | NOT INの判定 | WHEREに残るか |
| --- | --- | --- |
| 1 | UNKNOWN | 残らない |
| 2 | FALSE | 残らない |
| 3 | UNKNOWN | 残らない |
| 4 | UNKNOWN | 残らない |

NULLを含む除外リストで再現する

```sql
CREATE TABLE blocked(user_id INTEGER);
INSERT INTO blocked VALUES (2), (NULL);

SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM blocked)
ORDER BY id;
-- 観測: 0行
```

## NOT EXISTSへ直す前に、何を一致とするかを決める

この例の要件を「除外リストに自分のidと等しい行が存在しない人」と決めるなら、NOT EXISTSで書けます。相関条件b.user_id = u.idに一致する行の有無を調べるので、除外リストのNULL行は等しい行として見つかりません。観測結果はid 1・3・4でした。

同じ例では、NOT INのサブクエリからNULLを除いてもid 1・3・4になります。ただし両者がどんなデータでも同じになる、と覚えないことが大切です。外側のキーもNULLになり得る場合、NOT EXISTSの等価比較は一致相手を見つけず、その行を通し得ます。外側のNULLも除く要件なら、u.id IS NOT NULLのような条件を別途検討します。この教材のusers.idはINTEGER PRIMARY KEYなので、その違いは観測対象に含みません。

NOT EXISTSの採用理由は、ここでは要件を行の存在として表現できることです。NOT INより高速、という性能比較は実施していません。速度の判断には実際のスキーマ・インデックス・件数・実行計画を使う必要があります。

このデータでは両方ともid 1, 3, 4。成立条件まで読む

```sql
SELECT u.id FROM users AS u
WHERE NOT EXISTS (
  SELECT 1 FROM blocked AS b
  WHERE b.user_id = u.id
)
ORDER BY u.id;

SELECT id FROM users
WHERE id NOT IN (
  SELECT user_id FROM blocked WHERE user_id IS NOT NULL
)
ORDER BY id;
```

## COUNT(*)とCOUNT(列)は、数えているものが違う

COUNT(*)は入力の行数、COUNT(列)はその列がNULLではない行数を数えます（資料6）。usersの実測値は、COUNT(*)が4、COUNT(age)が3、COUNT(nickname)が3でした。nicknameの空文字はNULLではないため、COUNT(nickname)に含まれます。

これは数字を合わせるためにCOUNTを取り替える問題ではありません。利用者が何人いるかを知りたいのか、年齢を把握している利用者が何人かを知りたいのかで、必要な式が変わります。欠損率を出すなら、分母を全行にするのか、別の条件で絞った行にするのかも明示します。

行数と、値が存在する件数を一度に観測する

```sql
SELECT COUNT(*), COUNT(age), COUNT(nickname) FROM users;
-- 観測: 4, 3, 3
```

## LEFT JOINの後でCOUNT(*)を使うと、ログイン0回が1になる

loginsにAkiの記録を2行、Beniの記録を1行だけ置きます。usersを左にしたLEFT JOINでは、ログインのないChikaとDaiについても、右側の列をNULLにした行が残ります。これはSQLiteの外部結合の処理に対応します（資料4）。

この結合結果を利用者ごとにCOUNT(*)すると、ログインがない人でも1になります。残された行そのものを数えるためです。実験outer_join_countsでは、id 3・4に対するCOUNT(*)が1、COUNT(l.id)が0になりました。

数えたいものがログインの実レコードなら、実レコードではNULLにならないl.idを数えます。右側の任意の列なら何でもよいわけではなく、実レコード内でもNULLになり得る列を選ぶと、その件数まで落ちます。結合による行の増え方と、数える列の制約を一緒に確認してください。

右側の主キーを数え、外部結合で補われた行を除く

```sql
CREATE TABLE logins(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL);
INSERT INTO logins VALUES (1, 1), (2, 1), (3, 2);

SELECT u.id, COUNT(*) AS joined_rows, COUNT(l.id) AS login_count
FROM users AS u
LEFT JOIN logins AS l ON l.user_id = u.id
GROUP BY u.id ORDER BY u.id;
-- id / joined_rows / login_count
-- 1  / 2           / 2
-- 2  / 1           / 1
-- 3  / 1           / 0
-- 4  / 1           / 0
```

## COALESCEは欠損の意味を決めてから使う

COALESCEは、引数の中で最初の非NULL値を返す関数です（資料7）。COALESCE(nickname, '未登録')の観測では、AkiのNULLだけが「未登録」になり、Beniの空文字は空文字のままでした。NULLと空文字を同じ表示にしたい場合も、それは追加で決める表示ルールです。

数値ではさらに注意が必要です。AVG(age)は把握できた3人の年齢30・0・20から50/3、約16.67を返しました。一方、AVG(COALESCE(age, 0))は不明のChikaを0として加え、4人で割るため12.5になりました。どちらもSQLとして計算できますが、答えている問いが異なります。

欠損を0で埋めてよいのは、その業務で欠損を0と解釈する根拠がある場合です。この教材の年齢不明は0歳を意味しないので、平均計算のために一律置換するのは適切ではありません。表示用の代替値と、検索・統計に使う値を分ける設計が役立ちます。これは教材のデータの意味から導く編集部の判断です。

同じNULL置換でも、表示と集計で意味が変わる

```sql
SELECT id, COALESCE(nickname, '未登録') FROM users ORDER BY id;
-- id 1: 未登録 / id 2: 空文字 / id 3: chi / id 4: dai

SELECT AVG(age), AVG(COALESCE(age, 0)) FROM users;
-- 観測: 16.666666666666668, 12.5
```

## 練習：年齢不明を含める条件を、自分で書き分ける

同じusersから、「20歳未満と分かっている人」と「20歳未満、または年齢不明の人」をそれぞれ抽出してください。まず各行について条件がTRUE・FALSE・UNKNOWNのどれになるかを書き、その後でSQLを実行して比べます。

一つ目はage < 20でid 2、二つ目はage < 20 OR age IS NULLでid 2・3です。NOT (age >= 20)に変えれば不明も含まれる、と考えた場合は、NOT UNKNOWNがUNKNOWNのままであることへ戻ってください。experiment.pyではnot_predicateとpracticeとして、結果の違いを確認しています。

次にblockedのNULL行だけを取り除いた場合を考えてください。NOT INの結果が変わる理由を、除外リストの各値との比較として説明できれば、この章の要点を一つの式からサブクエリへ広げて理解できています。

練習の確認用SQL

```sql
SELECT id FROM users WHERE age < 20 ORDER BY id;
-- id 2
SELECT id FROM users
WHERE age < 20 OR age IS NULL ORDER BY id;
-- id 2, 3
```

## 再現する：インメモリSQLiteで15件の結果を確認する

編集部は2026年11月4日、macOS-15.7.9-x86_64-i386-64bit / x86_64、Python 3.12.2、SQLite 3.43.2で以下のスクリプトを実行し、15件のassertがすべて成功することを確認しました。実行したコマンドはpython3 experiment.py、終了コードは0です。

下のコードをexperiment.pyとして保存し、python3 experiment.pyで実行できます。標準ライブラリだけを使い、DBは:memory:なので外部サーバーや既存DBに接続しません。JSON内のNone相当の値はnullとして出力されます。casesPassedが15で、環境と各SQLの結果が出ることを確認してください。

別のPython環境では同梱されるSQLiteのversionが異なることがあります。失敗したらassertに出るcase名・actual・expectedとsqliteのversionを確認し、式を単独で実行して差分を調べてください。異なるDBへ持ち込む場合は、型、空文字、NULL比較、集計の仕様を改めて確認します。

編集部が実行した、15件を検証する完全なPythonスクリプト

```python
import datetime
import json
import platform
import sqlite3
import sys

db = sqlite3.connect(":memory:")
db.executescript("""
CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT NOT NULL,
                   age INTEGER, nickname TEXT);
INSERT INTO users VALUES
  (1, 'Aki', 30, NULL), (2, 'Beni', 0, ''),
  (3, 'Chika', NULL, 'chi'), (4, 'Dai', 20, 'dai');
CREATE TABLE blocked(user_id INTEGER);
INSERT INTO blocked VALUES (2), (NULL);
CREATE TABLE logins(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL);
INSERT INTO logins VALUES (1, 1), (2, 1), (3, 2);
""")

cases = [
    ("null_comparison", "SELECT NULL = NULL, NULL <> NULL, NULL IS NULL, NULL IS NOT NULL", [[None, None, 1, 0]]),
    ("not_unknown", "SELECT NOT NULL, 0 AND NULL, 1 AND NULL, 0 OR NULL, 1 OR NULL", [[None, 0, None, None, 1]]),
    ("not_equal", "SELECT id FROM users WHERE age <> 30 ORDER BY id", [[2], [4]]),
    ("not_predicate", "SELECT id FROM users WHERE NOT (age >= 20) ORDER BY id", [[2]]),
    ("include_unknown", "SELECT id FROM users WHERE age <> 30 OR age IS NULL ORDER BY id", [[2], [3], [4]]),
    ("not_in", "SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM blocked) ORDER BY id", []),
    ("not_in_filtered", "SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM blocked WHERE user_id IS NOT NULL) ORDER BY id", [[1], [3], [4]]),
    ("not_exists", "SELECT u.id FROM users AS u WHERE NOT EXISTS (SELECT 1 FROM blocked AS b WHERE b.user_id = u.id) ORDER BY u.id", [[1], [3], [4]]),
    ("not_in_edges", "SELECT 1 NOT IN (2, NULL), 2 NOT IN (2, NULL), NULL NOT IN (SELECT user_id FROM blocked WHERE 0)", [[None, 0, 1]]),
    ("counts", "SELECT COUNT(*), COUNT(age), COUNT(nickname) FROM users", [[4, 3, 3]]),
    ("empty_text", "SELECT id FROM users WHERE nickname = '' ORDER BY id", [[2]]),
    ("coalesce", "SELECT id, COALESCE(nickname, '未登録') FROM users ORDER BY id", [[1, "未登録"], [2, ""], [3, "chi"], [4, "dai"]]),
    ("averages", "SELECT AVG(age), AVG(COALESCE(age, 0)) FROM users", [[50 / 3, 12.5]]),
    ("outer_join_counts", "SELECT u.id, COUNT(*), COUNT(l.id) FROM users AS u LEFT JOIN logins AS l ON l.user_id = u.id GROUP BY u.id ORDER BY u.id", [[1, 2, 2], [2, 1, 1], [3, 1, 0], [4, 1, 0]]),
    ("practice", "SELECT id FROM users WHERE age IS NULL OR age < 20 ORDER BY id", [[2], [3]]),
]

observations = []
for label, sql, expected in cases:
    actual = [list(row) for row in db.execute(sql)]
    assert actual == expected, (label, actual, expected)
    observations.append({"case": label, "sql": sql, "rows": actual})

report = {
    "executedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "environment": {"os": platform.platform(), "architecture": platform.machine(),
                    "python": sys.version.split()[0], "sqlite": sqlite3.sqlite_version},
    "database": ":memory:", "casesPassed": len(cases),
    "observations": observations,
    "limitations": ["SQLite only; other database engines were not executed.",
                    "Synthetic data only; no credentials, network, disk database or production data."],
}
print(json.dumps(report, ensure_ascii=False, indent=2))
db.close()
```

## 実務では、条件式を書く前に欠損をどう扱うか決める

NULL関連の不具合を調べるときは、返ってきた行だけでなく、落ちた行の条件結果をSELECTしてみます。WHEREを一度外し、age <> 30のような式を列として表示すると、FALSEとUNKNOWNを区別して追えます。集計なら結合前後の行と、数えている列を確認します。

レビューでは「このNULLは何を意味するか」「UNKNOWNの行を含める要件か」「除外リストと比較キーはNULLになり得るか」「数えるのは行か、値か、結合相手の実レコードか」を確認します。これらを決めてからIS NULL、NOT EXISTS、COUNT、COALESCEを選べば、SQLの書き換えを要件に結び付けて説明できます。

## 制約と未検証範囲

- 実行検証はPython 3.12.2に同梱されたSQLite 3.43.2と4人の合成データだけ。PostgreSQLは公式資料を参照したが、PostgreSQL・MySQL・Oracleなどで実行していない。
- NOT INとNOT EXISTSの性能比較、実データ、ORMのSQL生成、型・照合順序・複合行の比較は検証していない。SQL製品間の完全な互換性は主張しない。
- NULLの業務上の意味や欠損補完の妥当性は、列と要件ごとに判断する。例の年齢不明を0歳と解釈する根拠はない。
- 仕様と実行環境の確認日は2026年11月4日。DB製品ごとの型変換や空文字の扱いを、本記事のSQLiteの観測と同一とは扱わない。

## 確認したもの

- [資料1: SQLite Datatypes — storage classes / boolean representation](https://www.sqlite.org/datatype3.html)
- [資料2: PostgreSQL 18 — Comparison Functions and Operators](https://www.postgresql.org/docs/18/functions-comparison.html)
- [資料3: PostgreSQL 18 — Logical Operators](https://www.postgresql.org/docs/18/functions-logical.html)
- [資料4: SQLite SELECT — JOIN / WHERE filtering](https://www.sqlite.org/lang_select.html)
- [資料5: PostgreSQL 18 — IN / NOT IN / EXISTS](https://www.postgresql.org/docs/18/functions-subquery.html)
- [資料6: SQLite Built-in Aggregate Functions — COUNT / AVG](https://www.sqlite.org/lang_aggfunc.html)
- [資料7: SQLite Core Functions — COALESCE](https://www.sqlite.org/lang_corefunc.html#coalesce)
- [資料8: SQLite Expressions — NULL comparisons / IN / EXISTS](https://www.sqlite.org/lang_expr.html)
