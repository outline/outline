import { createContext } from "@server/context";
import { buildTeam, buildDocument, buildUser } from "@server/test/factories";
import View from "./View";

describe("View", () => {
  describe("findByDocument", () => {
    it("should return list of views", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      const document = await buildDocument({
        teamId: team.id,
      });

      await View.incrementOrCreate(createContext({ user }), {
        documentId: document.id,
        userId: user.id,
      });

      const views = await View.findByDocument(document.id, {
        includeSuspended: false,
      });
      expect(views.length).toEqual(1);
      expect(views[0].user.id).toEqual(user.id);
    });

    it("should not return views for deleted users", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      const document = await buildDocument({
        teamId: team.id,
      });

      await View.incrementOrCreate(createContext({ user }), {
        documentId: document.id,
        userId: user.id,
      });

      await user.destroy({ hooks: false });

      const views = await View.findByDocument(document.id, {
        includeSuspended: false,
      });
      expect(views.length).toEqual(0);
    });
  });

  describe("incrementOrCreate", () => {
    it("should create a new view when one doesn't exist", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      const document = await buildDocument({
        teamId: team.id,
      });

      const view = await View.incrementOrCreate(createContext({ user }), {
        documentId: document.id,
        userId: user.id,
      });

      expect(view).toBeDefined();
      expect(view.documentId).toEqual(document.id);
      expect(view.userId).toEqual(user.id);
      expect(view.count).toEqual(1);
    });

    it("should increment count when view already exists", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      const document = await buildDocument({
        teamId: team.id,
      });

      // Create initial view
      const firstView = await View.incrementOrCreate(createContext({ user }), {
        documentId: document.id,
        userId: user.id,
      });
      expect(firstView.count).toEqual(1);

      // Increment the same view
      const secondView = await View.incrementOrCreate(createContext({ user }), {
        documentId: document.id,
        userId: user.id,
      });
      expect(secondView.count).toEqual(2);
      expect(secondView.id).toEqual(firstView.id);
    });

    it("should create separate views for different users", async () => {
      const team = await buildTeam();
      const user1 = await buildUser({
        teamId: team.id,
      });
      const user2 = await buildUser({
        teamId: team.id,
      });
      const document = await buildDocument({
        teamId: team.id,
      });

      const view1 = await View.incrementOrCreate(
        createContext({ user: user1 }),
        {
          documentId: document.id,
          userId: user1.id,
        }
      );
      const view2 = await View.incrementOrCreate(
        createContext({ user: user2 }),
        {
          documentId: document.id,
          userId: user2.id,
        }
      );

      expect(view1.id).not.toEqual(view2.id);
      expect(view1.userId).toEqual(user1.id);
      expect(view2.userId).toEqual(user2.id);
      expect(view1.count).toEqual(1);
      expect(view2.count).toEqual(1);
    });

    it("should create separate views for different documents", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      const document1 = await buildDocument({
        teamId: team.id,
      });
      const document2 = await buildDocument({
        teamId: team.id,
      });

      const view1 = await View.incrementOrCreate(createContext({ user }), {
        documentId: document1.id,
        userId: user.id,
      });
      const view2 = await View.incrementOrCreate(createContext({ user }), {
        documentId: document2.id,
        userId: user.id,
      });

      expect(view1.id).not.toEqual(view2.id);
      expect(view1.documentId).toEqual(document1.id);
      expect(view2.documentId).toEqual(document2.id);
      expect(view1.count).toEqual(1);
      expect(view2.count).toEqual(1);
    });

    it("should update lastViewedAt on increment", async () => {
      const team = await buildTeam();
      const user = await buildUser({
        teamId: team.id,
      });
      const document = await buildDocument({
        teamId: team.id,
      });

      const view1 = await View.incrementOrCreate(createContext({ user }), {
        documentId: document.id,
        userId: user.id,
      });
      const firstViewedAt = view1.updatedAt;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const view2 = await View.incrementOrCreate(createContext({ user }), {
        documentId: document.id,
        userId: user.id,
      });

      expect(view2.updatedAt.getTime()).toBeGreaterThan(
        firstViewedAt.getTime()
      );
    });
  });
});
