/* oxlint-disable no-console */
/* oxlint-disable typescript/no-require-imports */
/* oxlint-disable no-undef */
const { exec } = require("child_process");
const { readdirSync } = require("fs");

const getDirectories = (source) =>
  readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
function execAsync(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout ? stdout : stderr);
      }
    });
  });
}

async function build() {
  // Clean previous build
  console.log("Clean previous build…");

  await Promise.all([
    execAsync("rm -rf ./build/server"),
    execAsync("rm -rf ./build/shared"),
    execAsync("rm -rf ./build/plugins"),
  ]);

  const d = getDirectories("./plugins");

  // Compile server, shared and plugins in a single SWC process, as process
  // startup costs far more than the compilation itself.
  console.log("Compiling…");
  await execAsync(
    `yarn swc ./server ./shared ./plugins -d ./build --extensions .ts,.tsx --ignore "**/*.test.ts,**/*.test.tsx,**/__mocks__/**,plugins/*/client/**" --quiet`
  );

  // Copy static files
  console.log("Copying static files…");
  await Promise.all([
    execAsync(
      "cp ./server/collaboration/Procfile ./build/server/collaboration/Procfile"
    ),
    execAsync(
      "cp ./server/static/error.dev.html ./build/server/error.dev.html"
    ),
    execAsync(
      "cp ./server/static/error.prod.html ./build/server/error.prod.html"
    ),
    execAsync("cp package.json ./build"),
    execAsync("cp -R ./shared/i18n/locales ./build/shared/i18n"),
    ...d.map(async (plugin) =>
      execAsync(
        `mkdir -p ./build/plugins/${plugin} && cp ./plugins/${plugin}/plugin.json ./build/plugins/${plugin}/plugin.json 2>/dev/null || :`
      )
    ),
  ]);

  console.log("Done!");
}

void build();
