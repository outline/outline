import type { Queue } from "bull";
import Logger from "@server/logging/Logger";
import Redis from "@server/storage/redis";
import HealthMonitor from "./HealthMonitor";

/**
 * Minimal Bull queue stub exposing only the event emitter and key helper that the monitor
 * relies on.
 */
function buildQueue(name: string) {
  return {
    name,
    on() {
      return this;
    },
    toKey(type: string) {
      return `bull:${name}:${type}`;
    },
  };
}

/** Fills the waiting list of a queue with the given number of jobs. */
async function addWaitingJobs(name: string, count: number) {
  await Redis.defaultClient.rpush(
    `bull:${name}:wait`,
    ...Array.from({ length: count }, (_value, index) => `job-${index}`)
  );
}

describe("HealthMonitor", () => {
  let exit: ReturnType<typeof vi.spyOn>;
  let fatal: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    fatal = vi.spyOn(Logger, "fatal").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should exit when an inactive queue has jobs waiting", async () => {
    const queue = buildQueue("stalled");
    await addWaitingJobs("stalled", HealthMonitor.maxWaitingJobs + 1);

    vi.useFakeTimers();
    HealthMonitor.start(queue as unknown as Queue);

    // A single unhealthy check only warns.
    await vi.advanceTimersByTimeAsync(HealthMonitor.checkInterval);
    expect(fatal).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(HealthMonitor.checkInterval);

    expect(fatal).toHaveBeenCalledWith(
      "Queue has stopped processing jobs",
      expect.any(Error),
      expect.objectContaining({
        queue: "stalled",
        waiting: HealthMonitor.maxWaitingJobs + 1,
      })
    );

    expect(exit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(HealthMonitor.shutdownTimeout);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("should exit when the check does not complete in time", async () => {
    const queue = buildQueue("wedged");

    // Stand in for a connection that accepts commands but never answers them.
    vi.spyOn(HealthMonitor, "client", "get").mockReturnValue({
      llen: () => new Promise<number>(() => {}),
    } as unknown as Redis);

    vi.useFakeTimers();
    HealthMonitor.start(queue as unknown as Queue);

    const round = HealthMonitor.checkInterval + HealthMonitor.checkTimeout;

    await vi.advanceTimersByTimeAsync(round);
    expect(fatal).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(round);

    expect(fatal).toHaveBeenCalledWith(
      "Queue health check failed",
      expect.any(Error),
      expect.objectContaining({ queue: "wedged" })
    );

    await vi.advanceTimersByTimeAsync(HealthMonitor.shutdownTimeout);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("should not exit when failed checks are not consecutive", async () => {
    const queue = buildQueue("recovered");
    let failing = true;

    // Fails the way a momentary loss of the Redis connection would.
    vi.spyOn(HealthMonitor, "client", "get").mockReturnValue({
      llen: () =>
        failing
          ? Promise.reject(new Error("Connection is closed."))
          : Promise.resolve(0),
    } as unknown as Redis);

    vi.useFakeTimers();
    HealthMonitor.start(queue as unknown as Queue);

    await vi.advanceTimersByTimeAsync(HealthMonitor.checkInterval);
    failing = false;
    await vi.advanceTimersByTimeAsync(HealthMonitor.checkInterval);
    failing = true;
    await vi.advanceTimersByTimeAsync(HealthMonitor.checkInterval);

    expect(fatal).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });
});
