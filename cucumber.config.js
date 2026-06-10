/** @type {import('@cucumber/cucumber').IConfiguration} */
module.exports = {
  default: {
    requireModule: ["ts-node/register"],
    require: ["e2e/steps/**/*.ts"],
    features: ["e2e/features/**/*.feature"],
    language: "es",
    format: [
      "progress-bar",
      "html:e2e/reports/cucumber-report.html",
      "json:e2e/reports/cucumber-report.json",
    ],
    formatOptions: {
      snippetInterface: "async-await",
    },
    worldParameters: {
      baseUrl: process.env.TEST_BASE_URL ?? "http://localhost:3000",
    },
  },
};
