# `.gitignore` の `!` が効かないのはなぜ？ディレクトリ除外と `git check-ignore` で確かめる

YAMASHI TECH AI Editorial Desk | Learn | DevTools / Software Engineering

[掲載ページ](https://yamashi-tech.com/articles/learn-gitignore-negation-directory-boundaries) · [原稿データ](../articles/learn-gitignore-negation-directory-boundaries.json)

公開: 2026-11-10 / 更新: 2026-11-10 / 確認: 2026-11-10

否定パターン `!` は親ディレクトリを除外した後には配下のファイルを再追加できない。規則の順序、追跡済みファイルとの違い、`git check-ignore -v` による切り分けを小さな実験で学ぶ。

## 結論：`!` は親ディレクトリを再び探索させない

否定パターン `!` は、先に一致したパターンを打ち消してファイルを含め直す記法だ。ただし親ディレクトリそのものが除外されている場合は、その配下を `!` で再追加できない。Gitが除外済みディレクトリの中を列挙しないためである。

`build/` と `!build/keep.txt` を並べても、`keep.txt` は候補にならない。必要なのは否定記法を増やすことではなく、親を丸ごと除外せず、Gitが必要なパスを探索できる規則へ変えることだ。

## 規則の順序と場所を分けて考える

Gitはコマンドライン、各階層の `.gitignore`、`info/exclude`、ユーザー共通の excludes file を優先順位付きで調べる。同じ優先順位では最後に一致したパターンが結果を決める。チームで共有する生成物の規則は通常repository内の `.gitignore` に置く。

中間に `/` を含むパターンは、その `.gitignore` からの相対位置として扱われる。`*.log` のように区切りを持たないパターンは、その場所より下の階層でも一致し得る。

## ファイル単位の否定と、親を除外した否定を比べる

使い捨てrepositoryの `.gitignore` に `build/`、`!build/keep.txt`、`*.log`、`!important.log` をこの順で書いた。`git check-ignore -v --no-index` は、照合した規則の出所・行・パターンを表示する。

実測では `build/keep.txt` と `build/drop.txt` の両方が1行目の `build/` に一致した。対して `important.log` は4行目の `!important.log` に一致し、`git status --ignored` では未追跡として現れた。`ordinary.log` は3行目の `*.log` により無視された。

2026-11-10に実行した最小例

```sh
git check-ignore -v --no-index build/keep.txt build/drop.txt important.log ordinary.log
git status --short --ignored
# build/keep.txt と build/drop.txt は build/ に一致
# important.log は !important.log に一致して ??
# ordinary.log は *.log に一致して !!
```

## 必要な成果物を残すなら、親を除外し切らない

`build/` の中で一部だけをversion管理したいなら、親が探索可能でなければならない。たとえば `build/*` で中身を無視し、必要なサブディレクトリとファイルを否定パターンで戻す書き方を検討する。空ディレクトリをGitが追跡しない点も忘れない。

これは生成物を常にrepositoryへ入れる提案ではない。配布物、fixture、CIで再生成するものを先に分け、無視規則をその設計の結果として書く。

設定例。適用前に対象repositoryで確認する。

```gitignore
build/*
!build/reports/
!build/reports/summary.json
```

## 追跡済みファイルと切り分け手順

`.gitignore` は意図的に未追跡のファイルを無視する仕組みで、すでにindexにあるファイルには効かない。後から `.gitignore` を足しても、履歴や現在の追跡状態は変わらない。

迷ったら、対象が追跡済みかを確認し、親ディレクトリの除外を確認し、最後に `git check-ignore -v --no-index <path>` で規則の出所を表示する。この順なら、`!` を書き足す前に例外が届かない理由を説明できる。

## 制約と未検証範囲

この記事の実験はGit 2.49.0のコマンドライン挙動だけを対象にした。GUIクライアントやホスティングサービスの設定、global excludes、OSの大文字小文字の扱いは検証していない。

追跡を止める必要がある場合に `git rm --cached` が候補になることはあるが、共同作業者のcheckoutや履歴への影響を確認して別途判断する。秘密情報が履歴へ入った場合は、単に無視規則を追加するだけでは十分でない。

## 制約と未検証範囲

- 観測はmacOS x64、Git 2.49.0の使い捨てrepositoryで行った。GUI、Windows、global excludes、複数階層の競合は検証していない。
- 追跡済みファイルは `.gitignore` の対象外である。追跡を止める操作や秘密情報の履歴対策は、repositoryの方針と影響を別途確認する。

## 確認したもの

- [Git Documentation — gitignore (checked 2026-11-10)](https://git-scm.com/docs/gitignore)
- [Git Documentation — git-check-ignore (checked 2026-11-10)](https://git-scm.com/docs/git-check-ignore)
