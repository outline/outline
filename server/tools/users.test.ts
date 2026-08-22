import { UserRole } from "@shared/types";
import { buildAdmin, buildUser } from "@server/test/factories";
import {
  buildOAuthUser,
  callMcpTool,
  parseMcpListContent,
} from "@server/test/McpHelper";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("user tools", () => {
  it("list_users returns users in the workspace", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const other = await buildUser({ teamId: user.teamId });

    const res = await callMcpTool(server, accessToken, "list_users");
    const data = parseMcpListContent<{ id: string }>(res?.result?.content);

    const ids = data.map((item) => item.id);
    expect(ids).toContain(user.id);
    expect(ids).toContain(other.id);
  });

  it("list_users does not return users from another team", async () => {
    const { accessToken } = await buildOAuthUser();
    const other = await buildUser();

    const res = await callMcpTool(server, accessToken, "list_users");
    const data = parseMcpListContent<{ id: string }>(res?.result?.content);

    expect(data.map((item) => item.id)).not.toContain(other.id);
  });

  it("list_users filters by role", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const admin = await buildAdmin({ teamId: user.teamId });

    const res = await callMcpTool(server, accessToken, "list_users", {
      role: UserRole.Admin,
    });
    const data = parseMcpListContent<{ id: string }>(res?.result?.content);

    expect(data).toHaveLength(1);
    expect(data[0].id).toEqual(admin.id);
  });

  it("list_users excludes suspended users by default", async () => {
    const { user, accessToken } = await buildOAuthUser({ role: "admin" });
    const suspended = await buildUser({
      teamId: user.teamId,
      suspendedAt: new Date(),
    });

    const res = await callMcpTool(server, accessToken, "list_users");
    const data = parseMcpListContent<{ id: string }>(res?.result?.content);

    expect(data.map((item) => item.id)).not.toContain(suspended.id);
  });

  it("list_users returns suspended users to an admin filtering by suspended", async () => {
    const { user, accessToken } = await buildOAuthUser({ role: "admin" });
    const suspended = await buildUser({
      teamId: user.teamId,
      suspendedAt: new Date(),
    });

    const res = await callMcpTool(server, accessToken, "list_users", {
      filter: "suspended",
    });
    const data = parseMcpListContent<{ id: string }>(res?.result?.content);

    expect(data).toHaveLength(1);
    expect(data[0].id).toEqual(suspended.id);
  });

  it("list_users does not return suspended users to a non-admin", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const suspended = await buildUser({
      teamId: user.teamId,
      suspendedAt: new Date(),
    });

    const res = await callMcpTool(server, accessToken, "list_users", {
      filter: "suspended",
    });
    const data = parseMcpListContent<{ id: string }>(res?.result?.content);

    expect(data.map((item) => item.id)).not.toContain(suspended.id);
  });

  it("list_users filters users who have never signed in", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const invited = await buildUser({
      teamId: user.teamId,
      lastActiveAt: null,
    });

    const res = await callMcpTool(server, accessToken, "list_users", {
      filter: "invited",
    });
    const data = parseMcpListContent<{ id: string }>(res?.result?.content);

    expect(data).toHaveLength(1);
    expect(data[0].id).toEqual(invited.id);
  });

  it("list_users rejects an unknown role value", async () => {
    const { accessToken } = await buildOAuthUser();

    const res = await callMcpTool(server, accessToken, "list_users", {
      role: "superuser",
    });

    expect(res?.result?.isError || res?.error).toBeTruthy();
  });
});
