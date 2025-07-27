import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";
import { UserRole } from "@shared/types";
import { TeamDomain } from "@server/models";
import {
  buildUser,
  buildTeam,
  buildInvite,
  buildAdmin,
} from "@server/test/factories";
import userProvisioner from "./userProvisioner";
import Logger from "@server/logging/Logger";
describe("userProvisioner", () => {
  const ip = "127.0.0.1";

  it("should update existing user and authentication", async () => {
    const existing = await buildUser();
    const authentications = await existing.$get("authentications");
    const existingAuth = authentications[0];
    const newEmail = "test@example.com";
    const result = await userProvisioner({
      name: existing.name,
      email: newEmail,
      avatarUrl: existing.avatarUrl,
      teamId: existing.teamId,
      ip,
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

    const result = await userProvisioner({
      name: existing.name,
      email,
      avatarUrl: existing.avatarUrl,
      teamId: existing.teamId,
      ip,
      authentication: {
        authenticationProviderId: authenticationProvider.id,
        providerId: uuidv4(),
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

    const result = await userProvisioner({
      name: existing.name,
      email,
      avatarUrl: existing.avatarUrl,
      teamId: existing.teamId,
      ip,
      authentication: {
        authenticationProviderId: authenticationProvider.id,
        providerId: uuidv4(),
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

  it("should create user with deleted user matching providerId", async () => {
    const existing = await buildUser();
    const authentications = await existing.$get("authentications");
    const existingAuth = authentications[0];
    const newEmail = "test@example.com";
    await existing.destroy();
    const result = await userProvisioner({
      name: "Test Name",
      email: "test@example.com",
      teamId: existing.teamId,
      ip,
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
      await userProvisioner({
        name: "Test Name",
        email: "test@example.com",
        teamId: existing.teamId,
        ip,
        authentication: {
          authenticationProviderId: uuidv4(),
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
    const result = await userProvisioner({
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
    const { user, authentication, isNewUser } = result;
    expect(authentication).toBeDefined();
    expect(authentication?.accessToken).toEqual("123");
    expect(authentication?.scopes.length).toEqual(1);
    expect(authentication?.scopes[0]).toEqual("read");
    expect(user.email).toEqual("test@example.com");
    expect(user.role).toEqual(UserRole.Member);
    expect(isNewUser).toEqual(true);
  });

  it("should prefer isAdmin argument over defaultUserRole", async () => {
    const team = await buildTeam({
      defaultUserRole: UserRole.Viewer,
    });
    const authenticationProviders = await team.$get("authenticationProviders");
    const authenticationProvider = authenticationProviders[0];
    const result = await userProvisioner({
      name: "Test Name",
      email: "test@example.com",
      teamId: team.id,
      role: UserRole.Admin,
      ip,
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

  it("should prefer defaultUserRole when isAdmin is undefined or false", async () => {
    const team = await buildTeam({
      defaultUserRole: UserRole.Viewer,
    });
    const authenticationProviders = await team.$get("authenticationProviders");
    const authenticationProvider = authenticationProviders[0];
    const result = await userProvisioner({
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
    const { user: tname } = result;
    expect(tname.role).toEqual(UserRole.Viewer);
    const tname2Result = await userProvisioner({
      name: "Test2 Name",
      email: "tes2@example.com",
      teamId: team.id,
      ip,
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
    const result = await userProvisioner({
      name: invite.name,
      email: "invite@ExamPle.com",
      teamId: invite.teamId,
      ip,
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

    const result = await userProvisioner({
      name: invite.name,
      email: "external@ExamPle.com", // ensure that email is case insensistive
      teamId: invite.teamId,
      ip,
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
      await userProvisioner({
        name: "Uninvited User",
        email: "invite@ExamPle.com",
        teamId: team.id,
        ip,
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
    const result = await userProvisioner({
      name: faker.person.fullName(),
      email,
      teamId: team.id,
      ip,
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

    const result = await userProvisioner({
      name: "Test Name",
      email,
      teamId: team.id,
      ip,
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
      await userProvisioner({
        name: "Test Name",
        email: faker.internet.email(),
        teamId: team.id,
        ip,
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
      await userProvisioner({
        name: "Bad Domain User",
        email: faker.internet.email(),
        teamId: team.id,
        ip,
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

  it("should handle authentication provider migration correctly", async () => {
    const team = await buildTeam();
    const authenticationProviders = await team.$get("authenticationProviders");
    const oidcProvider = authenticationProviders[0];

    // Create a second authentication provider (GitLab) for the same team
    const gitlabProvider = await team.$create("authenticationProvider", {
      name: "gitlab",
      providerId: "gitlab-provider",
    });

    // Create a user with OIDC authentication
    const user = await buildUser({
      teamId: team.id,
      email: "user@example.com",
    });

    // Remove the default authentication and add OIDC authentication
    await user.$remove("authentications", user.authentications);
    await user.$create("authentication", {
      authenticationProviderId: oidcProvider.id,
      providerId: "oidc-user-123",
      accessToken: "oidc-token",
      scopes: ["read"],
    });

    // Now try to log in with GitLab using the same email
    const result = await userProvisioner({
      name: "User Name",
      email: "user@example.com",
      teamId: team.id,
      ip,
      authentication: {
        authenticationProviderId: gitlabProvider.id,
        providerId: "gitlab-user-456",
        accessToken: "gitlab-token",
        scopes: ["read"],
      },
    });

    const { user: resultUser, authentication, isNewUser } = result;

    // Should return the existing user, not create a new one
    expect(resultUser.id).toEqual(user.id);
    expect(resultUser.email).toEqual("user@example.com");
    expect(isNewUser).toEqual(false);

    // Should create a new authentication record for GitLab
    expect(authentication).toBeDefined();
    expect(authentication?.authenticationProviderId).toEqual(gitlabProvider.id);
    expect(authentication?.providerId).toEqual("gitlab-user-456");

    // User should now have both OIDC and GitLab authentications
    const userWithAuths = await user.$get("authentications");
    expect(userWithAuths).toHaveLength(2);

    // Verify both authentications exist
    const authProviderIds = userWithAuths.map(
      (auth) => auth.authenticationProviderId
    );
    expect(authProviderIds).toContain(oidcProvider.id);
    expect(authProviderIds).toContain(gitlabProvider.id);
  });

  it("should log authentication provider migration events", async () => {
    // Mock the Logger to capture log calls
    const mockInfo = jest.fn();
    const originalInfo = Logger.info;
    Logger.info = mockInfo;

    try {
      const team = await buildTeam();
      const authenticationProviders = await team.$get(
        "authenticationProviders"
      );
      const oidcProvider = authenticationProviders[0];

      // Create a second authentication provider (GitLab) for the same team
      const gitlabProvider = await team.$create("authenticationProvider", {
        name: "gitlab",
        providerId: "gitlab-provider",
      });

      // Create a user with OIDC authentication
      const user = await buildUser({
        teamId: team.id,
        email: "user@example.com",
      });

      // Remove the default authentication and add OIDC authentication
      await user.$remove("authentications", user.authentications);
      await user.$create("authentication", {
        authenticationProviderId: oidcProvider.id,
        providerId: "oidc-user-123",
        accessToken: "oidc-token",
        scopes: ["read"],
      });

      // Now try to log in with GitLab using the same email
      await userProvisioner({
        name: "User Name",
        email: "user@example.com",
        teamId: team.id,
        ip,
        authentication: {
          authenticationProviderId: gitlabProvider.id,
          providerId: "gitlab-user-456",
          accessToken: "gitlab-token",
          scopes: ["read"],
        },
      });

      // Verify that the migration was logged
      expect(mockInfo).toHaveBeenCalledWith(
        "authentication",
        "User switching authentication providers",
        expect.objectContaining({
          userId: user.id,
          email: "user@example.com",
          fromProvider: oidcProvider.id,
          toProvider: gitlabProvider.id,
        })
      );
    } finally {
      // Restore the original Logger
      Logger.info = originalInfo;
    }
  });
});
