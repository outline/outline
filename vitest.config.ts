import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";
import swc from "unplugin-swc";
import { configDefaults, defineConfig } from "vitest/config";

// SSL_CERT_FILE is OpenSSL's CA bundle variable and may be present in the
// host environment running the tests; clear it so it is not resolved into
// Outline's SSL_CERT setting. The config is evaluated before the global setup
// and before workers spawn, so this covers every test process.
delete process.env.SSL_CERT_FILE;

const aliases = {
  "@server": path.resolve(__dirname, "./server"),
  "@shared": path.resolve(__dirname, "./shared"),
  "~": path.resolve(__dirname, "./app"),
  plugins: path.resolve(__dirname, "./plugins"),
};

const fileMock = path.resolve(__dirname, "./__mocks__/fileMock.js");

// Mirrors the server build's SWC config (.swcrc). `decoratorMetadata` stays off
// because every @Column has an explicit DataType, and emitting it would throw
// on the circular model graph; `useDefineForClassFields:false` keeps bare class
// fields from shadowing MobX observables. `tsconfigFile:false` stops the plugin
// re-deriving (and re-enabling metadata) from tsconfig.json.
const swcPlugin = () =>
  swc.vite({
    tsconfigFile: false,
    jsc: {
      parser: { syntax: "typescript", tsx: true, decorators: true },
      transform: {
        legacyDecorator: true,
        decoratorMetadata: false,
        useDefineForClassFields: false,
        react: { runtime: "automatic" },
      },
      keepClassNames: true,
      target: "es2020",
    },
    // Preserve ES module syntax so Vite resolves imports (e.g. ./rules → .ts).
    module: { type: "es6" },
  });

const sharedConfig = {
  resolve: { alias: aliases },
  plugins: [swcPlugin()],
  esbuild: false as const,
  oxc: false as const,
};

const aliasesAsArray = Object.entries(aliases).map(([find, replacement]) => ({
  find,
  replacement,
}));

const fileMockAlias = { find: /\.(gif|ttf|eot|svg)$/, replacement: fileMock };

const serverTestFiles = [
  "server/**/*.test.{ts,tsx}",
  "plugins/**/*.test.{ts,tsx}",
];

// Server tests share a module registry between files in a worker. A file that
// mocks or resets modules must opt out with this marker in its header so it
// runs isolated.
const ISOLATED_MARKER = "@vitest-isolate true";

const isolatedServerTestFiles = globSync(serverTestFiles, {
  cwd: __dirname,
  posix: true,
}).filter((file) => {
  const header = fs
    .readFileSync(path.join(__dirname, file), "utf8")
    .slice(0, 512);
  return header.includes(ISOLATED_MARKER);
});

const serverTestConfig = {
  globals: true,
  environment: "node" as const,
  setupFiles: [
    "./__mocks__/console.js",
    "./server/test/setupMocks.ts",
    "./server/test/setup.ts",
  ],
  globalSetup: ["./server/test/globalTeardown.ts"],
  fileParallelism: true,
};

export default defineConfig({
  ...sharedConfig,
  test: {
    globals: true,
    pool: "threads",
    // Unhandled promise rejections are logged but don't fail tests on their own.
    dangerouslyIgnoreUnhandledErrors: true,
    projects: [
      {
        ...sharedConfig,
        test: {
          ...serverTestConfig,
          name: "server",
          include: isolatedServerTestFiles,
        },
      },
      {
        ...sharedConfig,
        test: {
          ...serverTestConfig,
          name: "server-shared",
          include: serverTestFiles,
          exclude: [...configDefaults.exclude, ...isolatedServerTestFiles],
          isolate: false,
        },
      },
      {
        ...sharedConfig,
        resolve: { alias: [fileMockAlias, ...aliasesAsArray] },
        test: {
          name: "app",
          globals: true,
          environment: "jsdom",
          environmentOptions: {
            jsdom: { url: "http://localhost" },
          },
          include: ["app/**/*.test.{ts,tsx}"],
          setupFiles: ["./__mocks__/window.js", "./app/test/setup.ts"],
        },
      },
      {
        ...sharedConfig,
        test: {
          name: "shared-node",
          globals: true,
          environment: "node",
          include: ["shared/**/*.test.{ts,tsx}"],
          setupFiles: ["./__mocks__/console.js", "./shared/test/setup.ts"],
        },
      },
      {
        ...sharedConfig,
        resolve: { alias: [fileMockAlias, ...aliasesAsArray] },
        test: {
          name: "shared-jsdom",
          globals: true,
          environment: "jsdom",
          environmentOptions: {
            jsdom: { url: "http://localhost" },
          },
          include: ["shared/**/*.test.{ts,tsx}"],
          setupFiles: ["./__mocks__/window.js", "./shared/test/setupJsdom.ts"],
        },
      },
    ],
  },
});
