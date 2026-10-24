# git bisectの使い方：good・badの自動判定で不具合の混入commitを探す

YAMASHI TECH AI Editorial Desk | Deep Dive | DevTools / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/tool-git-bisect-reproducible-predicate) · [原稿データ](../articles/tool-git-bisect-reproducible-predicate.json)

公開: 2026-10-23 / 更新: 2026-10-23 / 確認: 2026-10-23

動いていた版と壊れた版を指定し、再現テストで履歴を絞る。9 commitの実験を通して、基本操作、判定器の終了値、skipが残す候補、実行環境の故障が結果へ混ざる条件を解説する。

## 動いていた版と壊れた版の間を、自動で絞り込む

git bisectは、不具合がないgoodのcommitと、不具合があるbadのcommitを指定し、その間の履歴を調べるツールだ。候補を切り替えるたびに同じ再現テストを実行すると、不具合が入り始めたcommitを絞り込める。

編集部が作った9 commitの直線履歴では、c0をgood、c8をbadとし、c6から不具合を入れた。通常の探索は3回の自動判定でc6を特定した。この例を使って、基本操作から、判定不能な版とテスト環境の故障を扱う方法まで見ていく。

## 基本操作は、両端を指定して再現テストを繰り返す

最初に追跡する不具合を一つに絞り、goodとbadの両端で同じ入力・期待結果を確かめる。goodは対象の不具合が出ないこと、badはその不具合が出ることを表す。別のテストの失敗や依存取得の失敗を混ぜないようにする。

下は基本操作の例で、c0とc8のtag、外部に置いた再現テストがあるcheckoutを想定している。実アプリで使うときは専用checkoutを用意し、実在する両端のcommitと判定コマンドへ置き換える。

基本操作の例。実行済みの一時repository全体は後掲のPythonコード

```bash
git bisect start c8 c0 --
git bisect run python3 /path/to/reproduce.py
git bisect log
git bisect reset
```

## 自動判定は、終了値でgood・bad・skip・中止を伝える

git bisect runは、実行したコマンドの終了値を解釈する。0はgood、1〜127のうち125以外はbad、125はskipだ。範囲外の終了値は探索を中止する。Git公式manualのBisect runに記載された契約である。

ここで125は、その版では対象の不具合を判定できない、という意味になる。一方、判定器そのものが動かない状態なら、探索を止めて環境を直す方がよい。shellでコマンドが見つからないときに使われる127も、bisectの判定ではbad側に入るため、判定器側で失敗理由を分類する必要がある。

| 判定器の終了値 | Gitの扱い | 使う場面 |
| --- | --- | --- |
| 0 | good | 対象の不具合が再現しない |
| 1〜127、125以外 | bad | 対象の不具合が再現した |
| 125 | skip | その版に限定された既知の理由で判定できない |
| 128以上など | 探索を中止 | 判定を続ける前提が壊れている |

## 9 commitの一時repositoryで、五つの判定条件を試す

次の全文をbisect_fixture.pyへ保存し、python3 bisect_fixture.pyで実行できる。2026年10月23日、Darwin 24.6.0 / x86_64、Git 2.49.0、Python 3.12.2で実行したコードだ。新しい一時repositoryだけを操作し、remoteや外部通信を使わない。

c0〜c8を作り、state.jsonのbrokenをc6以降だけtrueにする。判定器はrepositoryの外へ置くので、過去の版へのcheckoutで入れ替わらない。両端の事前判定、各探索後のbisect reset、HEADがc8へ戻り差分がないこともassertする。

testedは判定したrevisionと判定器の終了値、runExitは外側のgit bisect runの終了値である。二つの終了値は別々に読む。

実行済みの再現コード：python3 bisect_fixture.py

```python
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
env.update(GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull,
           GIT_AUTHOR_DATE="2026-10-23T00:00:00+00:00",
           GIT_COMMITTER_DATE="2026-10-23T00:00:00+00:00", LC_ALL="C")

with tempfile.TemporaryDirectory(prefix="bisect-fixture-") as temporary:
    base = Path(temporary)
    repo = base / "repo"
    subprocess.run(["git", "init", "-q", "--template=", "--initial-branch=main",
                    str(repo)], env=env, check=True)

    def git(*args, check=True):
        return subprocess.run(
            ["git", "-C", str(repo), "-c", "core.hooksPath=/dev/null",
             "-c", "commit.gpgSign=false", "-c", "user.name=Fixture",
             "-c", "user.email=fixture@example.invalid", *args],
            env=env, text=True, capture_output=True, check=check)

    tags = {}
    for revision in range(9):
        (repo / "state.json").write_text(json.dumps(
            {"revision": revision, "broken": revision >= 6}) + "\n")
        git("add", "state.json")
        git("commit", "-q", "-m", f"fixture {revision}")
        git("tag", f"c{revision}")
        tags[git("rev-parse", "HEAD").stdout.strip()] = f"c{revision}"

    predicate = base / "predicate.py"
    predicate.write_text('''import json, pathlib, sys
s = json.loads(pathlib.Path("state.json").read_text())
mode, trace = sys.argv[1:]
code = 1 if s["broken"] else 0
if mode == "skip-safe" and s["revision"] == 4: code = 125
if mode == "skip-adjacent" and s["revision"] == 5: code = 125
if mode == "abort": code = 129
if mode == "harness-127" and s["revision"] == 4: code = 127
with open(trace, "a") as f:
    f.write(json.dumps([s["revision"], code]) + "\\n")
sys.exit(code)
''')

    for tag, expected in [("c0", 0), ("c8", 1)]:
        git("checkout", "-q", tag)
        preflight = subprocess.run([sys.executable, str(predicate), "plain",
                                    str(base / "preflight.jsonl")],
                                   cwd=repo, env=env)
        assert preflight.returncode == expected
    git("checkout", "-q", "main")

    reports = []
    for mode in ["plain", "skip-safe", "skip-adjacent", "abort", "harness-127"]:
        trace = base / f"{mode}.jsonl"
        git("bisect", "start", "c8", "c0", "--")
        try:
            result = git("bisect", "run", sys.executable, str(predicate),
                         mode, str(trace), check=False)
            log = git("bisect", "log").stdout
            combined = result.stdout + result.stderr
            candidates = sorted(name for sha, name in tags.items()
                                if sha in combined)
            found = None
            for sha, name in tags.items():
                if f"{sha} is the first bad commit" in combined:
                    found = name
            tested = [json.loads(line) for line in trace.read_text().splitlines()]
            assert "# bad:" in log and "# good:" in log
        finally:
            git("bisect", "reset")
        assert tags[git("rev-parse", "HEAD").stdout.strip()] == "c8"
        assert git("status", "--porcelain").stdout == ""
        reports.append({"mode": mode, "runExit": result.returncode,
                        "tested": tested, "found": found,
                        "mentionedCandidates": candidates, "restored": "c8"})

    assert reports[0]["found"] == "c6" and reports[0]["runExit"] == 0
    assert reports[1]["found"] == "c6" and [4, 125] in reports[1]["tested"]
    assert reports[2]["found"] is None and reports[2]["runExit"] != 0
    assert set(reports[2]["mentionedCandidates"]) == {"c5", "c6"}
    assert reports[3]["found"] is None and reports[3]["runExit"] != 0
    assert reports[4]["found"] == "c4" and [4, 127] in reports[4]["tested"]
    print(json.dumps(reports, indent=2))
```

