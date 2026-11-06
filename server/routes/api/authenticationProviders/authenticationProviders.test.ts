import { randomUUID } from "node:crypto";
import type { MockInstance } from "vitest";
import { vi } from "vitest";
import sharedEnv from "@shared/env";
import { Plan } from "@shared/types";
import env from "@server/env";
import { AuthenticationProvider, Team } from "@server/models";
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
  let planSpy: MockInstance<() => Plan>;

  beforeEach(() => {
    planSpy = vi
      .spyOn(Team.prototype, "plan", "get")
      .mockReturnValue(Plan.Business);
  });

  afterEach(() => {
    planSpy.mockRestore();
  });

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

  it("requires the group sync entitlement to enable group sync", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const provider = await team.$create("authenticationProvider", {
      name: "oidc",
      providerId: randomUUID(),
    });

    planSpy.mockReturnValue(Plan.Community);
    const getGroupSyncProvider = vi
      .spyOn(PluginManager, "getGroupSyncProvider")
      .mockReturnValue({
        useGroupClaim: true,
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

      expect(res.status).toEqual(403);
      const reloaded = await AuthenticationProvider.findByPk(provider.id);
      expect(reloaded?.settings?.groupSyncEnabled).not.toBe(true);
    } finally {
      getGroupSyncProvider.mockRestore();
    }
  });

  it("allows disabling group sync without the group sync entitlement", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const provider = await team.$create("authenticationProvider", {
      name: "oidc",
      providerId: randomUUID(),
      settings: { groupSyncEnabled: true },
    });

    planSpy.mockReturnValue(Plan.Community);

    const res = await server.post("/api/authenticationProviders.update", user, {
      body: {
        id: provider.id,
        settings: { groupSyncEnabled: false },
      },
    });

    expect(res.status).toEqual(200);
    const reloaded = await AuthenticationProvider.findByPk(provider.id);
    expect(reloaded?.settings?.groupSyncEnabled).toBe(false);
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
  let planSpy: MockInstance<() => Plan>;

  beforeEach(() => {
    planSpy = vi
      .spyOn(Team.prototype, "plan", "get")
      .mockReturnValue(Plan.Business);
  });

  afterEach(() => {
    planSpy.mockRestore();
  });

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

  it("requires the group sync entitlement", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const provider = await team.$create("authenticationProvider", {
      name: "azure",
      providerId: randomUUID(),
    });
    const startGroupSync = vi
      .fn()
      .mockResolvedValue("https://example.com/consent");
    planSpy.mockReturnValue(Plan.Community);
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
      expect(res.status).toEqual(403);
      expect(startGroupSync).not.toHaveBeenCalled();
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

  it("should return every connected provider of the same type", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    await team.$create("authenticationProvider", {
      name: "google",
      providerId: "one.example.com",
    });
    await team.$create("authenticationProvider", {
      name: "google",
      providerId: "two.example.com",
    });

    const res = await server.post("/api/authenticationProviders.list", user);
    const body = await res.json();
    expect(res.status).toEqual(200);

    const google = body.data.filter(
      (provider: { name: string }) => provider.name === "google"
    );
    expect(google.map((p: { providerId: string }) => p.providerId)).toEqual([
      "one.example.com",
      "two.example.com",
    ]);
    expect(google.every((p: { isConnected: boolean }) => p.isConnected)).toBe(
      true
    );
  });

  it("should not return unconnected providers on cloud hosted", async () => {
    setCloudHosted();
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });

    const res = await server.post("/api/authenticationProviders.list", user);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toBe(1);
    expect(body.data[0].name).toBe("slack");
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/authenticationProviders.list");
    expect(res.status).toEqual(401);
  });
});

describe("#authenticationProviders.available", () => {
  let planSpy: MockInstance<() => Plan>;

  beforeEach(() => {
    planSpy = vi
      .spyOn(Team.prototype, "plan", "get")
      .mockReturnValue(Plan.Business);
  });

  afterEach(() => {
    planSpy.mockRestore();
  });

  it("should return the provider types that can be added", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });

    const res = await server.post(
      "/api/authenticationProviders.available",
      user
    );
    const body = await res.json();
    expect(res.status).toEqual(200);

    const ids = body.data.map((provider: { id: string }) => provider.id);
    expect(ids).toContain("google");
    expect(ids).not.toContain("email");
    expect(ids).not.toContain("passkeys");

    const custom = body.data.find(
      (provider: { id: string }) => provider.id === "oidc-custom"
    );
    expect(custom.isConfigurable).toBe(true);
    expect(custom.callbackUrl).toEqual(`${env.URL}/auth/oidc-custom.callback`);
  });

  it("should exclude configurable providers without the entitlement", async () => {
    planSpy.mockReturnValue(Plan.Community);
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });

    const res = await server.post(
      "/api/authenticationProviders.available",
      user
    );
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(
      body.data.some(
        (provider: { id: string }) => provider.id === "oidc-custom"
      )
    ).toBe(false);
  });

  it("should require authorization", async () => {
    const user = await buildUser();
    const res = await server.post(
      "/api/authenticationProviders.available",
      user
    );
    expect(res.status).toEqual(403);
  });
});

