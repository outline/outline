import { AuthenticationProvider } from "@server/models";
import { buildTeam } from "@server/test/factories";
import { resolveProviderId } from "./resolveProviderId";

describe("resolveProviderId", () => {
  const hostname = "auth.example.com";
  const domain = "legacy.example.org";

  it("should return the hostname when there is no team", async () => {
    expect(await resolveProviderId(undefined, hostname, domain)).toEqual(
      hostname
    );
  });

  it("should prefer the record for the configured hostname", async () => {
    const team = await buildTeam({
      authenticationProviders: [
        { name: "oidc", providerId: domain },
        { name: "oidc", providerId: hostname },
      ],
    });

    expect(await resolveProviderId(team.id, hostname, domain)).toEqual(
      hostname
    );

    const providerIds = (
      await AuthenticationProvider.findAll({
        where: { name: "oidc", teamId: team.id },
      })
    ).map((provider) => provider.providerId);
    expect(providerIds.sort()).toEqual([hostname, domain].sort());
  });

  it("should move the identifier of an existing record to the hostname", async () => {
    const team = await buildTeam({
      authenticationProviders: [{ name: "oidc", providerId: domain }],
    });

    expect(await resolveProviderId(team.id, hostname, domain)).toEqual(
      hostname
    );

    const providers = await AuthenticationProvider.findAll({
      where: { name: "oidc", teamId: team.id },
    });
    expect(providers.map((provider) => provider.providerId)).toEqual([
      hostname,
    ]);
  });
});
