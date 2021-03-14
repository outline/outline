// @flow
import { buildTeam } from "../test/factories";
import { flushdb } from "../test/support";
import teamCreator from "./teamCreator";

jest.mock("aws-sdk", () => {
  const mS3 = { putObject: jest.fn().mockReturnThis(), promise: jest.fn() };
  return {
    S3: jest.fn(() => mS3),
    Endpoint: jest.fn(),
  };
});

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

  it("should now allow creating multiple teams in installation", async () => {
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
    const existing = await buildTeam();

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

    const providers = await team.getAuthenticationProviders();
    expect(providers.length).toEqual(2);
  });

  it("should return exising team", async () => {
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
