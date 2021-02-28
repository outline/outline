// @flow
import { buildTeam } from "../test/factories";
import { flushdb } from "../test/support";
import teamCreator from "./teamCreator";

beforeEach(() => flushdb());

describe("teamCreator", () => {
  it("should create team and authentication provider", async () => {
    const [team, isNew] = await teamCreator({
      name: "Test team",
      subdomain: "example",
      authenticationProvider: {
        name: "google",
        serviceId: "example.com",
      },
    });

    const authenticationProvider = team.authenticationProviders[0];

    expect(authenticationProvider.name).toEqual("google");
    expect(authenticationProvider.serviceId).toEqual("example.com");
    expect(team.name).toEqual("Test team");
    expect(team.subdomain).toEqual("example");
    expect(isNew).toEqual(true);
  });

  it("should update exising team", async () => {
    const authenticationProvider = {
      name: "google",
      serviceId: "example.com",
    };

    const existing = await buildTeam({
      authenticationProviders: [authenticationProvider],
    });

    const [team, isNew] = await teamCreator({
      name: "Updated name",
      subdomain: "example",
      authenticationProvider,
    });

    expect(team.id).toEqual(existing.id);
    expect(team.name).toEqual("Updated name");
    expect(team.subdomain).toEqual("example");
    expect(isNew).toEqual(false);
  });
});