## skipした位置によって、一件に絞れる場合と候補が残る場合がある

通常のplainはc4→c6→c5を調べてc6を特定した。c4を判定不能にするskip-safeでも、後からc5がgoodと分かるためc6へ絞れた。

一方、c6直前のc5をskipすると、c4はgood、c6はbadまで分かってもc5を評価できない。結果はc5またはc6で、外側のrunは終了2になった。候補を一つへ減らすには、c5を評価できる環境を復元するなど、追加の証拠が必要になる。

Git 2.49.0で観測した結果。回数にはGitが判定器を追加実行した分も含む

| 条件 | 判定器の実行 | 外側runの終了 | 結果 |
| --- | --- | --- | --- |
| plain | c4:0 → c6:1 → c5:0（3回） | 0 | c6を特定 |
| skip-safe | c4:125 → c6:1 → c3:0 → c5:0（4回） | 0 | c6を特定 |
| skip-adjacent | c4:0 → c6:1 → c5:125（3回） | 2 | c5 / c6の候補が残る |
| abort | c4:129（1回） | 127 | 探索中止、混入点なし |
| harness-127 | c4:127 → c0:0 → c2:0 → c3:0（4回） | 0 | c4を返すが対象不具合の混入点ではない |

## 判定器が壊れると、正常終了でも別の混入点を返し得る

harness-127はc4だけ判定器が127を返す条件だ。今回のGitは追加でc0がgoodであることを確認した後、c4を最初のbadとして返し、外側も終了0になった。真の不具合はc6なので、探索が成功しても追跡した性質が違えば答えはずれる。

abortでは判定器が129を返して探索が止まり、外側のrunExitは127だった。したがってログには、対象commit、対象のassertion、判定器の終了値、外側の終了状態を一組で残すと切り分けやすい。

判定ミスが分かったときは、公式manualのbisect logとbisect replayでログを見直せる。skipした候補を根拠なくgoodへ変えて終了させず、どの判定をなぜ修正したかも残す。

## bisectが向くのは、同じ入力で回帰を再現できる調査

入力を固定できるparser、変換処理、計算ロジックなどは、専用の再現テストと組み合わせやすい。疑わしい差分が少数ならdiffを読む方法、特定行の変更ならblame、時刻や外部応答で揺れる症状ならログやtraceの比較も候補になる。

同じcommitがgoodにもbadにもなる状態では、先に入力と環境を固定する。不具合が途中で直って再発する履歴や、skipが連続する履歴も、今回の単一境界の例をそのまま当てはめない。

候補を特定した後は、その差分で対象の不具合を説明できるかを確認し、修正後の回帰テストへつなげる。今回の探索順や回数は9 commitでの観測で、merge履歴や実アプリのbuildを検証した結果ではない。

## 制約と未検証範囲

- 2026-10-23にDarwin 24.6.0 / x86_64、Git 2.49.0、Python 3.12.2の既存環境で、全文掲載のfixtureを実行した。9 commitの一時的な直線履歴だけが対象で、元repositoryの履歴を変更していない。
- 探索順序・判定回数・外側runの終了値はこの環境での観測であり、ほかの版・履歴・判定器について保証しない。とくに判定器129と外側run127を同一視しない。
- harness-127は対象不具合以外の失敗が判定へ混入する反例であり、実在のアプリの障害やGitの欠陥を報告するものではない。
- merge履歴、pathspec、submodule、Git LFS、外部依存の取得、実アプリのbuild、性能比較、本番環境では未検証。認証情報、外部サービス、課金、追加インストールは使用していない。

## 確認したもの

- [Git公式manual — git-bisect（2.44.0版、2.49系まで変更なしの掲載版）：Description / Bisect run / Bisect skip / Bisect log and bisect replay](https://git-scm.com/docs/git-bisect/2.44.0)
- [Git公式manual — git-bisect 現行版と版ごとの変更履歴（2026-10-23確認）](https://git-scm.com/docs/git-bisect)