const customConfig = {
  displayName: "Okta",
  authorizationUrl: "https://auth.example.com/authorize",
  tokenUrl: "https://auth.example.com/token",
  userInfoUrl: "https://auth.example.com/userinfo",
  clientId: "client-id",
  clientSecret: "client-secret",
};

describe("#authenticationProviders.create", () => {
  let planSpy: MockInstance<() => Plan>;

  beforeEach(() => {
    planSpy = vi
      .spyOn(Team.prototype, "plan", "get")
      .mockReturnValue(Plan.Business);
  });

  afterEach(() => {
    planSpy.mockRestore();
  });

  it("should create a disabled provider from the configuration", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });

    const res = await server.post("/api/authenticationProviders.create", user, {
      body: { name: "oidc-custom", config: customConfig },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual("oidc-custom");
    expect(body.data.displayName).toEqual("Okta");
    expect(body.data.isEnabled).toBe(false);
    expect(body.data.providerId).toEqual(customConfig.authorizationUrl);
    expect(body.data.config.clientId).toEqual("client-id");
    expect(body.data.config.scopes).toEqual("openid profile email");
    expect(body.data.config.clientSecret).toBeUndefined();

    const provider = await AuthenticationProvider.findByPk(body.data.id);
    expect(provider?.teamId).toEqual(team.id);
    expect(provider?.config?.clientSecret).toEqual("client-secret");
  });

  it("should allow multiple providers of the same type", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });

    const first = await server.post(
      "/api/authenticationProviders.create",
      user,
      { body: { name: "oidc-custom", config: customConfig } }
    );
    const second = await server.post(
      "/api/authenticationProviders.create",
      user,
      {
        body: {
          name: "oidc-custom",
          config: {
            ...customConfig,
            authorizationUrl: "https://other.example.com/authorize",
          },
        },
      }
    );
    expect(first.status).toEqual(200);
    expect(second.status).toEqual(200);
  });

  it("should not allow a provider with the same issuer twice", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });

    await server.post("/api/authenticationProviders.create", user, {
      body: { name: "oidc-custom", config: customConfig },
    });
    const res = await server.post("/api/authenticationProviders.create", user, {
      body: { name: "oidc-custom", config: customConfig },
    });
    expect(res.status).toEqual(400);
  });

  it("should require endpoints without an issuer", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });

    const res = await server.post("/api/authenticationProviders.create", user, {
      body: {
        name: "oidc-custom",
        config: { ...customConfig, tokenUrl: undefined },
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should not allow private endpoints on cloud hosted", async () => {
    setCloudHosted();
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });

    const res = await server.post("/api/authenticationProviders.create", user, {
      body: {
        name: "oidc-custom",
        config: { ...customConfig, tokenUrl: "http://127.0.0.1/token" },
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should not allow providers that cannot be configured", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });

    const res = await server.post("/api/authenticationProviders.create", user, {
      body: { name: "google", config: customConfig },
    });
    expect(res.status).toEqual(400);
  });

  it("should require the entitlement", async () => {
    planSpy.mockReturnValue(Plan.Community);
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });

    const res = await server.post("/api/authenticationProviders.create", user, {
      body: { name: "oidc-custom", config: customConfig },
    });
    expect(res.status).toEqual(403);
  });

  it("should require authorization", async () => {
    const user = await buildUser();
    const res = await server.post("/api/authenticationProviders.create", user, {
      body: { name: "oidc-custom", config: customConfig },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#authenticationProviders.update config", () => {
  let planSpy: MockInstance<() => Plan>;

  beforeEach(() => {
    planSpy = vi
      .spyOn(Team.prototype, "plan", "get")
      .mockReturnValue(Plan.Business);
  });

  afterEach(() => {
    planSpy.mockRestore();
  });

  it("should update the configuration and keep the secret", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const created = await server.post(
      "/api/authenticationProviders.create",
      user,
      { body: { name: "oidc-custom", config: customConfig } }
    );
    const { data } = await created.json();

    const res = await server.post("/api/authenticationProviders.update", user, {
      body: {
        id: data.id,
        config: {
          ...customConfig,
          displayName: "Corporate SSO",
          clientSecret: undefined,
        },
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.displayName).toEqual("Corporate SSO");

    const provider = await AuthenticationProvider.findByPk(data.id);
    expect(provider?.config?.displayName).toEqual("Corporate SSO");
    expect(provider?.config?.clientSecret).toEqual("client-secret");
  });

  it("should not configure providers that are not configurable", async () => {
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const [provider] = await team.$get("authenticationProviders");

    const res = await server.post("/api/authenticationProviders.update", user, {
      body: { id: provider.id, config: customConfig },
    });
    expect(res.status).toEqual(400);
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

  it("should destroy configured providers on self-hosted", async () => {
    const planSpy = vi
      .spyOn(Team.prototype, "plan", "get")
      .mockReturnValue(Plan.Business);
    const team = await buildTeam();
    const user = await buildAdmin({ teamId: team.id });
    const created = await server.post(
      "/api/authenticationProviders.create",
      user,
      { body: { name: "oidc-custom", config: customConfig } }
    );
    const { data } = await created.json();

    const res = await server.post("/api/authenticationProviders.delete", user, {
      body: { id: data.id },
    });
    expect(res.status).toEqual(200);
    expect(await AuthenticationProvider.findByPk(data.id)).toBeNull();
    planSpy.mockRestore();
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
