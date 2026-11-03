import { subMinutes } from "date-fns";
import JWT from "jsonwebtoken";
import type { Context } from "koa";
import { buildUser } from "@server/test/factories";
import { getUserForEmailSigninToken } from "./jwt";

/**
 * Minimal Koa context stub exposing only the request IP.
 */
function buildContext(ip = "127.0.0.1") {
  return { request: { ip } } as unknown as Context;
}

describe("getUserForEmailSigninToken", () => {
  it("should return the user for a valid token", async () => {
    const user = await buildUser();
    const ctx = buildContext();
    const token = user.getEmailSigninToken(ctx);

    const result = await getUserForEmailSigninToken(ctx, token);
    expect(result.id).toEqual(user.id);
  });

  it("should reject a token that was already used", async () => {
    const user = await buildUser();
    const ctx = buildContext();
    const token = user.getEmailSigninToken(ctx);

    await getUserForEmailSigninToken(ctx, token);
    await expect(getUserForEmailSigninToken(ctx, token)).rejects.toThrow(
      "Token has already been used"
    );
  });

  it("should allow only one of several concurrent redemptions", async () => {
    const user = await buildUser();
    const ctx = buildContext();
    const token = user.getEmailSigninToken(ctx);

    const results = await Promise.allSettled([
      getUserForEmailSigninToken(ctx, token),
      getUserForEmailSigninToken(ctx, token),
      getUserForEmailSigninToken(ctx, token),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("should not use a token that fails the IP check", async () => {
    const user = await buildUser();
    const ctx = buildContext();
    const token = user.getEmailSigninToken(ctx);

    await expect(
      getUserForEmailSigninToken(buildContext("10.0.0.1"), token)
    ).rejects.toThrow("Token mismatch");

    const result = await getUserForEmailSigninToken(ctx, token);
    expect(result.id).toEqual(user.id);
  });

  it("should reject an expired token", async () => {
    const user = await buildUser();
    const ctx = buildContext();
    const token = JWT.sign(
      {
        id: user.id,
        ip: ctx.request.ip,
        createdAt: subMinutes(new Date(), 11).toISOString(),
        type: "email-signin",
      },
      user.jwtSecret
    );

    await expect(getUserForEmailSigninToken(ctx, token)).rejects.toThrow(
      "Expired token"
    );
  });

  it("should reject a token signed with another secret", async () => {
    const user = await buildUser();
    const ctx = buildContext();
    const token = JWT.sign(
      {
        id: user.id,
        ip: ctx.request.ip,
        createdAt: new Date().toISOString(),
        type: "email-signin",
      },
      "wrong-secret"
    );

    await expect(getUserForEmailSigninToken(ctx, token)).rejects.toThrow(
      "Invalid token"
    );
  });
});
