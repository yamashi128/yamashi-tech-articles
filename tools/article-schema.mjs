import { createHash } from "node:crypto";

export const ARTICLE_REPOSITORY = "yamashi128/yamashi-tech-articles";
export const ARTICLE_CATEGORIES = ["News", "Deep Dive", "Research"];
export const ARTICLE_TAGS = ["AI / ML", "AI Agents", "DevTools", "Software Engineering", "Industry", "Career", "Security", "Python", "TypeScript"];
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const COMMIT = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function object(value, label) {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value), `${label}: expected an object`);
}

function text(value, label) {
  requireValue(typeof value === "string" && value.trim().length > 0, `${label}: expected nonempty text`);
}

function texts(value, label) {
  requireValue(Array.isArray(value) && value.length > 0, `${label}: expected a nonempty list`);
  value.forEach((item, index) => text(item, `${label}[${index}]`));
}

function date(value, label) {
  requireValue(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value, `${label}: invalid date`);
}

export function validateArticle(article) {
  object(article, "article");
  requireValue(typeof article.slug === "string" && SLUG.test(article.slug), "article: invalid slug");
  const label = article.slug;
  for (const key of ["title", "summary"]) text(article[key], `${label}.${key}`);
  requireValue(ARTICLE_CATEGORIES.includes(article.category), `${label}: unknown category`);
  texts(article.tags, `${label}.tags`);
  requireValue(article.tags.every((tag) => ARTICLE_TAGS.includes(tag)) && new Set(article.tags).size === article.tags.length, `${label}: unknown or duplicate tag`);
  for (const key of ["publishedAt", "checkedAt"]) date(article[key], `${label}.${key}`);
  if (article.updatedAt !== undefined) {
    date(article.updatedAt, `${label}.updatedAt`);
    requireValue(article.updatedAt >= article.publishedAt, `${label}: update precedes publication`);
  }
  if (article.researchFormat !== undefined) {
    requireValue(article.category === "Research" && ["Paper Review", "Research Roundup", "Survey"].includes(article.researchFormat), `${label}: invalid research format`);
  }
  requireValue(Number.isInteger(article.readingMinutes) && article.readingMinutes > 0, `${label}: invalid reading time`);
  texts(article.limitations, `${label}.limitations`);
  requireValue(Array.isArray(article.sections) && article.sections.length > 0, `${label}: missing sections`);
  article.sections.forEach((section, index) => {
    const sectionLabel = `${label}.sections[${index}]`;
    object(section, sectionLabel);
    text(section.heading, `${sectionLabel}.heading`);
    texts(section.paragraphs, `${sectionLabel}.paragraphs`);
    if (section.bullets !== undefined) texts(section.bullets, `${sectionLabel}.bullets`);
    if (section.code !== undefined) {
      object(section.code, `${sectionLabel}.code`);
      for (const key of ["label", "language", "value"]) text(section.code[key], `${sectionLabel}.code.${key}`);
    }
    if (section.table !== undefined) {
      object(section.table, `${sectionLabel}.table`);
      texts(section.table.columns, `${sectionLabel}.table.columns`);
      if (section.table.caption !== undefined) text(section.table.caption, `${sectionLabel}.table.caption`);
      requireValue(Array.isArray(section.table.rows) && section.table.rows.length > 0, `${sectionLabel}: missing table rows`);
      section.table.rows.forEach((row) => {
        requireValue(Array.isArray(row) && row.length === section.table.columns.length, `${sectionLabel}: table column mismatch`);
        row.forEach((cell) => requireValue(typeof cell === "string", `${sectionLabel}: invalid table cell`));
      });
    }
  });
  requireValue(Array.isArray(article.references) && article.references.length > 0, `${label}: missing references`);
  article.references.forEach((reference) => {
    object(reference, `${label}.reference`);
    text(reference.label, `${label}.reference.label`);
    text(reference.url, `${label}.reference.url`);
    requireValue(/^https:\/\//.test(reference.url) || /^\/(?!\/)/.test(reference.url), `${label}: unsafe reference URL`);
  });
  return article;
}

export function validateManifest(manifest) {
  object(manifest, "manifest");
  requireValue(manifest.schemaVersion === 1 && manifest.repository === ARTICLE_REPOSITORY, "manifest: unsupported source");
  requireValue(Array.isArray(manifest.articles) && manifest.articles.length > 0 && manifest.articles.length <= 1000, "manifest: invalid article count");
  const paths = new Set();
  for (const entry of manifest.articles) {
    object(entry, "manifest entry");
    requireValue(typeof entry.slug === "string" && SLUG.test(entry.slug) && entry.path === `articles/${entry.slug}.json`, "manifest: unsafe article path");
    requireValue(HASH.test(entry.sha256) && !paths.has(entry.path), "manifest: duplicate article or invalid digest");
    paths.add(entry.path);
  }
  requireValue(Array.isArray(manifest.assets), "manifest: missing asset list");
  for (const asset of manifest.assets) {
    object(asset, "manifest asset");
    requireValue(typeof asset.path === "string" && /^verification\/[a-z0-9-]+\.(?:py|json|txt)$/.test(asset.path), "manifest: unsafe asset path");
    requireValue(HASH.test(asset.sha256) && !paths.has(asset.path), "manifest: duplicate asset or invalid digest");
    paths.add(asset.path);
  }
  return manifest;
}

export function verifyDigest(bytes, expected, label) {
  requireValue(sha256(bytes) === expected, `${label}: content digest mismatch`);
}
