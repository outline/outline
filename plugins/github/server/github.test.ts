import { RequestError } from "octokit";
import { GitHub, InstallationAccess } from "./github";

type Client = Parameters<typeof GitHub.canManageInstallation>[0];
type UserInstallation = Parameters<typeof GitHub.canManageInstallation>[1];

function buildInstallation(
  targetType: string,
  permissions: Record<string, string> = {}
) {
  return {
    id: 1,
    target_type: targetType,
    account: { id: 100, login: "acme" },
    permissions,
  } as unknown as UserInstallation;
}

function buildClient({
  userId = 100,
  membership,
}: {
  userId?: number;
  membership?: { state: string; role: string } | RequestError;
}) {
  return {
    requestAuthenticatedUser: async () => ({ data: { id: userId } }),
    requestOrgMembership: async () => {
      if (membership instanceof RequestError) {
        throw membership;
      }
      return { data: membership };
    },
  } as unknown as Client;
}

function buildRequestError(status: number) {
  return new RequestError("error", status, {
    request: { method: "GET", url: "https://api.github.com", headers: {} },
  });
}

describe("GitHub.canManageInstallation", () => {
  it("should allow the owner of a personal account", async () => {
    const client = buildClient({ userId: 100 });
    expect(
      await GitHub.canManageInstallation(client, buildInstallation("User"))
    ).toBe(InstallationAccess.Allowed);
  });

  it("should deny another user on a personal account", async () => {
    const client = buildClient({ userId: 200 });
    expect(
      await GitHub.canManageInstallation(client, buildInstallation("User"))
    ).toBe(InstallationAccess.Denied);
  });

  it("should allow an active organization admin", async () => {
    const client = buildClient({
      membership: { state: "active", role: "admin" },
    });
    expect(
      await GitHub.canManageInstallation(
        client,
        buildInstallation("Organization", { members: "read" })
      )
    ).toBe(InstallationAccess.Allowed);
  });

  it("should deny an organization member who is not an admin", async () => {
    const client = buildClient({
      membership: { state: "active", role: "member" },
    });
    expect(
      await GitHub.canManageInstallation(
        client,
        buildInstallation("Organization", { members: "read" })
      )
    ).toBe(InstallationAccess.Denied);
  });

  it("should deny a pending organization admin", async () => {
    const client = buildClient({
      membership: { state: "pending", role: "admin" },
    });
    expect(
      await GitHub.canManageInstallation(
        client,
        buildInstallation("Organization", { members: "read" })
      )
    ).toBe(InstallationAccess.Denied);
  });

  it("should deny a user outside the organization", async () => {
    const client = buildClient({ membership: buildRequestError(404) });
    expect(
      await GitHub.canManageInstallation(
        client,
        buildInstallation("Organization", { members: "read" })
      )
    ).toBe(InstallationAccess.Denied);
  });

  it("should report a missing members permission", async () => {
    const client = buildClient({
      membership: { state: "active", role: "admin" },
    });
    expect(
      await GitHub.canManageInstallation(
        client,
        buildInstallation("Organization")
      )
    ).toBe(InstallationAccess.MissingPermission);
  });

  it("should deny an installation on an enterprise", async () => {
    const client = buildClient({});
    expect(
      await GitHub.canManageInstallation(
        client,
        buildInstallation("Enterprise")
      )
    ).toBe(InstallationAccess.Denied);
  });
});
