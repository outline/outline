// @flow

const unescape = (text: string) => {
  return text
    .replace(/\\([\\`*{}[\]()#+\-.!_>])/g, "$1")
    .replace(/\n\\\n/g, "\n\n");
};

export default unescape;
