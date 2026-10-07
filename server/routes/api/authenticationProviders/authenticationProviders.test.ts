import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import sharedEnv from "@shared/env";
import env from "@server/env";
import { AuthenticationProvider } from "@server/models";
import { buildUser, buildAdmin, buildTeam } from "@server/test/factories";
import { getTestServer, setSelfHosted } from "@server/test/support";
import { PluginManager } from "@server/utils/PluginManager";

const server = getTestServer();

beforeEach(setSelfHosted);

function setCloudHosted() {
  env.URL = sharedEnv.URL = "https://app.getoutline.com";
}

describe("#authenticationProviders.info", () => {
  it("should return auth provider", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({
      teamId: team.id,
    });
    const authenticationProviders = await team.$get("authenticationProviders");
    const res = await server.post("/api/authenticationProviders.info", user, {
      body: {
        id: authenticationProviders[0].id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("slack");
    expect(body.data.isEnabled).toBe(true);
    expect(body.data.isConnected).toBe(true);
    expect(body.policies[0].abilities.read).toBeTruthy();
    expect(body.policies[0].abilities.update).toBeTruthy();
  });

  it("should require authorization", async () => {
    const team = await buildTeam();
    const user = await buildUser();
    const authenticationProviders = await team.$get("authenticationProviders");
    const res = await server.post("/api/authenticationProviders.info", user, {
      body: {
        id: authenticationProviders[0].id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const team = await buildTeam();
    const authenticationProviders = await team.$get("authenticationProviders");
    const res = await server.post("/api/authenticationProviders.info", {
      body: {
        id: authenticationProviders[0].id,
      },
    });
    expect(res.status).toEqual(401);
  });
});

describe("#authenticationProviders.update", () => {
  it("requires the admin setup flow before enabling group sync", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const provider = await team.$create("authenticationProvider", {
      name: "azure",
      providerId: randomUUID(),
    });

    const getGroupSyncProvider = vi
      .spyOn(PluginManager, "getGroupSyncProvider")
      .mockReturnValue({
        useGroupClaim: false,
        startGroupSync: async () => "https://example.com/consent",
        fetchUserGroups: async () => [],
      });

    try {
      const res = await server.post(
        "/api/authenticationProviders.update",
        user,
        {
          body: {
            id: provider.id,
            settings: { groupSyncEnabled: true },
          },
        }
      );

      expect(res.status).toEqual(400);
      const reloaded = await AuthenticationProvider.findByPk(provider.id);
      expect(reloaded?.settings?.groupSyncEnabled).not.toBe(true);
    } finally {
      getGroupSyncProvider.mockRestore();
    }
  });

  it("should not allow admins to disable when last authentication provider", async () => {
    const team = await buildTeam({
      guestSignin: false,
    });
    const user = await buildAdmin({
      teamId: team.id,
    });
    const authenticationProviders = await team.$get("authenticationProviders");
    const res = await server.post("/api/authenticationProviders.update", user, {
      body: {
        id: authenticationProviders[0].id,
        isEnabled: false,
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should allow admins to disable", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({
      teamId: team.id,
    });
    const googleProvider = await team.$create("authenticationProvider", {
      name: "google",
      providerId: randomUUID(),
    });
    const res = await server.post("/api/authenticationProviders.update", user, {
      body: {
        id: googleProvider.id,
        isEnabled: false,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toBe("google");
    expect(body.data.isEnabled).toBe(false);
    expect(body.data.isConnected).toBe(true);
  });

  it("should require authorization", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const authenticationProviders = await team.$get("authenticationProviders");
    const res = await server.post("/api/authenticationProviders.update", user, {
      body: {
        id: authenticationProviders[0].id,
        isEnabled: false,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const team = await buildTeam();
    const authenticationProviders = await team.$get("authenticationProviders");
    const res = await server.post("/api/authenticationProviders.update", {
      body: {
        id: authenticationProviders[0].id,
        isEnabled: false,
      },
    });
    expect(res.status).toEqual(401);
  });
});

describe("#authenticationProviders.startGroupSync", () => {
  it("returns the provider setup URL for a workspace admin", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const provider = await team.$create("authenticationProvider", {
      name: "azure",
      providerId: randomUUID(),
    });
    const startGroupSync = vi
      .fn()
      .mockResolvedValue("https://example.com/consent");
    const getGroupSyncProvider = vi
      .spyOn(PluginManager, "getGroupSyncProvider")
      .mockReturnValue({
        useGroupClaim: false,
        startGroupSync,
        fetchUserGroups: async () => [],
      });

    try {
      const res = await server.post(
        "/api/authenticationProviders.startGroupSync",
        user,
        { body: { id: provider.id } }
      );
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.url).toEqual("https://example.com/consent");
      expect(startGroupSync).toHaveBeenCalledTimes(1);
      expect(startGroupSync.mock.calls[0][0].id).toEqual(provider.id);
      expect(startGroupSync.mock.calls[0][1].id).toEqual(user.id);
    } finally {
      getGroupSyncProvider.mockRestore();
    }
  });

  it("rejects providers without an admin setup flow", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const provider = await team.$create("authenticationProvider", {
      name: "google",
      providerId: randomUUID(),
    });
    const getGroupSyncProvider = vi
      .spyOn(PluginManager, "getGroupSyncProvider")
      .mockReturnValue({
        useGroupClaim: false,
        fetchUserGroups: async () => [],
      });

    try {
      const res = await server.post(
        "/api/authenticationProviders.startGroupSync",
        user,
        { body: { id: provider.id } }
      );
      expect(res.status).toEqual(400);
    } finally {
      getGroupSyncProvider.mockRestore();
    }
  });
});

describe("#authenticationProviders.list", () => {
  it("should return enabled and available auth providers", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({
      teamId: team.id,
    });
    const res = await server.post("/api/authenticationProviders.list", user);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toBe(3);
    expect(body.data[0].name).toBe("slack");
    expect(body.data[0].isEnabled).toBe(true);
    expect(body.data[0].isConnected).toBe(true);
    expect(body.data[1].name).toBe("google");
    expect(body.data[1].isEnabled).toBe(false);
    expect(body.data[1].isConnected).toBe(false);
    expect(body.data[2].name).toBe("oidc");
    expect(body.data[2].isEnabled).toBe(false);
    expect(body.data[2].isConnected).toBe(false);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/authenticationProviders.list");
    expect(res.status).toEqual(401);
  });
});

describe("#authenticationProviders.delete", () => {
  it("should disable the provider on self-hosted and keep the row", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({
      teamId: team.id,
    });
    const googleProvider = await team.$create("authenticationProvider", {
      name: "google",
      providerId: randomUUID(),
    });
    const res = await server.post("/api/authenticationProviders.delete", user, {
      body: {
        id: googleProvider.id,
      },
    });
    expect(res.status).toEqual(200);
    const reloaded = await AuthenticationProvider.findByPk(googleProvider.id);
    expect(reloaded?.enabled).toBe(false);
  });

  it("should destroy the provider on cloud hosted", async () => {
    setCloudHosted();
    const team = await buildTeam();
    const user = await buildAdmin({
      teamId: team.id,
    });
    const googleProvider = await team.$create("authenticationProvider", {
      name: "google",
      providerId: randomUUID(),
    });
    const res = await server.post("/api/authenticationProviders.delete", user, {
      body: {
        id: googleProvider.id,
      },
    });
    expect(res.status).toEqual(200);
    const count = await team.$count("authenticationProviders", {
      where: {
        id: googleProvider.id,
      },
    });
    expect(count).toBe(0);
  });

  it("should require authorization", async () => {
    const team = await buildTeam();
    const user = await buildUser();
    const googleProvider = await team.$create("authenticationProvider", {
      name: "google",
      providerId: randomUUID(),
    });
    const res = await server.post("/api/authenticationProviders.delete", user, {
      body: {
        id: googleProvider.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authentication", async () => {
    const team = await buildTeam();
    const googleProvider = await team.$create("authenticationProvider", {
      name: "google",
      providerId: randomUUID(),
    });
    const res = await server.post("/api/authenticationProviders.delete", {
      body: {
        id: googleProvider.id,
      },
    });
    expect(res.status).toEqual(401);
  });
});
