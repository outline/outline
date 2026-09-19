import { Scope } from "@shared/types";
import { OAuthAuthentication, OAuthAuthorizationCode } from "@server/models";
import {
  buildOAuthAuthentication,
  buildOAuthAuthorizationCode,
  buildOAuthClient,
  buildUser,
} from "@server/test/factories";
import RevokeDynamicOAuthClientsTask from "./RevokeDynamicOAuthClientsTask";

describe("RevokeDynamicOAuthClientsTask", () => {
  it("should revoke tokens and codes held by dynamic clients", async () => {
    const user = await buildUser();
    const client = await buildOAuthClient({
      teamId: user.teamId,
      createdById: null,
    });
    const authentication = await buildOAuthAuthentication({
      user,
      oauthClientId: client.id,
      scope: [Scope.Read],
    });
    const code = await buildOAuthAuthorizationCode({
      userId: user.id,
      oauthClientId: client.id,
    });

    const task = new RevokeDynamicOAuthClientsTask();
    await task.perform({ teamId: user.teamId });

    expect(await OAuthAuthentication.findByPk(authentication.id)).toBeNull();
    expect(await OAuthAuthorizationCode.findByPk(code.id)).toBeNull();
  });

  it("should not revoke tokens held by user created clients", async () => {
    const user = await buildUser();
    const client = await buildOAuthClient({ teamId: user.teamId });
    const authentication = await buildOAuthAuthentication({
      user,
      oauthClientId: client.id,
      scope: [Scope.Read],
    });

    const task = new RevokeDynamicOAuthClientsTask();
    await task.perform({ teamId: user.teamId });

    expect(
      await OAuthAuthentication.findByPk(authentication.id)
    ).not.toBeNull();
  });

  it("should not revoke tokens held by dynamic clients in another team", async () => {
    const user = await buildUser();
    const other = await buildUser();
    const client = await buildOAuthClient({
      teamId: other.teamId,
      createdById: null,
    });
    const authentication = await buildOAuthAuthentication({
      user: other,
      oauthClientId: client.id,
      scope: [Scope.Read],
    });

    const task = new RevokeDynamicOAuthClientsTask();
    await task.perform({ teamId: user.teamId });

    expect(
      await OAuthAuthentication.findByPk(authentication.id)
    ).not.toBeNull();
  });
});
