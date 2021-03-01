// @flow
import { UserAuthentication } from "../models";
import { buildUser, buildTeam, buildInvite } from "../test/factories";
import { flushdb } from "../test/support";
import userCreator from "./userCreator";

beforeEach(() => flushdb());

describe("userCreator", () => {
  const ip = "127.0.0.1";

  it("should update exising user and authentication", async () => {
    const existing = await buildUser();
    const authentications = await existing.getAuthentications();
    const authentication = authentications[0];
    const newEmail = "test@example.com";

    const [user, isNew] = await userCreator({
      name: existing.name,
      email: newEmail,
      avatarUrl: existing.avatarUrl,
      teamId: existing.teamId,
      ip,
      authentication: {
        authenticationProviderId: authentication.authenticationProviderId,
        providerId: authentication.providerId,
        accessToken: "123",
        scopes: ["read"],
      },
    });

    const auth = await UserAuthentication.findByPk(authentication.id);

    expect(auth.accessToken).toEqual("123");
    expect(auth.scopes.length).toEqual(1);
    expect(auth.scopes[0]).toEqual("read");
    expect(user.email).toEqual(newEmail);
    expect(isNew).toEqual(false);
  });

  it("should create a new user", async () => {
    const team = await buildTeam();
    const authenticationProviders = await team.getAuthenticationProviders();
    const authenticationProvider = authenticationProviders[0];

    const [user, isNew] = await userCreator({
      name: "Test Name",
      email: "test@example.com",
      teamId: team.id,
      ip,
      authentication: {
        authenticationProviderId: authenticationProvider.id,
        providerId: "fake-service-id",
        accessToken: "123",
        scopes: ["read"],
      },
    });

    const authentications = await user.getAuthentications();
    const auth = authentications[0];

    expect(auth.accessToken).toEqual("123");
    expect(auth.scopes.length).toEqual(1);
    expect(auth.scopes[0]).toEqual("read");
    expect(user.email).toEqual("test@example.com");
    expect(isNew).toEqual(true);
  });

  it("should create a user from an invited user", async () => {
    const team = await buildTeam();
    const invite = await buildInvite({ teamId: team.id });
    const authenticationProviders = await team.getAuthenticationProviders();
    const authenticationProvider = authenticationProviders[0];

    const [user, isNew] = await userCreator({
      name: invite.name,
      email: invite.email,
      teamId: invite.teamId,
      ip,
      authentication: {
        authenticationProviderId: authenticationProvider.id,
        providerId: "fake-service-id",
        accessToken: "123",
        scopes: ["read"],
      },
    });

    const authentications = await user.getAuthentications();
    const auth = authentications[0];

    expect(auth.accessToken).toEqual("123");
    expect(auth.scopes.length).toEqual(1);
    expect(auth.scopes[0]).toEqual("read");
    expect(user.email).toEqual(invite.email);
    expect(isNew).toEqual(false);
  });
});
