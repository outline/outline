import { sanitize } from "./sanitize";

describe("sanitize", () => {
  it("should return primitives unchanged", () => {
    expect(sanitize("text")).toEqual("text");
    expect(sanitize(42)).toEqual(42);
    expect(sanitize(true)).toEqual(true);
    expect(sanitize(null)).toEqual(null);
    expect(sanitize(undefined)).toEqual(undefined);
  });

  it("should filter sensitive fields", () => {
    expect(
      sanitize({
        id: "123",
        accessToken: "a",
        refreshToken: "b",
        token: "c",
        password: "d",
        content: "e",
        verificationCode: "f",
        deleteConfirmationCode: "g",
      })
    ).toEqual({
      id: "123",
      accessToken: "[Filtered]",
      refreshToken: "[Filtered]",
      token: "[Filtered]",
      password: "[Filtered]",
      content: "[Filtered]",
      verificationCode: "[Filtered]",
      deleteConfirmationCode: "[Filtered]",
    });
  });

  it("should filter additional sensitive fields", () => {
    expect(sanitize({ apiKey: "a", secret: "b", authorization: "c" })).toEqual({
      apiKey: "[Filtered]",
      secret: "[Filtered]",
      authorization: "[Filtered]",
    });
  });

  it("should match sensitive fields regardless of case and separators", () => {
    expect(
      sanitize({
        access_token: "a",
        "refresh-token": "b",
        AccessToken: "c",
        API_KEY: "d",
        Authorization: "e",
        PASSWORD: "f",
      })
    ).toEqual({
      access_token: "[Filtered]",
      "refresh-token": "[Filtered]",
      AccessToken: "[Filtered]",
      API_KEY: "[Filtered]",
      Authorization: "[Filtered]",
      PASSWORD: "[Filtered]",
    });
  });

  it("should not filter fields that only contain a sensitive name", () => {
    expect(sanitize({ tokenId: "a", contentType: "b", apiKeyId: "c" })).toEqual(
      { tokenId: "a", contentType: "b", apiKeyId: "c" }
    );
  });

  it("should filter sensitive fields that have object values", () => {
    expect(sanitize({ content: { type: "doc" } })).toEqual({
      content: "[Filtered]",
    });
  });

  it("should filter sensitive fields in nested objects", () => {
    expect(
      sanitize({ props: { to: "user@example.com", token: "secret" } })
    ).toEqual({ props: { to: "user@example.com", token: "[Filtered]" } });
  });

  it("should filter sensitive fields in arrays", () => {
    expect(sanitize([{ token: "a" }, { id: "1" }])).toEqual([
      { token: "[Filtered]" },
      { id: "1" },
    ]);
    expect(sanitize({ items: [{ password: "a" }] })).toEqual({
      items: [{ password: "[Filtered]" }],
    });
  });

  it("should not mutate the input", () => {
    const input = { token: "a", nested: { password: "b" } };
    sanitize(input);
    expect(input).toEqual({ token: "a", nested: { password: "b" } });
  });

  it("should convert errors to plain objects", () => {
    const error = new Error("Failed");
    expect(sanitize(error)).toEqual({
      name: "Error",
      message: "Failed",
      stack: error.stack,
    });
  });

  it("should convert nested errors to plain objects", () => {
    const error = new Error("Failed");
    expect(sanitize({ error })).toEqual({
      error: { name: "Error", message: "Failed", stack: error.stack },
    });
  });

  it("should keep dates", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    expect(JSON.stringify(sanitize({ date }))).toEqual(
      JSON.stringify({ date })
    );
  });

  it("should keep URLs", () => {
    expect(sanitize({ url: new URL("https://example.com/path") })).toEqual({
      url: "https://example.com/path",
    });
  });

  it("should filter sensitive fields in serialized values", () => {
    const model = {
      toJSON: () => ({ id: "1", accessToken: "secret" }),
    };
    expect(sanitize({ model })).toEqual({
      model: { id: "1", accessToken: "[Filtered]" },
    });
  });

  it("should filter sensitive fields when toJSON returns the same value", () => {
    const model = {
      id: "1",
      token: "secret",
      toJSON() {
        return this;
      },
    };
    expect(JSON.stringify(sanitize({ model }))).toEqual(
      JSON.stringify({ model: { id: "1", token: "[Filtered]" } })
    );
  });

  it("should not call toJSON on its own result", () => {
    const model = {
      id: "1",
      token: "secret",
      toJSON() {
        return { ...this };
      },
    };
    expect(JSON.stringify(sanitize({ model }))).toEqual(
      JSON.stringify({ model: { id: "1", token: "[Filtered]" } })
    );
  });

  it("should keep values at the maximum depth", () => {
    expect(sanitize({ a: { b: { c: { d: "value" } } } })).toEqual({
      a: { b: { c: { d: "value" } } },
    });
  });

  it("should truncate objects deeper than the maximum depth", () => {
    expect(sanitize({ a: { b: { c: { d: { e: "value" } } } } })).toEqual({
      a: { b: { c: { d: "[…]" } } },
    });
  });

  it("should not recurse forever on circular references", () => {
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    const input: Record<string, any> = { id: "1" };
    input.self = input;
    expect(() => JSON.stringify(sanitize(input))).not.toThrow();
  });
});
