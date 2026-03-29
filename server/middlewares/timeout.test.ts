import type { Socket } from "net";
import timeout from "./timeout";

describe("Timeout middleware", () => {
  it("should set request timeout and restore it after request", async () => {
    const originalTimeout = 10000;
    const newTimeout = 1800000; // 30 minutes

    const mockSocket = {
      timeout: originalTimeout,
      setTimeout: jest.fn(),
    } as unknown as Socket;

    const ctx = {
      req: {
        socket: mockSocket,
      },
    };

    const next = jest.fn();
    const middleware = timeout(newTimeout);

    await middleware(
      // @ts-expect-error mock context
      ctx,
      next
    );

    // Should have set the new timeout
    expect(mockSocket.setTimeout).toHaveBeenCalledWith(newTimeout);
    // Should have called next
    expect(next).toHaveBeenCalled();
    // Should have restored the original timeout
    expect(mockSocket.setTimeout).toHaveBeenCalledWith(originalTimeout);
  });

  it("should restore original timeout even if next throws", async () => {
    const originalTimeout = 10000;
    const newTimeout = 1800000; // 30 minutes

    const mockSocket = {
      timeout: originalTimeout,
      setTimeout: jest.fn(),
    } as unknown as Socket;

    const ctx = {
      req: {
        socket: mockSocket,
      },
    };

    const error = new Error("Test error");
    const next = jest.fn().mockRejectedValue(error);
    const middleware = timeout(newTimeout);

    await expect(
      middleware(
        // @ts-expect-error mock context
        ctx,
        next
      )
    ).rejects.toThrow("Test error");

    // Should have set the new timeout
    expect(mockSocket.setTimeout).toHaveBeenCalledWith(newTimeout);
    // Should have called next
    expect(next).toHaveBeenCalled();
    // Should have restored the original timeout even after error
    expect(mockSocket.setTimeout).toHaveBeenCalledWith(originalTimeout);
  });

  it("should handle undefined original timeout", async () => {
    const newTimeout = 1800000; // 30 minutes

    const mockSocket = {
      timeout: undefined,
      setTimeout: jest.fn(),
    } as unknown as Socket;

    const ctx = {
      req: {
        socket: mockSocket,
      },
    };

    const next = jest.fn();
    const middleware = timeout(newTimeout);

    await middleware(
      // @ts-expect-error mock context
      ctx,
      next
    );

    // Should have set the new timeout
    expect(mockSocket.setTimeout).toHaveBeenCalledWith(newTimeout);
    // Should have called next
    expect(next).toHaveBeenCalled();
    // Should have restored timeout to 0 when original was undefined
    expect(mockSocket.setTimeout).toHaveBeenCalledWith(0);
  });
});
