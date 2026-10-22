import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ARTICLE_REPOSITORY, SLUG, sha256, validateArticle, validateManifest } from "./article-schema.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const check = process.argv.includes("--check");
if (process.argv.slice(2).some((arg) => arg !== "--check")) throw new Error("Usage: node tools/catalog.mjs [--check]");

async function output(path, value) {
  const target = resolve(root, path);
  if (check) {
    let current;
    try { current = await readFile(target, "utf8"); } catch { throw new Error(`${path}: missing generated output`); }
    if (current !== value) throw new Error(`${path}: run node tools/catalog.mjs to refresh generated output`);
  } else await writeFile(target, value);
}

function markdown(article) {
  const lines = [
    `# ${article.title}`, "",
    `YAMASHI TECH AI Editorial Desk | ${article.category} | ${article.tags.join(" / ")}`, "",
    `[掲載ページ](https://yamashi-tech.com/articles/${article.slug}) · [原稿データ](../articles/${article.slug}.json)`, "",
    `公開: ${article.publishedAt} / 更新: ${article.updatedAt ?? article.publishedAt} / 確認: ${article.checkedAt}`, "",
    article.summary, "",
  ];
  for (const section of article.sections) {
    lines.push(`## ${section.heading}`, "");
    for (const paragraph of section.paragraphs) lines.push(paragraph, "");
    if (section.bullets) lines.push(...section.bullets.map((item) => `- ${item}`), "");
    if (section.table) {
      const { caption, columns, rows } = section.table;
      const row = (cells) => `| ${cells.map((cell) => cell.replaceAll("|", "\\|").replaceAll("\n", "<br>")).join(" | ")} |`;
      if (caption) lines.push(caption, "");
      lines.push(row(columns), row(columns.map(() => "---")), ...rows.map(row), "");
    }
    if (section.code) {
      const fence = "`".repeat(Math.max(3, ...[...section.code.value.matchAll(/`+/g)].map((match) => match[0].length + 1)));
      lines.push(section.code.label, "", `${fence}${section.code.language}`, section.code.value, fence, "");
    }
  }
  lines.push("## 制約と未検証範囲", "", ...article.limitations.map((value) => `- ${value}`), "", "## 確認したもの", "");
  for (const reference of article.references) {
    const url = reference.url.startsWith("/") ? `https://yamashi-tech.com${reference.url}` : reference.url;
    lines.push(`- [${reference.label}](${url})`);
  }
  return `${lines.join("\n")}\n`;
}

const catalog = JSON.parse(await readFile(resolve(root, "catalog.json"), "utf8"));
if (!Array.isArray(catalog) || !catalog.length || new Set(catalog).size !== catalog.length || !catalog.every((slug) => typeof slug === "string" && SLUG.test(slug))) throw new Error("Invalid catalog");
const fileSlugs = (await readdir(resolve(root, "articles"))).filter((name) => name.endsWith(".json")).map((name) => name.slice(0, -5));
if (fileSlugs.length !== catalog.length || fileSlugs.some((slug) => !catalog.includes(slug))) throw new Error("catalog.json and articles/ disagree");
if (!check) await mkdir(resolve(root, "read"), { recursive: true });
const manifest = { schemaVersion: 1, repository: ARTICLE_REPOSITORY, articles: [], assets: [] };
const index = ["# 記事一覧", "", "原稿データから生成した閲覧用Markdownです。修正は対応するJSON原稿へ行います。", ""];
const articles = [];
for (const slug of catalog) {
  const path = `articles/${slug}.json`;
  const bytes = await readFile(resolve(root, path));
  const article = validateArticle(JSON.parse(bytes.toString("utf8")));
  if (article.slug !== slug) throw new Error(`${path}: slug mismatch`);
  const rendered = markdown(article);
  await output(`read/${slug}.md`, rendered);
  manifest.articles.push({ slug, path, sha256: sha256(bytes) });
  articles.push(article);
}
for (const article of [...articles].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))) {
  index.push(`- ${article.publishedAt} / ${article.category} — [${article.title}](read/${article.slug}.md)`);
}
for (const name of (await readdir(resolve(root, "verification"))).sort()) {
  const path = `verification/${name}`;
  manifest.assets.push({ path, sha256: sha256(await readFile(resolve(root, path))) });
}
validateManifest(manifest);
await output("ARTICLES.md", `${index.join("\n")}\n`);
await output("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${check ? "Verified" : "Generated"} ${articles.length} articles and ${manifest.assets.length} verification assets.`);
