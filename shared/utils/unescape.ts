const unescape = (text: string) =>
  text.replace(/\\([\\`*{}[\]()#+\-.!_>])/g, "$1").replace(/\n\\\n/g, "\n\n");

export default unescape;
