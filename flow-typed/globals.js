// @flow
declare var process: {
  exit: (code?: number) => void,
  cwd: () => string,
  argv: Array<string>,
  on: (event: string, listener: Function) => void,
  once: (event: string, listener: Function) => void,
  off: (event: string, listener: Function) => void,
  env: {
    [string]: string,
  },
  stdout: Stream,
  stderr: Stream,
};

declare var EDITOR_VERSION: string;
