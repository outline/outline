import crypto from "node:crypto";
import { Scope } from "@shared/types";
import { OAuthAuthorizationCode } from "@server/models";
import { buildOAuthClient, buildUser } from "@server/test/factories";
import { hash } from "@server/utils/crypto";

const buildCode = async () => {
  const user = await buildUser();
  const client = await buildOAuthClient({ teamId: user.teamId });
  const code = crypto.randomBytes(32).toString("hex");

  await OAuthAuthorizationCode.create({
    authorizationCodeHash: hash(code),
    scope: [Scope.Read],
    redirectUri: client.redirectUris[0],
    oauthClientId: client.id,
    userId: user.id,
    expiresAt: new Date(Date.now() + 10000),
    grantId: crypto.randomUUID(),
  });

  return code;
};

describe("OAuthAuthorizationCode", () => {
  describe("consume", () => {
    it("should consume the code once", async () => {
      const code = await buildCode();

      expect(await OAuthAuthorizationCode.consume(code)).toBe(true);
      expect(await OAuthAuthorizationCode.consume(code)).toBe(false);
      expect(await OAuthAuthorizationCode.findByCode(code)).toBeNull();
    });

    it("should succeed for a single caller when consumed concurrently", async () => {
      const code = await buildCode();

      const consumed = await Promise.all([
        OAuthAuthorizationCode.consume(code),
        OAuthAuthorizationCode.consume(code),
        OAuthAuthorizationCode.consume(code),
      ]);

      expect(consumed.filter(Boolean).length).toBe(1);
    });

    it("should not consume an unknown code", async () => {
      expect(await OAuthAuthorizationCode.consume("unknown")).toBe(false);
    });
  });
});
