import { buildTeam } from "@server/test/factories";
import { AuthenticationProvider } from "@server/models";
import { createContext } from "@server/context";

describe("AuthenticationProvider", () => {
  describe("checkCanBeDisabled", () => {
    it("should allow disabling if email sign-in is enabled", async () => {
      const team = await buildTeam({
        guestSignin: true,
      });
      const provider = await AuthenticationProvider.create({
        name: "google",
        providerId: "google-id",
        teamId: team.id,
        enabled: true,
      });

      const ctx = createContext({ user: { team } as any });
      await expect(provider.disable(ctx)).resolves.not.toThrow();
      expect(provider.enabled).toBe(false);
    });

    it("should allow disabling if another provider is enabled", async () => {
      const team = await buildTeam({
        guestSignin: false,
      });
      const provider1 = await AuthenticationProvider.create({
        name: "google",
        providerId: "google-id",
        teamId: team.id,
        enabled: true,
      });
      await AuthenticationProvider.create({
        name: "slack",
        providerId: "slack-id",
        teamId: team.id,
        enabled: true,
      });

      const ctx = createContext({ user: { team } as any });
      await expect(provider1.disable(ctx)).resolves.not.toThrow();
      expect(provider1.enabled).toBe(false);
    });

    it("should prevent disabling if it is the last enabled method", async () => {
      const team = await buildTeam({
        guestSignin: false,
      });
      // buildTeam creates a default 'slack' provider, let's disable it first
      await AuthenticationProvider.update(
        { enabled: false },
        { where: { teamId: team.id } }
      );

      const provider = await AuthenticationProvider.create({
        name: "google",
        providerId: "google-id",
        teamId: team.id,
        enabled: true,
      });

      const ctx = createContext({ user: { team } as any });
      await expect(provider.disable(ctx)).rejects.toThrow(
        "At least one authentication provider is required"
      );
    });

    it("should prevent destruction if it is the last enabled method", async () => {
      const team = await buildTeam({
        guestSignin: false,
      });
      // Disable existing default providers
      await AuthenticationProvider.update(
        { enabled: false },
        { where: { teamId: team.id } }
      );

      const provider = await AuthenticationProvider.create({
        name: "google",
        providerId: "google-id",
        teamId: team.id,
        enabled: true,
      });

      await expect(provider.destroy()).rejects.toThrow(
        "At least one authentication provider is required"
      );
    });

    it("should allow destruction if it is not enabled", async () => {
      const team = await buildTeam({
        guestSignin: false,
      });
      const provider = await AuthenticationProvider.create({
        name: "google",
        providerId: "google-id",
        teamId: team.id,
        enabled: false,
      });

      await expect(provider.destroy()).resolves.not.toThrow();
    });
  });
});
