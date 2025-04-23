/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const { exec } = require("child_process");
const { readdirSync, existsSync } = require("fs");
const path = require("path");
const fs = require("fs-extra");

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

  try {
    await Promise.all([
      fs.remove(path.join(__dirname, "build", "server")),
      fs.remove(path.join(__dirname, "build", "plugins")),
    ]);
  } catch (error) {
    console.error("Error while cleaning:", error);
  }

  const d = getDirectories("./plugins");

  // Compile server and shared
  console.log("Compiling…");
  await Promise.all([
    execAsync(
      "yarn babel --extensions .ts,.tsx --quiet -d ./build/server ./server"
    ),
    execAsync(
      "yarn babel --extensions .ts,.tsx --quiet -d ./build/shared ./shared"
    ),
    ...d.map(async (plugin) => {
      const hasServer = existsSync(`./plugins/${plugin}/server`);

      if (hasServer) {
        await execAsync(
          `yarn babel --extensions .ts,.tsx --quiet -d "./build/plugins/${plugin}/server" "./plugins/${plugin}/server"`
        );
      }

      const hasShared = existsSync(`./plugins/${plugin}/shared`);

      if (hasShared) {
        await execAsync(
          `yarn babel --extensions .ts,.tsx --quiet -d "./build/plugins/${plugin}/shared" "./plugins/${plugin}/shared"`
        );
      }
    }),
  ]);

  // Copy static files
  console.log("Copying static files…");
  try {
    await Promise.all([
      fs.copy(
        path.join(__dirname, "server", "collaboration", "Procfile"),
        path.join(__dirname, "build", "server", "collaboration", "Procfile")
      ),
      fs.copy(
        path.join(__dirname, "server", "static", "error.dev.html"),
        path.join(__dirname, "build", "server", "error.dev.html")
      ),
      fs.copy(
        path.join(__dirname, "server", "static", "error.prod.html"),
        path.join(__dirname, "build", "server", "error.prod.html")
      ),
      fs.copy(
        path.join(__dirname, "package.json"),
        path.join(__dirname, "build", "package.json")
      ),
      ...d.map(async (plugin) => {
        const pluginJsonPath = path.join(
          __dirname,
          "plugins",
          plugin,
          "plugin.json"
        );
        const destDir = path.join(__dirname, "build", "plugins", plugin);
        const destPath = path.join(destDir, "plugin.json");

        if (existsSync(pluginJsonPath)) {
          await fs.ensureDir(destDir);
          await fs.copy(pluginJsonPath, destPath);
        }
      }),
    ]);
  } catch (error) {
    console.error("Error while copying files:", error);
  }

  console.log("Done!");
}

void build();
