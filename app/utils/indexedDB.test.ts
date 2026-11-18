import { isConnectionClosedError, isExpectedIndexedDBError } from "./indexedDB";

describe("isConnectionClosedError", () => {
  it("matches a connection that is closing", () => {
    expect(
      isConnectionClosedError(
        new DOMException(
          "The database connection is closing.",
          "InvalidStateError"
        )
      )
    ).toBe(true);
  });

  it("does not match a storage failure", () => {
    expect(
      isConnectionClosedError(new DOMException("No space", "UnknownError"))
    ).toBe(false);
  });
});

describe("isExpectedIndexedDBError", () => {
  it("matches a connection that is closing", () => {
    expect(
      isExpectedIndexedDBError(new DOMException("Closing", "InvalidStateError"))
    ).toBe(true);
  });

  it("matches a database that the browser deleted", () => {
    expect(
      isExpectedIndexedDBError(
        new DOMException(
          "Database deleted by request of the user",
          "UnknownError"
        )
      )
    ).toBe(true);
  });

  it("matches a full disk", () => {
    expect(
      isExpectedIndexedDBError(
        new DOMException("Quota exceeded", "QuotaExceededError")
      )
    ).toBe(true);
  });

  it("does not match other errors", () => {
    expect(
      isExpectedIndexedDBError(new DOMException("Bad key", "DataError"))
    ).toBe(false);
    expect(isExpectedIndexedDBError(new Error("Something went wrong"))).toBe(
      false
    );
  });
});
