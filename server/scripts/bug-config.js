module.exports = {
  // GitHub repository details
  originalRepo: "outline/outline",

  // Output directories
  outputDir: "bugs",
  tasksDir: "tasks",

  // GitHub API settings
  apiSettings: {
    perPage: 100,
    maxPages: 50, // Safety limit
    rateLimitDelay: 1000, // ms between requests
  },

  // Bug categorization keywords
  categories: {
    collaboration: [
      "collaboration",
      "real-time",
      "sync",
      "presence",
      "multi-user",
    ],
    authentication: ["auth", "login", "oauth", "session", "authentication"],
    "file-operations": ["import", "export", "file", "attachment", "upload"],
    "api-integration": ["api", "integration", "webhook", "third-party"],
    "ui-ux": ["ui", "ux", "interface", "user experience", "design"],
    performance: ["performance", "slow", "memory", "optimization"],
    database: ["database", "migration", "data", "persistence"],
    security: ["security", "vulnerability", "access control"],
    mobile: ["mobile", "responsive", "touch"],
    search: ["search", "find", "query"],
    editor: ["editor", "prosemirror", "rich text"],
    general: [], // catch-all
  },

  // Priority mapping
  priorityMapping: {
    high: ["high", "critical", "urgent"],
    medium: ["medium", "normal"],
    low: ["low", "minor"],
  },
};
