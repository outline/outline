// @flow
declare var process: {
  exit: (code?: number) => void,
  cwd: () => string,
  argv: Array<string>,
  env: {
    [string]: string,
  },
};

declare var EDITOR_VERSION: string;
