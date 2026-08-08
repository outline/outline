import { Event } from "@server/models";
import Collection from "@server/models/Collection";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { buildCollection, buildUser } from "@server/test/factories";
import collectionCollaborativeUpdater from "./collectionCollaborativeUpdater";

describe("collectionCollaborativeUpdater", () => {
  it("should persist the collaborative state and derived content", async () => {
    const scheduleSpy = vi.spyOn(Event, "schedule");
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const ydoc = ProsemirrorHelper.toYDoc("Changed description");

    await collectionCollaborativeUpdater({
      collectionId: collection.id,
      ydoc,
      sessionCollaboratorIds: [user.id],
      isLastConnection: true,
    });

    const updated = await Collection.findByPk(collection.id, {
      includeState: true,
      rejectOnEmpty: true,
    });
    expect(updated.state).toBeTruthy();
    expect(updated.description).toContain("Changed description");
    expect(updated.content).toBeTruthy();

    expect(scheduleSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "collections.update",
        collectionId: collection.id,
        teamId: collection.teamId,
        actorId: user.id,
      })
    );
    scheduleSpy.mockRestore();
  });

  it("should not persist or schedule an event when unchanged", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const ydoc = ProsemirrorHelper.toYDoc("A description");

    await collectionCollaborativeUpdater({
      collectionId: collection.id,
      ydoc,
      sessionCollaboratorIds: [user.id],
      isLastConnection: false,
    });

    const scheduleSpy = vi.spyOn(Event, "schedule");

    // A second run with the same state should be a no-op
    await collectionCollaborativeUpdater({
      collectionId: collection.id,
      ydoc,
      sessionCollaboratorIds: [user.id],
      isLastConnection: true,
    });

    expect(scheduleSpy).not.toHaveBeenCalled();
    scheduleSpy.mockRestore();
  });

  it("should set description to null when the state is empty", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
      description: "Existing description",
    });
    const ydoc = ProsemirrorHelper.toYDoc("");

    await collectionCollaborativeUpdater({
      collectionId: collection.id,
      ydoc,
      sessionCollaboratorIds: [user.id],
      isLastConnection: true,
    });

    const updated = await Collection.findByPk(collection.id, {
      includeState: true,
      rejectOnEmpty: true,
    });
    expect(updated.description).toBeNull();
  });
});
