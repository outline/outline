import { Scope } from "@shared/types";
import { Attachment } from "@server/models";
import { buildOAuthAuthentication, buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { buildOAuthUser, callMcpTool } from "@server/test/McpHelper";

const server = getTestServer();

describe("create_attachment", () => {
  it("returns absolute uploadUrl and proxied attachment url", async () => {
    const { accessToken } = await buildOAuthUser();
    const res = await callMcpTool(server, accessToken, "create_attachment", {
      contentType: "image/png",
      name: "test.png",
      size: 1000,
    });

    expect(res?.result?.isError).toBeFalsy();
    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");

    expect(data.uploadUrl).toMatch(/^https?:\/\//);
    expect(data.attachment.url).toMatch(/^https?:\/\//);
    expect(data.attachment.url).toContain("/api/attachments.redirect?id=");
    expect(data.curlCommand).toContain(data.uploadUrl);
  });

  it("persists attachment record", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const res = await callMcpTool(server, accessToken, "create_attachment", {
      contentType: "image/png",
      name: "test.png",
      size: 1000,
    });

    const data = JSON.parse(res?.result?.content?.[0]?.text ?? "{}");
    const attachment = await Attachment.findByPk(data.attachment.id, {
      rejectOnEmpty: true,
    });
    expect(Number(attachment.size)).toEqual(1000);
    expect(attachment.contentType).toEqual("image/png");
    expect(attachment.userId).toEqual(user.id);
    expect(attachment.teamId).toEqual(user.teamId);
  });

  it("rejects size larger than max", async () => {
    const { accessToken } = await buildOAuthUser();
    const res = await callMcpTool(server, accessToken, "create_attachment", {
      contentType: "image/png",
      name: "huge.png",
      size: 10_000_000_000,
    });
    expect(res?.result?.isError).toBe(true);
  });

  it("rejects negative size", async () => {
    const { accessToken } = await buildOAuthUser();
    const res = await callMcpTool(server, accessToken, "create_attachment", {
      contentType: "image/png",
      name: "neg.png",
      size: -1,
    });
    expect(res?.error ?? res?.result?.isError).toBeTruthy();
  });

  it("rejects fractional size", async () => {
    const { accessToken } = await buildOAuthUser();
    const res = await callMcpTool(server, accessToken, "create_attachment", {
      contentType: "image/png",
      name: "frac.png",
      size: 1.5,
    });
    expect(res?.error ?? res?.result?.isError).toBeTruthy();
  });

  it("read-only token does not have create_attachment tool", async () => {
    const user = await buildUser();
    const auth = await buildOAuthAuthentication({
      user,
      scope: [Scope.Read],
    });
    const res = await callMcpTool(
      server,
      auth.accessToken!,
      "create_attachment",
      {
        contentType: "image/png",
        name: "test.png",
        size: 1000,
      }
    );
    expect(res?.result?.isError).toBe(true);
  });
});
