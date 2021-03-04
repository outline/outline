// @flow
declare var process: {
  exit: (code?: number) => void,
  env: {
    [string]: string,
  },
};

declare var EDITOR_VERSION: string;
