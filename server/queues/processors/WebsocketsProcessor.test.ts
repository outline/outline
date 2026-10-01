import type { Server } from "socket.io";
import { DocumentTag, Tag, UserMembership } from "@server/models";
import { sequelize } from "@server/storage/database";
import {
  buildCollection,
  buildDocument,
  buildDraftDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import WebsocketsProcessor from "./WebsocketsProcessor";

const ip = "127.0.0.1";

async function captureQueries(fn: () => Promise<unknown>) {
  const queries: string[] = [];
  const query = sequelize.query.bind(sequelize);
  const spy = vi
    .spyOn(sequelize, "query")
    .mockImplementation((sql, options) => {
      queries.push(typeof sql === "string" ? sql : sql.query);
      return query(sql, options);
    });
  try {
    await fn();
  } finally {
    spy.mockRestore();
  }
  return queries;
}

function mockSocketio() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { socketio: { to } as unknown as Server, to, emit };
}

describe("WebsocketsProcessor", () => {
  describe("tag events", () => {
    it("should send tags.create only to the actor", async () => {
      const user = await buildUser();
      const tag = await Tag.create({ teamId: user.teamId, name: "fresh" });
      const { socketio, to, emit } = mockSocketio();

      await new WebsocketsProcessor().perform(
        {
          name: "tags.create",
          modelId: tag.id,
          teamId: user.teamId,
          actorId: user.id,
          ip,
        },
        socketio
      );

      expect(to).toHaveBeenCalledWith([`user-${user.id}`]);
      expect(emit).toHaveBeenCalledWith(
        "tags.create",
        expect.objectContaining({ id: tag.id, name: "fresh" })
      );
      expect(emit.mock.calls[0][1]).not.toHaveProperty("documentCount");
      expect(emit.mock.calls[0][1]).not.toHaveProperty("createdById");
    });

    it("should send tags.update to the audiences of tagged documents", async () => {
      const team = await buildTeam();
      const actor = await buildUser({ teamId: team.id });
      const member = await buildUser({ teamId: team.id });
      const publicCollection = await buildCollection({ teamId: team.id });
      const privateCollection = await buildCollection({
        teamId: team.id,
        permission: null,
      });
      const publicDocument = await buildDocument({
        teamId: team.id,
        collectionId: publicCollection.id,
      });
      const privateDocument = await buildDocument({
        teamId: team.id,
        collectionId: privateCollection.id,
      });
      await UserMembership.create({
        documentId: privateDocument.id,
        userId: member.id,
        createdById: actor.id,
      });
      const tag = await Tag.create({ teamId: team.id, name: "renamed" });
      await DocumentTag.create({
        tagId: tag.id,
        documentId: publicDocument.id,
      });
      await DocumentTag.create({
        tagId: tag.id,
        documentId: privateDocument.id,
      });
      const { socketio, to, emit } = mockSocketio();

      await new WebsocketsProcessor().perform(
        {
          name: "tags.update",
          modelId: tag.id,
          teamId: team.id,
          actorId: actor.id,
          ip,
        },
        socketio
      );

      const channels = (to.mock.calls[0] as unknown as [string[]])[0];
      expect(channels.sort()).toEqual(
        [
          `user-${actor.id}`,
          `user-${member.id}`,
          `collection-${publicCollection.id}`,
          `collection-${privateCollection.id}`,
          `team-${team.id}.members`,
        ].sort()
      );
      expect(emit).toHaveBeenCalledWith(
        "tags.update",
        expect.objectContaining({ id: tag.id, name: "renamed" })
      );
    });

    it("should not send tags.update to the team when the tag is unused", async () => {
      const user = await buildUser();
      const tag = await Tag.create({ teamId: user.teamId, name: "unused" });
      const { socketio, to } = mockSocketio();

      await new WebsocketsProcessor().perform(
        {
          name: "tags.update",
          modelId: tag.id,
          teamId: user.teamId,
          actorId: user.id,
          ip,
        },
        socketio
      );

      expect(to).toHaveBeenCalledWith([`user-${user.id}`]);
    });

    it("should send tags.update to the creator of a tagged draft", async () => {
      const team = await buildTeam();
      const actor = await buildUser({ teamId: team.id });
      const author = await buildUser({ teamId: team.id });
      const collection = await buildCollection({ teamId: team.id });
      const draft = await buildDraftDocument({
        teamId: team.id,
        userId: author.id,
        collectionId: collection.id,
      });
      const tag = await Tag.create({ teamId: team.id, name: "drafted" });
      await DocumentTag.create({ tagId: tag.id, documentId: draft.id });
      const { socketio, to } = mockSocketio();

      await new WebsocketsProcessor().perform(
        {
          name: "tags.update",
          modelId: tag.id,
          teamId: team.id,
          actorId: actor.id,
          ip,
        },
        socketio
      );

      const channels = (to.mock.calls[0] as unknown as [string[]])[0];
      // a draft is not visible to its collection, only to its creator
      expect(channels.sort()).toEqual(
        [`user-${actor.id}`, `user-${author.id}`].sort()
      );
    });

    it("should not send tags.update to the audience of a deleted document", async () => {
      const team = await buildTeam();
      const actor = await buildUser({ teamId: team.id });
      const collection = await buildCollection({ teamId: team.id });
      const document = await buildDocument({
        teamId: team.id,
        collectionId: collection.id,
      });
      const tag = await Tag.create({ teamId: team.id, name: "trashed" });
      await DocumentTag.create({ tagId: tag.id, documentId: document.id });
      await document.destroy();
      const { socketio, to } = mockSocketio();

      await new WebsocketsProcessor().perform(
        {
          name: "tags.update",
          modelId: tag.id,
          teamId: team.id,
          actorId: actor.id,
          ip,
        },
        socketio
      );

      expect(to).toHaveBeenCalledWith([`user-${actor.id}`]);
    });

    it("should resolve the audience of a tag in a single query", async () => {
      const user = await buildUser();
      const tag = await Tag.create({ teamId: user.teamId, name: "lonely" });
      const { socketio, to } = mockSocketio();

      const queries = await captureQueries(() =>
        new WebsocketsProcessor().perform(
          {
            name: "tags.update",
            modelId: tag.id,
            teamId: user.teamId,
            actorId: user.id,
            ip,
          },
          socketio
        )
      );

      expect(to).toHaveBeenCalledWith([`user-${user.id}`]);
      expect(queries.filter((sql) => /document_tags/.test(sql))).toHaveLength(
        1
      );
      expect(
        queries.filter((sql) => /FROM "(documents|collections)"/.test(sql))
      ).toHaveLength(0);
    });

    it("should send tags.merge with sourceId to the audiences of the target's documents", async () => {
      const team = await buildTeam();
      const actor = await buildUser({ teamId: team.id });
      const member = await buildUser({ teamId: team.id });
      const outsider = await buildUser({ teamId: team.id });
      const privateCollection = await buildCollection({
        teamId: team.id,
        permission: null,
      });
      const document = await buildDocument({
        teamId: team.id,
        collectionId: privateCollection.id,
      });
      await UserMembership.create({
        documentId: document.id,
        userId: member.id,
        createdById: actor.id,
      });
      const source = await Tag.create({ teamId: team.id, name: "old" });
      const target = await Tag.create({ teamId: team.id, name: "new" });
      await DocumentTag.create({ tagId: target.id, documentId: document.id });
      const { socketio, to, emit } = mockSocketio();

      await new WebsocketsProcessor().perform(
        {
          name: "tags.merge",
          modelId: target.id,
          teamId: team.id,
          actorId: actor.id,
          ip,
          data: { sourceId: source.id, sourceName: source.name },
        },
        socketio
      );

      const channels = (to.mock.calls[0] as unknown as [string[]])[0];
      expect(channels.sort()).toEqual(
        [
          `user-${actor.id}`,
          `user-${member.id}`,
          `collection-${privateCollection.id}`,
        ].sort()
      );
      expect(channels).not.toContain(`user-${outsider.id}`);
      expect(emit).toHaveBeenCalledWith(
        "tags.merge",
        expect.objectContaining({
          id: target.id,
          name: "new",
          sourceId: source.id,
        })
      );
    });

    it("should send only the id of a deleted tag to the team", async () => {
      const user = await buildUser();
      const tagId = crypto.randomUUID();
      const { socketio, to, emit } = mockSocketio();

      await new WebsocketsProcessor().perform(
        {
          name: "tags.delete",
          modelId: tagId,
          teamId: user.teamId,
          actorId: user.id,
          ip,
          data: { name: "gone" },
        },
        socketio
      );

      expect(to).toHaveBeenCalledWith(`team-${user.teamId}`);
      expect(emit).toHaveBeenCalledWith("tags.delete", { modelId: tagId });
    });

    it.each(["tags.add", "tags.remove"] as const)(
      "should send %s to the document audiences",
      async (name) => {
        const team = await buildTeam();
        const actor = await buildUser({ teamId: team.id });
        const collection = await buildCollection({
          teamId: team.id,
          permission: null,
        });
        const document = await buildDocument({
          teamId: team.id,
          collectionId: collection.id,
        });
        const tag = await Tag.create({ teamId: team.id, name: "applied" });
        const { socketio, to, emit } = mockSocketio();

        await new WebsocketsProcessor().perform(
          {
            name,
            modelId: crypto.randomUUID(),
            documentId: document.id,
            teamId: team.id,
            actorId: actor.id,
            ip,
            data: { tagId: tag.id },
          },
          socketio
        );

        const channels = (to.mock.calls[0] as unknown as [string[]])[0];
        expect(channels.sort()).toEqual(
          [`user-${actor.id}`, `collection-${collection.id}`].sort()
        );
        expect(emit).toHaveBeenCalledWith(name, {
          documentId: document.id,
          tagId: tag.id,
          tag: expect.objectContaining({ id: tag.id, name: "applied" }),
        });
        expect(emit.mock.calls[0][1].tag).not.toHaveProperty("documentCount");
      }
    );
  });
  describe("document events", () => {
    it("should push a document update without tags", async () => {
      const team = await buildTeam();
      const actor = await buildUser({ teamId: team.id });
      const document = await buildDocument({
        teamId: team.id,
        userId: actor.id,
      });
      const tag = await Tag.create({ teamId: team.id, name: "pushed" });
      await DocumentTag.create({ tagId: tag.id, documentId: document.id });
      const { socketio, emit } = mockSocketio();

      const queries = await captureQueries(() =>
        new WebsocketsProcessor().perform(
          {
            name: "documents.update",
            documentId: document.id,
            collectionId: document.collectionId!,
            teamId: team.id,
            actorId: actor.id,
            ip,
            createdAt: new Date().toISOString(),
            data: { done: true },
          },
          socketio
        )
      );

      expect(emit).toHaveBeenCalledWith(
        "documents.update",
        expect.objectContaining({ id: document.id })
      );
      expect(emit.mock.calls[0][1]).not.toHaveProperty("tags");
      expect(queries.filter((sql) => /document_tags/.test(sql))).toHaveLength(
        0
      );
    });
  });
});
