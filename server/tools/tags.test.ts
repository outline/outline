import { DocumentTag, Tag } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import {
  buildOAuthUser,
  callMcpTool,
  parseMcpListContent,
} from "@server/test/McpHelper";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("list_tags", () => {
  it("returns a tag attached to a readable document, with documentCount", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      collectionId: collection.id,
    });
    const tag = await Tag.create({
      teamId: user.teamId,
      name: "invented-tag",
    });
    await DocumentTag.create({ tagId: tag.id, documentId: document.id });

    const res = await callMcpTool(server, accessToken, "list_tags");
    const data = parseMcpListContent<{
      id: string;
      name: string;
      documentCount: number;
    }>(res?.result?.content as { text?: string }[]);

    const match = data.find((t) => t.id === tag.id);
    expect(match).toBeDefined();
    expect(match?.name).toEqual("invented-tag");
    expect(match?.documentCount).toEqual(1);
  });

  it("does not return a tag with no readable documents", async () => {
    const { user, accessToken } = await buildOAuthUser();
    const otherUser = await buildUser({ teamId: user.teamId });
    const privateCollection = await buildCollection({
      teamId: user.teamId,
      userId: otherUser.id,
      permission: null,
    });
    const privateDocument = await buildDocument({
      teamId: user.teamId,
      userId: otherUser.id,
      collectionId: privateCollection.id,
    });
    const tag = await Tag.create({
      teamId: user.teamId,
      name: "invented-private",
    });
    await DocumentTag.create({
      tagId: tag.id,
      documentId: privateDocument.id,
    });

    const res = await callMcpTool(server, accessToken, "list_tags");
    const data = parseMcpListContent<{ id: string }>(
      res?.result?.content as { text?: string }[]
    );

    expect(data.map((t) => t.id)).not.toContain(tag.id);
  });
});
