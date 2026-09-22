#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Parse arguments
const args = process.argv.slice(2);
function getArg(flag, defaultValue = null) {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return defaultValue;
}

const isDryRun = args.includes("--dry-run");
const outputGithubEnv = args.includes("--output-github-env");
const manualBump = getArg("--bump", "auto");
const repoName = getArg("--repo", "MusfiqDehan/Wufud");

function run(cmd, silent = false) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: "utf8", stdio: silent ? "pipe" : ["pipe", "pipe", "ignore"] }).trim();
  } catch (err) {
    if (!silent) console.error(`Command failed: ${cmd}`, err.message);
    return "";
  }
}

// Ensure tags are fetched
try {
  run("git fetch --tags --force", true);
} catch {
  /* ignore */
}

// 1. Determine previous tag
const allTags = run("git tag -l --sort=-v:refname", true)
  .split("\n")
  .map((t) => t.trim())
  .filter(Boolean);

// If no tags exist in git, assume last tag was 1.4 as requested
const isSimulatedBase = allTags.length === 0;
const prevTag = allTags[0] || "1.4";

// 2. Get commits since previous tag
let commitRange = "HEAD";
if (!isSimulatedBase && prevTag) {
  const tagExists = run(`git rev-parse --verify --quiet refs/tags/${prevTag}`, true);
  if (tagExists) {
    commitRange = `${prevTag}..HEAD`;
  }
}

const logFormat = "%H|%s|%an|%cI";
const rawCommits = run(`git log ${commitRange} --pretty=format:"${logFormat}" --no-merges`, true);

const commitLines = rawCommits ? rawCommits.split("\n").map((l) => l.trim()).filter(Boolean) : [];

if (commitLines.length === 0 && prevTag && !isSimulatedBase) {
  console.log(`[Changelog] No new commits since tag ${prevTag}. Nothing to release.`);
  process.exit(0);
}

// Parse commits
const parsedCommits = commitLines.map((line) => {
  const [hash, subject, author, date] = line.split("|");
  return { hash, shortHash: hash.slice(0, 7), subject: subject || "", author: author || "", date: date || "" };
});

// 3. Determine bump type
let bump = manualBump !== "auto" ? manualBump : "minor";

if (manualBump === "auto") {
  const hasBreaking = parsedCommits.some(
    (c) => c.subject.includes("BREAKING CHANGE") || /^[a-z]+(\([a-z0-9_-]+\))?!:/.test(c.subject),
  );
  const hasFeature = parsedCommits.some((c) => /^feat(\([a-z0-9_-]+\))?:/i.test(c.subject));

  if (hasBreaking) {
    bump = "major";
  } else if (hasFeature) {
    bump = "minor";
  } else {
    bump = "minor";
  }
}

// 4. Calculate new version and tag
const hasV = prevTag.startsWith("v");
const cleanVersion = prevTag.replace(/^v/, "");
const parts = cleanVersion.split(".");
const isTwoPart = parts.length === 2;

let major = parseInt(parts[0] || "1", 10);
let minor = parseInt(parts[1] || "4", 10);
let patch = parts.length > 2 ? parseInt(parts[2] || "0", 10) : 0;

