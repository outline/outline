import env from "@server/env";
import TeamDomain from "@server/models/TeamDomain";
import { buildTeam, buildUser } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import teamCreator from "./teamCreator";

beforeEach(() => flushdb());

describe("teamCreator", () => {
  it("should create team and authentication provider", async () => {
    const result = await teamCreator({
      name: "Test team",
      subdomain: "example",
      avatarUrl: "http://example.com/logo.png",
      authenticationProvider: {
        name: "google",
        providerId: "example.com",
      },
    });
    const { team, authenticationProvider, isNewTeam } = result;
    expect(authenticationProvider.name).toEqual("google");
    expect(authenticationProvider.providerId).toEqual("example.com");
    expect(team.name).toEqual("Test team");
    expect(team.subdomain).toEqual("example");
    expect(isNewTeam).toEqual(true);
  });

  it("should not allow creating multiple teams in installation", async () => {
    env.DEPLOYMENT = undefined;
    await buildTeam();
    let error;

    try {
      await teamCreator({
        name: "Test team",
        subdomain: "example",
        avatarUrl: "http://example.com/logo.png",
        authenticationProvider: {
          name: "google",
          providerId: "example.com",
        },
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeTruthy();
  });

  it("should return existing team when within allowed domains", async () => {
    env.DEPLOYMENT = undefined;
    const existing = await buildTeam();
    const user = await buildUser({
      teamId: existing.id,
    });
    await TeamDomain.create({
      teamId: existing.id,
      name: "allowed-domain.com",
      createdById: user.id,
    });

    const result = await teamCreator({
      name: "Updated name",
      subdomain: "example",
      domain: "allowed-domain.com",
      authenticationProvider: {
        name: "google",
        providerId: "allowed-domain.com",
      },
    });
    const { team, authenticationProvider, isNewTeam } = result;
    expect(team.id).toEqual(existing.id);
    expect(team.name).toEqual(existing.name);
    expect(authenticationProvider.name).toEqual("google");
    expect(authenticationProvider.providerId).toEqual("allowed-domain.com");
    expect(isNewTeam).toEqual(false);
    const providers = await team.$get("authenticationProviders");
    expect(providers.length).toEqual(2);
  });

  it("should error when NOT within allowed domains", async () => {
    const user = await buildUser();
    delete process.env.DEPLOYMENT;
    const existing = await buildTeam();
    await TeamDomain.create({
      teamId: existing.id,
      name: "other-domain.com",
      createdById: user.id,
    });

    let error;
    try {
      await teamCreator({
        name: "Updated name",
        subdomain: "example",
        domain: "allowed-domain.com",
        authenticationProvider: {
          name: "google",
          providerId: "allowed-domain.com",
        },
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeTruthy();
  });

  it("should return exising team", async () => {
    env.DEPLOYMENT = undefined;
    const authenticationProvider = {
      name: "google",
      providerId: "example.com",
    };
    const existing = await buildTeam({
      subdomain: "example",
      authenticationProviders: [authenticationProvider],
    });
    const result = await teamCreator({
      name: "Updated name",
      subdomain: "example",
      authenticationProvider,
    });
    const { team, isNewTeam } = result;
    expect(team.id).toEqual(existing.id);
    expect(team.name).toEqual(existing.name);
    expect(team.subdomain).toEqual("example");
    expect(isNewTeam).toEqual(false);
  });
});
