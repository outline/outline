export default class Queue {
  handler?: (job: unknown, done: () => void) => void;

  done() {
    //
  }

  on() {
    //
  }

  count() {
    return 0;
  }

  getDelayedCount() {
    return 0;
  }

  add(data: unknown) {
    const job = this.createJob(data);

    if (!this.handler) {
      return;
    }

    this.handler(job, () => this.done());
  }

  process(handler: (job: unknown, done: () => void) => void) {
    if (this.handler) {
      throw Error("Cannot define a handler more than once per Queue instance");
    }

    this.handler = handler;
  }

  createJob(data: unknown) {
    return {
      data,
    };
  }
}
