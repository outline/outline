import { EventEmitter } from "events";

// Create a mock Redis client with all needed methods mocked
class RedisMock extends EventEmitter {
  constructor() {
    super();
  }

  get = jest.fn().mockResolvedValue(null);
  set = jest.fn().mockResolvedValue("OK");
  del = jest.fn().mockResolvedValue(1);
  keys = jest.fn().mockResolvedValue([]);
  ping = jest.fn().mockResolvedValue("PONG");
  disconnect = jest.fn();
  setMaxListeners = jest.fn();
}

// Mock the RedisAdapter class
class RedisAdapter extends RedisMock {
  constructor(_url: string | undefined, _options = {}) {
    super();
  }

  private static client: RedisAdapter;
  private static subscriber: RedisAdapter;

  public static get defaultClient(): RedisAdapter {
    return (
      this.client ||
      (this.client = new this(undefined, {
        connectionNameSuffix: "client",
      }))
    );
  }

  public static get defaultSubscriber(): RedisAdapter {
    return (
      this.subscriber ||
      (this.subscriber = new this(undefined, {
        maxRetriesPerRequest: null,
        connectionNameSuffix: "subscriber",
      }))
    );
  }
}

export default RedisAdapter;
