import { subMonths } from "date-fns";
import { OAuthAuthorizationCode } from "@server/models";
import { buildOAuthAuthorizationCode } from "@server/test/factories";
import CleanupOAuthAuthorizationCodeTask from "./CleanupOAuthAuthorizationCodeTask";

const codeExists = async (code: OAuthAuthorizationCode) => {
  const found = await OAuthAuthorizationCode.findByPk(code.id);
  return !!found;
};

describe("CleanupOAuthAuthorizationCodeTask", () => {
  it("should delete authorization codes expired more than one month ago", async () => {
    const brandNewCode = await buildOAuthAuthorizationCode({
      expiresAt: new Date(),
    });
    const oldCode = await buildOAuthAuthorizationCode({
      expiresAt: subMonths(new Date(), 2),
    });

    const task = new CleanupOAuthAuthorizationCodeTask();
    await task.perform();

    expect(await codeExists(brandNewCode)).toBe(true);
    expect(await codeExists(oldCode)).toBe(false);
  });

  it("should not delete codes that expired less than one month ago", async () => {
    const recentCode = await buildOAuthAuthorizationCode({
      expiresAt: new Date(),
    });

    const task = new CleanupOAuthAuthorizationCodeTask();
    await task.perform();

    expect(await codeExists(recentCode)).toBe(true);
  });
});
