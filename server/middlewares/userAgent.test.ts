import { buildMockContext } from "@server/test/support";
import { userAgent } from "./userAgent";

const chromeOnMac =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const safariOnIPhone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

describe("userAgent middleware", () => {
  it("should parse a desktop user agent", async () => {
    const ctx = buildMockContext({ header: { "user-agent": chromeOnMac } });
    const next = vi.fn();

    await userAgent()(ctx, next);

    expect(ctx.userAgent.source).toEqual(chromeOnMac);
    expect(ctx.userAgent.isDesktop).toBe(true);
    expect(ctx.userAgent.isMobile).toBe(false);
    expect(next).toHaveBeenCalled();
  });

  it("should parse a mobile user agent", async () => {
    const ctx = buildMockContext({ header: { "user-agent": safariOnIPhone } });

    await userAgent()(ctx, vi.fn());

    expect(ctx.userAgent.isMobile).toBe(true);
    expect(ctx.userAgent.isDesktop).toBe(false);
  });

  it("should use a placeholder when the header is missing", async () => {
    const ctx = buildMockContext({ header: {} });

    await userAgent()(ctx, vi.fn());

    expect(ctx.userAgent.source).toEqual("unknown");
  });
});