let nextVersion = "1.5";
if (isTwoPart) {
  if (bump === "major") {
    major += 1;
    minor = 0;
  } else {
    minor += 1;
  }
  nextVersion = `${major}.${minor}`;
} else {
  if (bump === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  nextVersion = `${major}.${minor}.${patch}`;
}

const newTag = hasV ? `v${nextVersion}` : nextVersion;
console.log(`[Changelog] Previous Tag: ${prevTag} (simulated: ${isSimulatedBase}) | Bump: ${bump} | New Tag: ${newTag}`);

// 5. Categorize commits
const categories = {
  features: { title: "🚀 Features & Capabilities", items: [] },
  fixes: { title: "🐛 Bug Fixes & Stability", items: [] },
  perf: { title: "⚡ Performance Improvements", items: [] },
  security: { title: "🔒 Security & Access Control", items: [] },
  maintenance: { title: "🛠️ Maintenance & Refactoring", items: [] },
  other: { title: "📦 Other Changes", items: [] },
};

function cleanSubject(subject) {
  return subject
    .replace(/^(feat|fix|perf|sec|chore|refactor|docs|test|build|ci)(\([a-z0-9_-]+\))?:\s*/i, "")
    .trim();
}

for (const c of parsedCommits) {
  const sub = c.subject;
  const commitUrl = `https://github.com/${repoName}/commit/${c.hash}`;
  const formattedItem = {
    shortHash: c.shortHash,
    commitUrl,
    author: c.author,
    rawSubject: sub,
    cleanSubject: cleanSubject(sub),
  };

  if (/^feat/i.test(sub)) {
    categories.features.items.push(formattedItem);
  } else if (/^fix/i.test(sub)) {
    categories.fixes.items.push(formattedItem);
  } else if (/^perf/i.test(sub)) {
    categories.perf.items.push(formattedItem);
  } else if (/^(sec|security|auth)/i.test(sub)) {
    categories.security.items.push(formattedItem);
  } else if (/^(chore|refactor|build|ci|test|docs)/i.test(sub)) {
    categories.maintenance.items.push(formattedItem);
  } else {
    categories.other.items.push(formattedItem);
  }
}

// 6. Build Release Notes Markdown
const releaseDate = new Date().toISOString().split("T")[0];
let releaseNotesMd = `## What's Changed in ${newTag} (${releaseDate})\n\n`;

for (const [key, cat] of Object.entries(categories)) {
  if (cat.items.length > 0) {
    releaseNotesMd += `### ${cat.title}\n\n`;
    for (const item of cat.items) {
      releaseNotesMd += `- ${item.cleanSubject} ([${item.shortHash}](${item.commitUrl})) by @${item.author}\n`;
    }
    releaseNotesMd += "\n";
  }
}

if (prevTag) {
  releaseNotesMd += `**Full Changelog**: https://github.com/${repoName}/compare/${prevTag}...${newTag}\n`;
} else {
  releaseNotesMd += `**Initial Release**: https://github.com/${repoName}/releases/tag/${newTag}\n`;
}

// 7. Write release_notes.md for GitHub Release command
fs.writeFileSync(path.join(rootDir, "release_notes.md"), releaseNotesMd.trim() + "\n", "utf8");
console.log(`[Changelog] Generated release_notes.md`);

// 8. Update or create CHANGELOG.md
const changelogPath = path.join(rootDir, "CHANGELOG.md");
let existingChangelog = "";
if (fs.existsSync(changelogPath)) {
  existingChangelog = fs.readFileSync(changelogPath, "utf8");
}

const changelogHeader = `# Changelog

All notable changes to the **Wufud** SaaS platform will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;

let updatedChangelogContent = "";
if (existingChangelog.includes("# Changelog")) {
  const contentWithoutHeader = existingChangelog.replace(/# Changelog[\s\S]*?(?=## |$)/, "").trim();
  updatedChangelogContent = `${changelogHeader}${releaseNotesMd.trim()}\n\n---\n\n${contentWithoutHeader}\n`;
} else {
  updatedChangelogContent = `${changelogHeader}${releaseNotesMd.trim()}\n\n---\n\n${existingChangelog.trim()}\n`;
}

if (!isDryRun) {
  fs.writeFileSync(changelogPath, updatedChangelogContent.trim() + "\n", "utf8");
  console.log(`[Changelog] Updated CHANGELOG.md`);
}

// 9. Update frontend/src/data/changelog.json
const jsonDir = path.join(rootDir, "frontend", "src", "data");
if (!fs.existsSync(jsonDir)) {
  fs.mkdirSync(jsonDir, { recursive: true });
}

const jsonPath = path.join(jsonDir, "changelog.json");
let existingEntries = [];
if (fs.existsSync(jsonPath)) {
  try {
    existingEntries = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } catch {
    existingEntries = [];
  }
}

// Prepare structured JSON entry
const structuredChanges = [];
for (const [key, cat] of Object.entries(categories)) {
  for (const item of cat.items) {
    structuredChanges.push({
      category: key,
      text: item.cleanSubject,
      hash: item.shortHash,
      commitUrl: item.commitUrl,
      author: item.author,
    });
  }
}

const newJsonEntry = {
  version: newTag,
  date: releaseDate,
  type: bump,
  title: bump === "major" ? `Wufud Platform Upgrade ${newTag}` : `Platform Improvements & Features (${newTag})`,
  summary: `Automated release ${newTag} with ${parsedCommits.length} update(s) across platform services.`,
  changes: structuredChanges,
};

const updatedJsonEntries = [newJsonEntry, ...existingEntries.filter((e) => e.version !== newTag)];

if (!isDryRun) {
  fs.writeFileSync(jsonPath, JSON.stringify(updatedJsonEntries, null, 2) + "\n", "utf8");
  console.log(`[Changelog] Updated frontend/src/data/changelog.json`);
}

// 10. Output GitHub Actions step outputs if requested
if (outputGithubEnv && process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_tag=${newTag}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `prev_tag=${prevTag}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `bump_type=${bump}\n`);
  console.log(`[Changelog] Set GITHUB_OUTPUT new_tag=${newTag}`);
}
