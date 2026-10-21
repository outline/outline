/* oxlint-disable no-console */
/* oxlint-disable typescript/no-require-imports */
/* oxlint-disable no-undef */
const { exec, spawn } = require("child_process");
const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  watch,
} = require("fs");
const { writeFile } = require("fs/promises");
const path = require("path");

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
    `node_modules/.bin/swc ./server ./shared ./plugins -d ./build --extensions .ts,.tsx --ignore "**/*.test.ts,**/*.test.tsx,**/__mocks__/**,plugins/*/client/**" --quiet`
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

/**
 * Whether a source file is compiled into the server build.
 * @param file {string} path relative to the project root.
 * @return {boolean}
 */
function isCompiled(file) {
  return (
    /\.tsx?$/.test(file) &&
    !/\.test\.tsx?$/.test(file) &&
    !file.split(path.sep).includes("__mocks__") &&
    !/^plugins[\\/][^\\/]+[\\/]client[\\/]/.test(file)
  );
}

/**
 * The build output path of a source file.
 * @param file {string} path relative to the project root.
 * @return {string | undefined} the output path, or undefined if the file is not
 *   part of the build.
 */
function getDest(file) {
  if (isCompiled(file)) {
    return path.join("build", file.replace(/\.tsx?$/, ".js"));
  }
  if (
    /^plugins[\\/][^\\/]+[\\/]plugin\.json$/.test(file) ||
    /^shared[\\/]i18n[\\/]locales[\\/]/.test(file)
  ) {
    return path.join("build", file);
  }
  return undefined;
}

/**
 * The dependencies in package.json that are not installed.
 * @return {string[]} the names of the missing packages.
 */
function getMissingDependencies() {
  const { dependencies = {} } = JSON.parse(
    readFileSync("package.json", "utf8")
  );
  return Object.keys(dependencies).filter(
    (name) => !existsSync(path.join("node_modules", name, "package.json"))
  );
}

/**
 * Builds, then watches the source directories and updates the output of each
 * changed, added or removed file. A full build runs again after a failed one.
 * When a command is passed it is run, and restarted after each change that
 * affects the server.
 * @param command {string[]} the command and arguments to run, may be empty.
 */
async function watchSources(command) {
  const swc = require("@swc/core");
  const timers = new Map();
  let child;
  let restartTimer;
  let isBuilt = false;
  let isBuilding = false;
  let isBuildPending = false;

  const startServer = () => {
    const missing = getMissingDependencies();
    if (missing.length) {
      console.log(
        `Missing dependencies: ${missing.join(", ")}. Run "yarn install", the server starts when it completes.`
      );
      return;
    }

    // Run in a new process group so the forked service processes are stopped
    // together with the master.
    child = spawn(command[0], command.slice(1), {
      stdio: "inherit",
      detached: true,
    });
    child.once("exit", (code, signal) => {
      child = undefined;
      if (signal !== "SIGKILL") {
        console.log(
          `Server exited with ${signal ?? code}, waiting for changes…`
        );
      }
    });
  };

  const stopServer = (callback) => {
    if (!child) {
      callback?.();
      return;
    }
    if (callback) {
      child.once("exit", callback);
    }
    process.kill(-child.pid, "SIGKILL");
  };

  const restartServer = () => {
    if (!command.length || !isBuilt) {
      return;
    }
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      console.log("Restarting…");
      stopServer(startServer);
    }, 100);
  };

  const fullBuild = async () => {
    if (isBuilding) {
      isBuildPending = true;
      return;
    }

    isBuilding = true;
    try {
      await build();
      isBuilt = true;
    } catch (err) {
      console.error(err.message ?? err);
      console.log("Build failed, waiting for changes…");
    } finally {
      isBuilding = false;
    }

    if (isBuildPending) {
      isBuildPending = false;
      await fullBuild();
    } else if (isBuilt && command.length) {
      startServer();
    }
  };

  const updateFile = async (file) => {
    const dest = getDest(file);
    if (!dest) {
      return false;
    }

    if (!isCompiled(file)) {
      mkdirSync(path.dirname(dest), { recursive: true });
      copyFileSync(file, dest);
      console.log(`Copied ${file}`);
      return true;
    }

    const start = performance.now();
    try {
      const { code } = await swc.transformFile(file);
      mkdirSync(path.dirname(dest), { recursive: true });
      await writeFile(dest, code);
      console.log(
        `Compiled ${file} (${(performance.now() - start).toFixed(1)}ms)`
      );
      return true;
    } catch (err) {
      console.error(err.message ?? err);
      return false;
    }
  };

  const handleChange = async (file) => {
    const stats = statSync(file, { throwIfNoEntry: false });
    let isChanged = false;

    if (!stats) {
      // The path of a removed directory maps directly to its output.
      const dest = getDest(file) ?? path.join("build", file);
      if (existsSync(dest)) {
        rmSync(dest, { recursive: true, force: true });
        isChanged = true;
      }
    } else if (stats.isDirectory()) {
      // A directory that was moved in does not emit events for its files.
      for (const entry of readdirSync(file, { recursive: true })) {
        isChanged = (await updateFile(path.join(file, entry))) || isChanged;
      }
    } else {
      isChanged = await updateFile(file);
    }

    // The editor and components are mostly used by the client, so changes
    // there are picked up on the next restart.
    if (isChanged && !/^shared[\\/](editor|components)[\\/]/.test(file)) {
      restartServer();
    }
  };

  for (const dir of ["server", "shared", "plugins"]) {
    watch(dir, { recursive: true }, (_event, filename) => {
      if (!filename) {
        return;
      }
      if (!isBuilt) {
        void fullBuild();
        return;
      }

      // Editors can emit several events for one save, so debounce each file.
      const file = path.join(dir, filename);
      clearTimeout(timers.get(file));
      timers.set(
        file,
        setTimeout(() => {
          timers.delete(file);
          void handleChange(file);
        }, 50)
      );
    });
  }

  watch(".", (_event, filename) => {
    if (/^\.env(\.local|\.development)?$/.test(filename ?? "")) {
      restartServer();
    }
  });

  // Yarn writes the install state after the postinstall script, so a restart
  // here picks up the dependencies of a newly checked out branch.
  mkdirSync(".yarn", { recursive: true });
  watch(".yarn", (_event, filename) => {
    if (filename === "install-state.gz") {
      restartServer();
    }
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => stopServer(() => process.exit(0)));
  }

  await fullBuild();
  console.log("Watching for changes…");
}

if (process.argv.includes("--watch")) {
  // Arguments after "--" are the command to run, e.g. the server.
  const separator = process.argv.indexOf("--");
  const command = separator === -1 ? [] : process.argv.slice(separator + 1);
  void watchSources(command);
} else {
  void build();
}
