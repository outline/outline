// @flow
declare var process: {
  exit: (code?: number) => void,
  cwd: () => string,
  env: {
    [string]: string,
  },
};

declare var EDITOR_VERSION: string;
