/* eslint-disable flowtype/require-valid-file-annotation */
export default class Queue {
  name;

  constructor(name) {
    this.name = name;
  }

  process = (fn) => {
    console.log(`Registered function ${this.name}`);
    this.processFn = fn;
  };

  add = (data) => {
    console.log(`Running ${this.name}`);
    return this.processFn({ data });
  };
}
