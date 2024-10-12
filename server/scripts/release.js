/* eslint-disable @typescript-eslint/no-var-requires */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { exit } = require("process");
const { addYears } = require("date-fns/addYears");

const input = process.argv.slice(2);

if (input.length === 0) {
  console.log("Usage: yarn release (major|minor|patch|1.2.3)");
  exit(1);
}

const root = path.resolve(__dirname, "..", "..");
const opts = {
  cwd: root,
};

execSync(`npm version ${input.join(" ")} --no-git-tag-version`, opts);

const package = require(path.resolve(root, "package.json"));

const newVersion = package.version;
const license = fs.readFileSync(path.resolve(root, "LICENSE"), "utf8", opts);
const newDate = addYears(new Date(), 4).toISOString().split("T")[0];

// Update license
const newLicense = license
  // Update version number
  .replace(
    /Licensed Work: {8}Outline (.*)/,
    `Licensed Work:        Outline ${newVersion}`
  )
  // Update change date
  .replace(/Change Date: {9}(.*)/, `Change Date:          ${newDate}`)
  // Update current year
  .replace(/\(c\) \d{4}/, `(c) ${new Date().getFullYear()}`);

fs.writeFileSync(path.resolve(root, "LICENSE"), newLicense);

execSync(`git add package.json`, opts);
execSync(`git add LICENSE`, opts);
execSync(`git commit -m "v${newVersion}"`, opts);
execSync(`git tag v${newVersion}`, opts);
execSync(`git push origin v${newVersion}`, opts);
execSync(`git push origin main`, opts);

console.log(`Released v${newVersion} 🚀`);
