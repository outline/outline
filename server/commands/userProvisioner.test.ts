import { faker } from "@faker-js/faker";
import { randomUUID } from "crypto";
import { UserRole } from "@shared/types";
import { TeamDomain } from "@server/models";
import {
  buildUser,
  buildTeam,
  buildInvite,
  buildAdmin,
} from "@server/test/factories";
import userProvisioner from "./userProvisioner";
import { createContext } from "@server/context";

describe("userProvisioner", () => {
  const ip = faker.internet.ip();
  const ctx = createContext({ ip });

  it("should update existing user and authentication", async () => {
    const existing = await buildUser();
    const authentications = await existing.$get("authentications");
    const existingAuth = authentications[0];
    const newEmail = "test@example.com";
    const result = await userProvisioner(ctx, {
      name: existing.name,
      email: newEmail,
      avatarUrl: existing.avatarUrl,
      teamId: existing.teamId,
      authentication: {
        authenticationProviderId: existingAuth.authenticationProviderId,
        providerId: existingAuth.providerId,
        accessToken: "123",
        scopes: ["read"],
      },
    });
    const { user, authentication, isNewUser } = result;
    expect(authentication).toBeDefined();
    expect(authentication?.accessToken).toEqual("123");
    expect(authentication?.scopes.length).toEqual(1);
    expect(authentication?.scopes[0]).toEqual("read");
    expect(user.email).toEqual(newEmail);
    expect(isNewUser).toEqual(false);
  });

  it("should remove all other UserAuthentication records on sign-in", async () => {
    const existing = await buildUser();
    const authentications = await existing.$get("authentications");
    const existingAuth = authentications[0];

    // Create a second authentication record for the same provider (simulating a stale/duplicate record)
    const staleAuthSameProvider = await existing.$create("authentication", {
      authenticationProviderId: existingAuth.authenticationProviderId,
      providerId: randomUUID(),
      accessToken: "old-token",
      scopes: ["read"],
    });

    // Create a third authentication record for a different provider
    const team = await existing.$get("team");
    const otherProvider = await team!.$create("authenticationProvider", {
      name: "other-provider",
      providerId: randomUUID(),
    });
    const staleAuthDifferentProvider = await existing.$create(
      "authentication",
      {
        authenticationProviderId: otherProvider.id,
        providerId: randomUUID(),
        accessToken: "other-provider-token",
        scopes: ["read"],
      }
    );

    // Verify we have 3 auth records
    const authsBefore = await existing.$get("authentications");
    expect(authsBefore.length).toEqual(3);

    // Sign in with the original providerId
    const result = await userProvisioner(ctx, {
      name: existing.name,
      email: existing.email!,
      avatarUrl: existing.avatarUrl,
      teamId: existing.teamId,
      authentication: {
        authenticationProviderId: existingAuth.authenticationProviderId,
        providerId: existingAuth.providerId,
        accessToken: "new-token",
        scopes: ["read", "write"],
      },
    });

    const { user, authentication } = result;
    expect(authentication).toBeDefined();
    expect(authentication?.accessToken).toEqual("new-token");

    // Verify all stale authentications were removed (including from different provider)
    const authsAfter = await user.$get("authentications");
    expect(authsAfter.length).toEqual(1);
    expect(authsAfter[0].id).toEqual(existingAuth.id);
    expect(authsAfter[0].accessToken).toEqual("new-token");

    // Verify both stale auths were actually deleted from the database
    const { UserAuthentication } = await import("@server/models");
    const deletedAuth1 = await UserAuthentication.findByPk(
      staleAuthSameProvider.id
    );
    expect(deletedAuth1).toBeNull();
    const deletedAuth2 = await UserAuthentication.findByPk(
      staleAuthDifferentProvider.id
    );
    expect(deletedAuth2).toBeNull();
  });

  it("should add authentication provider to existing users", async () => {
    const team = await buildTeam({ inviteRequired: true });
    const teamAuthProviders = await team.$get("authenticationProviders");
    const authenticationProvider = teamAuthProviders[0];

    const email = "mynam@email.com";
    const existing = await buildUser({
      email,
      teamId: team.id,
      authentications: [],
    });

    const result = await userProvisioner(ctx, {
      name: existing.name,
      email,
      avatarUrl: existing.avatarUrl,
      teamId: existing.teamId,
      authentication: {
        authenticationProviderId: authenticationProvider.id,
        providerId: randomUUID(),
        accessToken: "123",
        scopes: ["read"],
      },
    });
    const { user, authentication, isNewUser } = result;
    expect(authentication).toBeDefined();
    expect(authentication?.accessToken).toEqual("123");
    expect(authentication?.scopes.length).toEqual(1);
    expect(authentication?.scopes[0]).toEqual("read");

    const authentications = await user.$get("authentications");
    expect(authentications.length).toEqual(1);
    expect(isNewUser).toEqual(false);
  });

  it("should add authentication provider to invited users", async () => {
    const team = await buildTeam({ inviteRequired: true });
    const teamAuthProviders = await team.$get("authenticationProviders");
    const authenticationProvider = teamAuthProviders[0];

    const email = "mynam@email.com";
    const existing = await buildInvite({
      email,
      teamId: team.id,
    });

    const result = await userProvisioner(ctx, {
      name: existing.name,
      email,
      avatarUrl: existing.avatarUrl,
      teamId: existing.teamId,
      authentication: {
        authenticationProviderId: authenticationProvider.id,
        providerId: randomUUID(),
        accessToken: "123",
        scopes: ["read"],
      },
    });
    const { user, authentication, isNewUser } = result;
    expect(authentication).toBeDefined();
    expect(authentication?.accessToken).toEqual("123");
    expect(authentication?.scopes.length).toEqual(1);
    expect(authentication?.scopes[0]).toEqual("read");

    const authentications = await user.$get("authentications");
    expect(authentications.length).toEqual(1);
    expect(isNewUser).toEqual(true);
  });

  it("should remove all stale authentications when adding to invited user", async () => {
    const team = await buildTeam({ inviteRequired: true });
    const teamAuthProviders = await team.$get("authenticationProviders");
    const authenticationProvider = teamAuthProviders[0];

    const email = "mynam@email.com";
    const existing = await buildInvite({
      email,
      teamId: team.id,
    });

    // Create a stale authentication record for the same provider
    const staleAuthSameProvider = await existing.$create("authentication", {
      authenticationProviderId: authenticationProvider.id,
      providerId: randomUUID(),
      accessToken: "old-expired-token",
      scopes: ["read"],
    });

    // Create a stale authentication record for a different provider
    const otherProvider = await team.$create("authenticationProvider", {
      name: "other-provider",
      providerId: randomUUID(),
    });
    const staleAuthDifferentProvider = await existing.$create(
      "authentication",
      {
        authenticationProviderId: otherProvider.id,
        providerId: randomUUID(),
        accessToken: "other-provider-token",
        scopes: ["read"],
      }
    );

    // Verify the stale auths exist
    const authsBefore = await existing.$get("authentications");
    expect(authsBefore.length).toEqual(2);

    // Sign in with a new providerId
    const result = await userProvisioner(ctx, {
      name: existing.name,
      email,
      avatarUrl: existing.avatarUrl,
      teamId: existing.teamId,
      authentication: {
        authenticationProviderId: authenticationProvider.id,
        providerId: randomUUID(),
        accessToken: "new-token",
        scopes: ["read", "write"],
      },
    });

    const { user, authentication, isNewUser } = result;
    expect(authentication).toBeDefined();
    expect(authentication?.accessToken).toEqual("new-token");
    expect(isNewUser).toEqual(true);

    // Verify only the new authentication exists
    const authsAfter = await user.$get("authentications");
    expect(authsAfter.length).toEqual(1);
    expect(authsAfter[0].accessToken).toEqual("new-token");

    // Verify both stale auths were deleted
    const { UserAuthentication } = await import("@server/models");
    const deletedAuth1 = await UserAuthentication.findByPk(
      staleAuthSameProvider.id
    );
    expect(deletedAuth1).toBeNull();
    const deletedAuth2 = await UserAuthentication.findByPk(
      staleAuthDifferentProvider.id
    );
    expect(deletedAuth2).toBeNull();
  });

  it("should create user with deleted user matching providerId", async () => {
    const existing = await buildUser();
    const authentications = await existing.$get("authentications");
    const existingAuth = authentications[0];
    const newEmail = "test@example.com";
    await existing.destroy({ hooks: false });
    const result = await userProvisioner(ctx, {
      name: "Test Name",
      email: "test@example.com",
      teamId: existing.teamId,
      authentication: {
        authenticationProviderId: existingAuth.authenticationProviderId,
        providerId: existingAuth.providerId,
        accessToken: "123",
        scopes: ["read"],
      },
    });
    const { user, authentication, isNewUser } = result;
    expect(authentication).toBeDefined();
    expect(authentication?.accessToken).toEqual("123");
    expect(authentication?.scopes.length).toEqual(1);
    expect(authentication?.scopes[0]).toEqual("read");
    expect(user.email).toEqual(newEmail);
    expect(isNewUser).toEqual(true);
  });

  it("should handle duplicate providerId for different iDP", async () => {
    const existing = await buildUser();
    const authentications = await existing.$get("authentications");
    const existingAuth = authentications[0];
    let error;

    try {
      await userProvisioner(ctx, {
        name: "Test Name",
        email: "test@example.com",
        teamId: existing.teamId,
        authentication: {
          authenticationProviderId: randomUUID(),
          providerId: existingAuth.providerId,
          accessToken: "123",
          scopes: ["read"],
        },
      });
    } catch (err) {
      error = err;
    }

    expect(error && error.toString()).toContain("already exists for");
  });

  it("should create a new user", async () => {
    const team = await buildTeam();
    const authenticationProviders = await team.$get("authenticationProviders");
    const authenticationProvider = authenticationProviders[0];
    const result = await userProvisioner(ctx, {
      name: "Test Name",
      email: "test@example.com",
      teamId: team.id,
      authentication: {
        authenticationProviderId: authenticationProvider.id,
        providerId: "fake-service-id",
        accessToken: "123",
        scopes: ["read"],
      },
    });
    const { user, authentication, isNewUser } = result;
    expect(authentication).toBeDefined();
    expect(authentication?.accessToken).toEqual("123");
    expect(authentication?.scopes.length).toEqual(1);
    expect(authentication?.scopes[0]).toEqual("read");
    expect(user.email).toEqual("test@example.com");
    expect(user.role).toEqual(UserRole.Member);
    expect(isNewUser).toEqual(true);
  });

  it("should prefer role argument over defaultUserRole", async () => {
    const team = await buildTeam({
      defaultUserRole: UserRole.Viewer,
    });
    const authenticationProviders = await team.$get("authenticationProviders");
    const authenticationProvider = authenticationProviders[0];
    const result = await userProvisioner(ctx, {
      name: "Test Name",
      email: "test@example.com",
      teamId: team.id,
      role: UserRole.Admin,
      authentication: {
        authenticationProviderId: authenticationProvider.id,
        providerId: "fake-service-id",
        accessToken: "123",
        scopes: ["read"],
      },
    });
    const { user } = result;
    expect(user.role).toEqual(UserRole.Admin);
  });

  it("should prefer defaultUserRole when role is undefined or false", async () => {
    const team = await buildTeam({
      defaultUserRole: UserRole.Viewer,
    });
    const authenticationProviders = await team.$get("authenticationProviders");
    const authenticationProvider = authenticationProviders[0];
    const result = await userProvisioner(ctx, {
      name: "Test Name",
      email: "test@example.com",
      teamId: team.id,
      authentication: {
        authenticationProviderId: authenticationProvider.id,
        providerId: "fake-service-id",
        accessToken: "123",
        scopes: ["read"],
      },
    });
    const { user: tname } = result;
    expect(tname.role).toEqual(UserRole.Viewer);
    const tname2Result = await userProvisioner(ctx, {
      name: "Test2 Name",
      email: "tes2@example.com",
      teamId: team.id,
      authentication: {
        authenticationProviderId: authenticationProvider.id,
        providerId: "fake-service-id",
        accessToken: "123",
        scopes: ["read"],
      },
    });
    const { user: tname2 } = tname2Result;
    expect(tname2.role).toEqual(UserRole.Viewer);
  });

  it("should create a user from an invited user", async () => {
    const team = await buildTeam({ inviteRequired: true });
    const invite = await buildInvite({
      teamId: team.id,
      email: "invite@example.com",
    });
    const authenticationProviders = await team.$get("authenticationProviders");
    const authenticationProvider = authenticationProviders[0];
    const result = await userProvisioner(ctx, {
      name: invite.name,
      email: "invite@ExamPle.com",
      teamId: invite.teamId,
      authentication: {
        authenticationProviderId: authenticationProvider.id,
        providerId: "fake-service-id",
        accessToken: "123",
        scopes: ["read"],
      },
    });
    const { user, authentication, isNewUser } = result;
    expect(authentication).toBeDefined();
    expect(authentication?.accessToken).toEqual("123");
    expect(authentication?.scopes.length).toEqual(1);
    expect(authentication?.scopes[0]).toEqual("read");
    expect(user.email).toEqual(invite.email);
    expect(isNewUser).toEqual(true);
  });

  it("should create a user from an invited user using email match", async () => {
    const externalUser = await buildUser({
      email: "external@example.com",
    });

    const team = await buildTeam({ inviteRequired: true });
    const invite = await buildInvite({
      teamId: team.id,
      email: externalUser.email,
    });

    const result = await userProvisioner(ctx, {
      name: invite.name,
      email: "external@ExamPle.com", // ensure that email is case insensistive
      teamId: invite.teamId,
    });
    const { user, authentication, isNewUser } = result;
    expect(authentication).toEqual(null);
    expect(user.id).toEqual(invite.id);
    expect(isNewUser).toEqual(true);
  });

  it("should reject an uninvited user when invites are required", async () => {
    const team = await buildTeam({ inviteRequired: true });

    const authenticationProviders = await team.$get("authenticationProviders");
    const authenticationProvider = authenticationProviders[0];
    let error;

    try {
      await userProvisioner(ctx, {
        name: "Uninvited User",
        email: "invite@ExamPle.com",
        teamId: team.id,
        authentication: {
          authenticationProviderId: authenticationProvider.id,
          providerId: "fake-service-id",
          accessToken: "123",
          scopes: ["read"],
        },
      });
    } catch (err) {
      error = err;
    }

    expect(error && error.toString()).toContain(
      "You need an invite to join this team"
    );
  });

  it("should create a user from allowed domain", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const domain = faker.internet.domainName();
    await TeamDomain.create({
      teamId: team.id,
      name: domain,
      createdById: admin.id,
    });

    const authenticationProviders = await team.$get("authenticationProviders");
    const authenticationProvider = authenticationProviders[0];
    const email = faker.internet.email({ provider: domain });
    const result = await userProvisioner(ctx, {
      name: faker.person.fullName(),
      email,
      teamId: team.id,
      authentication: {
        authenticationProviderId: authenticationProvider.id,
        providerId: "fake-service-id",
        accessToken: "123",
        scopes: ["read"],
      },
    });
    const { user, authentication, isNewUser } = result;
    expect(authentication).toBeDefined();
    expect(authentication?.accessToken).toEqual("123");
    expect(authentication?.scopes.length).toEqual(1);
    expect(authentication?.scopes[0]).toEqual("read");
    expect(user.email).toEqual(email);
    expect(isNewUser).toEqual(true);
  });

  it("should create a user from allowed domain with emailMatchOnly", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const domain = faker.internet.domainName();
    const email = faker.internet.email({ provider: domain });

    await TeamDomain.create({
      teamId: team.id,
      name: domain,
      createdById: admin.id,
    });

    const result = await userProvisioner(ctx, {
      name: "Test Name",
      email,
      teamId: team.id,
    });
    const { user, authentication, isNewUser } = result;
    expect(authentication).toBeUndefined();
    expect(user.email).toEqual(email);
    expect(isNewUser).toEqual(true);
  });

  it("should not create a user with emailMatchOnly when no allowed domains are set", async () => {
    const team = await buildTeam();
    let error;

    try {
      await userProvisioner(ctx, {
        name: "Test Name",
        email: faker.internet.email(),
        teamId: team.id,
      });
    } catch (err) {
      error = err;
    }

    expect(error && error.toString()).toContain("UnauthorizedError");
  });

  it("should reject an user when the domain is not allowed", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    await TeamDomain.create({
      teamId: team.id,
      name: faker.internet.domainName(),
      createdById: admin.id,
    });

    const authenticationProviders = await team.$get("authenticationProviders");
    const authenticationProvider = authenticationProviders[0];
    let error;

    try {
      await userProvisioner(ctx, {
        name: "Bad Domain User",
        email: faker.internet.email(),
        teamId: team.id,
        authentication: {
          authenticationProviderId: authenticationProvider.id,
          providerId: "fake-service-id",
          accessToken: "123",
          scopes: ["read"],
        },
      });
    } catch (err) {
      error = err;
    }

    expect(error && error.toString()).toContain(
      "The domain is not allowed for this workspace"
    );
  });
});
