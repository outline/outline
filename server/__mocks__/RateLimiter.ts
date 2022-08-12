export default class MockRateLimiter {
  static getRateLimiter() {
    return {
      points: 100,
      consume: jest.fn(),
    };
  }

  static setRateLimiter() {
    //
  }

  static hasRateLimiter() {
    return false;
  }
}
