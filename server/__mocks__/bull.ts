export default class Queue {
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

  add = function (data: any) {
    const job = this.createJob(data);

    if (!this.handler) {
      throw Error(
        "Mocking version requires handler to be set before first add()"
      );
    }

    this.handler(job, this.done);
  };

  process = function (handler: any) {
    if (this.handler) {
      throw Error("Cannot define a handler more than once per Queue instance");
    }

    this.handler = handler;
  };

  createJob = function (data: any) {
    return {
      data: data,
    };
  };
}
