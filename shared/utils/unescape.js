// @flow

const unescape = (text: string) => {
  return text.replace(/\\([\\`*{}[\]()#+\-.!_>])/g, '$1');
};

export default unescape;
