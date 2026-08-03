import type { Context } from "koa";
import { randomString } from "@shared/random";
import env from "@server/env";
import { buildShare, buildTeam } from "@server/test/factories";
import shareDomains from "./shareDomains";

describe("shareDomains middleware", () => {
  const buildContext = (hostname: string) =>
    ({
      host: hostname,
      hostname,
      state: {},
    }) as Context;

  beforeEach(() => {
    vi.spyOn(env, "isCloudHosted", "get").mockReturnValue(true);
    vi.spyOn(env, "isDevelopment", "get").mockReturnValue(false);
  });

  it("should resolve the share for a custom domain", async () => {
    const domain = `${randomString(10).toLowerCase()}.example.com`;
    const team = await buildTeam();
    const share = await buildShare({
      teamId: team.id,
      published: true,
      domain,
    });
    const ctx = buildContext(domain);

    await shareDomains()(ctx, vi.fn());

    expect(ctx.state.rootShare?.id).toEqual(share.id);
  });

  it("should not resolve the share when the team is deleted", async () => {
    const domain = `${randomString(10).toLowerCase()}.example.com`;
    const team = await buildTeam();
    await buildShare({
      teamId: team.id,
      published: true,
      domain,
    });
    await team.destroy();
    const ctx = buildContext(domain);

    await shareDomains()(ctx, vi.fn());

    expect(ctx.state.rootShare).toEqual(null);
  });

  it("should not resolve the share when the team is suspended", async () => {
    const domain = `${randomString(10).toLowerCase()}.example.com`;
    const team = await buildTeam({ suspendedAt: new Date() });
    await buildShare({
      teamId: team.id,
      published: true,
      domain,
    });
    const ctx = buildContext(domain);

    await shareDomains()(ctx, vi.fn());

    expect(ctx.state.rootShare).toEqual(null);
  });
});
