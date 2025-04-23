/* eslint-disable @typescript-eslint/no-var-requires, no-console */
const path = require("path");
const fs = require("fs-extra");

async function copyI18n() {
  try {
    const buildDir = path.join(__dirname, "../../build/shared/i18n");
    const localesDir = path.join(__dirname, "../../shared/i18n/locales");

    // Ensure build directory exists
    await fs.ensureDir(buildDir);

    // Copy locales to build directory
    await fs.copy(localesDir, path.join(buildDir, "locales"));

    console.log("i18n files copied successfully");
  } catch (error) {
    console.error("Error copying i18n files:", error);
    process.exit(1);
  }
}

void copyI18n();
