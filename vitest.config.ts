import path from "node:path";
import babel from "vite-plugin-babel";
import { defineConfig } from "vitest/config";

const aliases = {
  "@server": path.resolve(__dirname, "./server"),
  "@shared": path.resolve(__dirname, "./shared"),
  "~": path.resolve(__dirname, "./app"),
  plugins: path.resolve(__dirname, "./plugins"),
};

const fileMock = path.resolve(__dirname, "./__mocks__/fileMock.js");

const babelPlugin = () =>
  babel({
    filter: /\.(t|j)sx?$/,
    babelConfig: {
      babelrc: false,
      configFile: false,
      sourceMaps: "inline",
      presets: [
        ["@babel/preset-react", { runtime: "automatic" }],
        ["@babel/preset-typescript", { allowDeclareFields: true }],
      ],
      plugins: [
        "babel-plugin-transform-typescript-metadata",
        ["@babel/plugin-proposal-decorators", { legacy: true }],
        "@babel/plugin-transform-class-properties",
      ],
    },
  });

const sharedConfig = {
  resolve: { alias: aliases },
  plugins: [babelPlugin()],
  esbuild: false as const,
  oxc: false as const,
};

const aliasesAsArray = Object.entries(aliases).map(([find, replacement]) => ({
  find,
  replacement,
}));

const fileMockAlias = { find: /\.(gif|ttf|eot|svg)$/, replacement: fileMock };

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
          name: "server",
          globals: true,
          environment: "node",
          include: ["server/**/*.test.{ts,tsx}", "plugins/**/*.test.{ts,tsx}"],
          setupFiles: [
            "./__mocks__/console.js",
            "./server/test/setupMocks.ts",
            "./server/test/setup.ts",
          ],
          globalSetup: ["./server/test/globalTeardown.ts"],
          fileParallelism: true,
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
          setupFiles: ["./__mocks__/window.js"],
        },
      },
    ],
  },
});
