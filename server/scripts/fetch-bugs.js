/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Configuration
const ORIGINAL_REPO = "outline/outline";
const OUTPUT_DIR = path.resolve(__dirname, "..", "..", "bugs");
const TASKS_DIR = path.resolve(__dirname, "..", "..", "tasks");

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

if (!fs.existsSync(TASKS_DIR)) {
  fs.mkdirSync(TASKS_DIR, { recursive: true });
}

// GitHub API helper functions
async function fetchGitHubIssues(page = 1, perPage = 100) {
  const url = `https://api.github.com/repos/${ORIGINAL_REPO}/issues?state=open&labels=bug&per_page=${perPage}&page=${page}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Outline-Bug-Collector",
      },
    });

    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching issues from page ${page}:`, error.message);
    return [];
  }
}

// Parse issue data and categorize
function categorizeBug(issue) {
  const title = issue.title.toLowerCase();
  const body = issue.body?.toLowerCase() || "";
  const labels = issue.labels.map((label) => label.name.toLowerCase());

  // Categorization logic based on keywords and labels
  if (
    title.includes("collaboration") ||
    title.includes("real-time") ||
    body.includes("collaboration")
  ) {
    return "collaboration";
  }
  if (
    title.includes("auth") ||
    title.includes("login") ||
    title.includes("oauth") ||
    body.includes("authentication")
  ) {
    return "authentication";
  }
  if (
    title.includes("import") ||
    title.includes("export") ||
    title.includes("file") ||
    body.includes("import")
  ) {
    return "file-operations";
  }
  if (
    title.includes("api") ||
    title.includes("integration") ||
    body.includes("api")
  ) {
    return "api-integration";
  }
  if (
    title.includes("ui") ||
    title.includes("ux") ||
    title.includes("interface") ||
    body.includes("ui")
  ) {
    return "ui-ux";
  }
  if (
    title.includes("performance") ||
    title.includes("slow") ||
    title.includes("memory") ||
    body.includes("performance")
  ) {
    return "performance";
  }
  if (
    title.includes("database") ||
    title.includes("migration") ||
    body.includes("database")
  ) {
    return "database";
  }
  if (
    title.includes("security") ||
    title.includes("vulnerability") ||
    body.includes("security")
  ) {
    return "security";
  }
  if (
    title.includes("mobile") ||
    title.includes("responsive") ||
    body.includes("mobile")
  ) {
    return "mobile";
  }
  if (title.includes("search") || body.includes("search")) {
    return "search";
  }
  if (title.includes("editor") || body.includes("editor")) {
    return "editor";
  }

  return "general";
}

// Generate task file content
function generateTaskContent(issue, category) {
  const priority = issue.labels.some((label) => label.name === "high")
    ? "High"
    : issue.labels.some((label) => label.name === "medium")
      ? "Medium"
      : "Low";

  const status = issue.state === "open" ? "Open" : "Closed";
  const assignees = issue.assignees.map((a) => a.login).join(", ");

  return `# Bug: ${issue.title}

## Details
- **Issue ID**: #${issue.number}
- **Status**: ${status}
- **Priority**: ${priority}
- **Category**: ${category}
- **Created**: ${new Date(issue.created_at).toLocaleDateString()}
- **Updated**: ${new Date(issue.updated_at).toLocaleDateString()}
- **Author**: ${issue.user.login}
${assignees ? `- **Assignees**: ${assignees}` : ""}

## Labels
${issue.labels.map((label) => `- ${label.name}`).join("\n")}

## Description
${issue.body || "No description provided."}

## Original Issue
${issue.html_url}

## Notes
- This bug was imported from the original Outline repository
- Original issue: ${issue.html_url}
- Please verify if this issue is still relevant in this fork

## Tasks
- [ ] Investigate if this bug exists in current codebase
- [ ] Reproduce the issue if possible
- [ ] Determine root cause
- [ ] Implement fix
- [ ] Add tests to prevent regression
- [ ] Update documentation if needed

---
*Imported on ${new Date().toISOString()}*
`;
}

// Generate category summary
function generateCategorySummary(bugsByCategory) {
  let summary = `# Open Bug Collection Summary

Generated on: ${new Date().toISOString()}
Source Repository: https://github.com/${ORIGINAL_REPO}

## Statistics
- Total Open Bugs: ${Object.values(bugsByCategory).flat().length}
- All bugs shown are currently open and active

## Categories

`;

  for (const [category, bugs] of Object.entries(bugsByCategory)) {
    summary += `### ${category.charAt(0).toUpperCase() + category.slice(1).replace("-", " ")} (${bugs.length})
- Files: ${bugs.map((b) => `[Bug #${b.number}](./${category}/${b.number}.md)`).join(", ")}

`;
  }

  return summary;
}

// Main execution
async function main() {
  console.log("🔄 Fetching bugs from original Outline repository...");

  let allIssues = [];
  let page = 1;
  let hasMore = true;

  // Fetch all pages
  while (hasMore) {
    console.log(`📄 Fetching page ${page}...`);
    const issues = await fetchGitHubIssues(page);

    if (issues.length === 0) {
      hasMore = false;
    } else {
      allIssues = allIssues.concat(issues);
      page++;
    }
  }

  console.log(`✅ Found ${allIssues.length} bug issues`);

  // Categorize bugs
  const bugsByCategory = {};

  for (const issue of allIssues) {
    const category = categorizeBug(issue);
    if (!bugsByCategory[category]) {
      bugsByCategory[category] = [];
    }
    bugsByCategory[category].push(issue);
  }

  // Create category directories and task files
  for (const [category, bugs] of Object.entries(bugsByCategory)) {
    const categoryDir = path.join(TASKS_DIR, category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }

    console.log(
      `📝 Creating tasks for category: ${category} (${bugs.length} bugs)`
    );

    for (const bug of bugs) {
      const taskContent = generateTaskContent(bug, category);
      const taskFile = path.join(categoryDir, `${bug.number}.md`);
      fs.writeFileSync(taskFile, taskContent);
    }
  }

  // Generate summary
  const summaryContent = generateCategorySummary(bugsByCategory);
  fs.writeFileSync(path.join(OUTPUT_DIR, "README.md"), summaryContent);

  // Generate JSON export
  const jsonExport = {
    metadata: {
      generated: new Date().toISOString(),
      source: `https://github.com/${ORIGINAL_REPO}`,
      totalBugs: allIssues.length,
    },
    bugs: allIssues.map((issue) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      category: categorizeBug(issue),
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      user: issue.user.login,
      labels: issue.labels.map((l) => l.name),
      html_url: issue.html_url,
    })),
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "bugs.json"),
    JSON.stringify(jsonExport, null, 2)
  );

  console.log("🎉 Bug collection complete!");
  console.log(
    `📊 Summary: ${allIssues.length} bugs categorized into ${Object.keys(bugsByCategory).length} categories`
  );
  console.log(`📁 Tasks created in: ${TASKS_DIR}`);
  console.log(`📄 Summary saved to: ${path.join(OUTPUT_DIR, "README.md")}`);
  console.log(`📋 JSON export saved to: ${path.join(OUTPUT_DIR, "bugs.json")}`);
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fetchGitHubIssues, categorizeBug, generateTaskContent };
