type Processor = (job: unknown) => unknown;

/**
 * Registry of processors keyed by queue name, allowing the mocked Queue to
 * invoke the processor registered by a mocked Worker for the same queue.
 */
const processors = new Map<string, Processor>();

export class Queue {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  on() {
    //
  }

  async count() {
    return 0;
  }

  async getDelayedCount() {
    return 0;
  }

  async getWaitingCount() {
    return 0;
  }

  async add(name: string, data: unknown, opts?: Record<string, unknown>) {
    const job = this.createJob(name, data, opts);
    const processor = processors.get(this.name);

    let returnvalue: unknown;
    if (processor) {
      returnvalue = await processor(job);
    }

    return {
      ...job,
      returnvalue,
      waitUntilFinished: async () => returnvalue,
    };
  }

  async close() {
    //
  }

  private createJob(
    name: string,
    data: unknown,
    opts?: Record<string, unknown>
  ) {
    return {
      name,
      data,
      opts: opts ?? {},
      attemptsMade: 0,
    };
  }
}

export class QueueEvents {
  on() {
    //
  }

  async waitUntilReady() {
    //
  }

  async close() {
    //
  }
}

export class Worker {
  name: string;

  constructor(name: string, processor: Processor) {
    if (processors.has(name)) {
      throw Error("Cannot define more than one Worker per queue in tests");
    }

    this.name = name;
    processors.set(name, processor);
  }

  on() {
    //
  }

  async close() {
    processors.delete(this.name);
  }
}
