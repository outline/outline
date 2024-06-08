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

      await View.incrementOrCreate({
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

      await View.incrementOrCreate({
        documentId: document.id,
        userId: user.id,
      });

      await user.destroy();

      const views = await View.findByDocument(document.id, {
        includeSuspended: false,
      });
      expect(views.length).toEqual(0);
    });
  });
});
