export class MutexLock {
  // Default expiry time for acquiring lock in milliseconds
  public static defaultLockTimeout = 4000;

  /**
   * Returns the mock redlock instance
   */
  public static get lock() {
    return {
      acquire: jest.fn().mockResolvedValue({
        release: jest.fn().mockResolvedValue(true),
        expiration: Date.now() + 10000,
      }),
    };
  }

  private static redlock: any;
}
