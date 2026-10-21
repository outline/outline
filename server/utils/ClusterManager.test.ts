// @vitest-isolate true
import cluster from "node:cluster";
import type { Worker } from "node:cluster";

vi.mock("node:cluster", () => {
  const listeners: Record<string, () => void> = {};
  return {
    default: {
      worker: undefined,
      workers: {},
      fork: vi.fn(),
      on: vi.fn((event: string, listener: () => void) => {
        listeners[event] = listener;
      }),
      emit: (event: string) => listeners[event]?.(),
    },
  };
});

const mockCluster = vi.mocked(cluster) as typeof cluster & {
  emit: (event: string) => void;
};

describe("ClusterManager", () => {
  let signalHandlers: Map<string, () => void>;

  beforeEach(() => {
    vi.resetModules();
    vi.mocked(cluster.fork).mockClear();
    Object.assign(cluster, { worker: undefined, workers: {} });
    signalHandlers = new Map();
    vi.spyOn(process, "on").mockImplementation(((
      event: string,
      handler: () => void
    ) => {
      signalHandlers.set(event, handler);
      return process;
    }) as typeof process.on);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should run the primary callback then fork workers", async () => {
    const { ClusterManager } = await import("./ClusterManager");
    const order: string[] = [];
    vi.mocked(cluster.fork).mockImplementation(() => {
      order.push("fork");
      return {} as Worker;
    });

    await ClusterManager.start({
      primary: () => {
        order.push("primary");
      },
      worker: vi.fn(),
      count: 3,
    });

    expect(order).toEqual(["primary", "fork", "fork", "fork"]);
    expect([...signalHandlers.keys()]).toEqual(["SIGTERM", "SIGINT"]);
  });

  it("should run the worker callback in a worker process", async () => {
    const { ClusterManager } = await import("./ClusterManager");
    const disconnect = vi.fn();
    Object.assign(cluster, { worker: { id: 7, disconnect } });
    const worker = vi.fn();
    const primary = vi.fn();

    await ClusterManager.start({ primary, worker, count: 2 });

    expect(primary).not.toHaveBeenCalled();
    expect(cluster.fork).not.toHaveBeenCalled();
    expect(worker).toHaveBeenCalledWith(7, expect.any(Function));

    vi.useFakeTimers();
    worker.mock.calls[0][1]();
    expect(disconnect).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(disconnect).toHaveBeenCalled();
  });

  it("should replace workers that disconnect until shutdown", async () => {
    const { ClusterManager } = await import("./ClusterManager");
    await ClusterManager.start({ worker: vi.fn(), count: 1 });
    expect(cluster.fork).toHaveBeenCalledTimes(1);

    mockCluster.emit("disconnect");
    expect(cluster.fork).toHaveBeenCalledTimes(2);

    vi.useFakeTimers();
    const kill = vi.fn();
    Object.assign(cluster, { workers: { 1: { process: { kill } } } });
    signalHandlers.get("SIGTERM")?.();
    expect(kill).toHaveBeenCalledWith("SIGTERM");

    mockCluster.emit("disconnect");
    expect(cluster.fork).toHaveBeenCalledTimes(2);
  });

  it("should force kill workers after the grace period", async () => {
    const { ClusterManager } = await import("./ClusterManager");
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as typeof process.exit);
    await ClusterManager.start({ worker: vi.fn(), count: 1 });

    vi.useFakeTimers();
    const kill = vi.fn();
    Object.assign(cluster, { workers: { 1: { process: { kill } } } });
    signalHandlers.get("SIGTERM")?.();
    expect(kill).toHaveBeenCalledWith("SIGTERM");
    expect(exit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(ClusterManager.gracePeriod);
    expect(kill).toHaveBeenCalledWith("SIGKILL");
    expect(exit).toHaveBeenCalled();
  });

  it("should not fork workers when shutdown begins during the primary callback", async () => {
    const { ClusterManager } = await import("./ClusterManager");
    vi.useFakeTimers();

    await ClusterManager.start({
      primary: () => signalHandlers.get("SIGTERM")?.(),
      worker: vi.fn(),
      count: 2,
    });

    expect(cluster.fork).not.toHaveBeenCalled();
  });
});
