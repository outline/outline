/* oxlint-disable no-console */
/* oxlint-disable typescript/no-require-imports */
/* oxlint-disable no-undef */
const { exec, spawn } = require("child_process");
const { existsSync, mkdirSync, readdirSync, rmSync, watch } = require("fs");
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
 * Watches the source directories and compiles each changed file, or removes
 * the output of a deleted file. A full build must run first. When a command is
 * passed it is run, and restarted after each change that affects the server.
 * @param command {string[]} the command and arguments to run, may be empty.
 */
function watchSources(command) {
  const swc = require("@swc/core");
  const timers = new Map();
  let child;
  let restartTimer;

  const startServer = () => {
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
    if (!command.length) {
      return;
    }
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      console.log("Restarting…");
      stopServer(startServer);
    }, 100);
  };

  const handleChange = async (file) => {
    const dest = path.join("build", file.replace(/\.tsx?$/, ".js"));

    if (!existsSync(file)) {
      rmSync(dest, { force: true });
      restartServer();
      return;
    }

    const start = performance.now();
    try {
      const { code } = await swc.transformFile(file);
      mkdirSync(path.dirname(dest), { recursive: true });
      await writeFile(dest, code);
      console.log(
        `Compiled ${file} (${(performance.now() - start).toFixed(1)}ms)`
      );
    } catch (err) {
      console.error(err.message ?? err);
      return;
    }

    // The editor and components are mostly used by the client, so changes
    // there are picked up on the next restart.
    if (!/^shared[\\/](editor|components)[\\/]/.test(file)) {
      restartServer();
    }
  };

  for (const dir of ["server", "shared", "plugins"]) {
    watch(dir, { recursive: true }, (_event, filename) => {
      const file = filename ? path.join(dir, filename) : undefined;
      if (!file || !isCompiled(file)) {
        return;
      }

      // Editors can emit several events for one save, so debounce each file.
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

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => stopServer(() => process.exit(0)));
  }

  if (command.length) {
    startServer();
  }
  console.log("Watching for changes…");
}

if (process.argv.includes("--watch")) {
  // Arguments after "--" are the command to run, e.g. the server.
  const separator = process.argv.indexOf("--");
  const command = separator === -1 ? [] : process.argv.slice(separator + 1);
  void build().then(() => watchSources(command));
} else {
  void build();
}
