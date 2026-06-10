/* oxlint-disable no-console */
/* oxlint-disable @typescript-oxlint/no-var-requires */
/* oxlint-disable no-undef */
const { exec } = require("child_process");
const { readdirSync, existsSync, copyFileSync, mkdirSync, rmSync } = require("fs");
const path = require("path");

const getDirectories = (source) =>
  readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

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

function rmrf(dirPath) {
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
  }
}

function cpFile(src, dest) {
  const destDir = path.dirname(dest);
  mkdirSync(destDir, { recursive: true });
  if (existsSync(src)) {
    copyFileSync(src, dest);
  }
}

async function build() {
  // Clean previous build
  console.log("Clean previous build…");
  rmrf("./build/server");
  rmrf("./build/plugins");

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
  ]);

  for (const plugin of d) {
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
  }

  // Copy static files
  console.log("Copying static files…");
  cpFile("./server/collaboration/Procfile", "./build/server/collaboration/Procfile");
  cpFile("./server/static/error.dev.html", "./build/server/error.dev.html");
  cpFile("./server/static/error.prod.html", "./build/server/error.prod.html");
  cpFile("./package.json", "./build/package.json");

  for (const plugin of d) {
    const src = `./plugins/${plugin}/plugin.json`;
    const dest = `./build/plugins/${plugin}/plugin.json`;
    mkdirSync(`./build/plugins/${plugin}`, { recursive: true });
    if (existsSync(src)) {
      copyFileSync(src, dest);
    }
  }

  console.log("Done!");
}

void build();
