import { buildAdmin, buildTeam } from "@server/test/factories";
import TeamDomain from "./TeamDomain";

describe("TeamDomain", () => {
  describe("create", () => {
    it("should allow creation of domains", async () => {
      const team = await buildTeam();
      const user = await buildAdmin({ teamId: team.id });
      const domain = await TeamDomain.create({
        teamId: team.id,
        name: "getoutline.com",
        createdById: user.id,
      });

      expect(domain.name).toEqual("getoutline.com");
    });

    it("should not allow junk domains", async () => {
      const team = await buildTeam();
      const user = await buildAdmin({ teamId: team.id });

      let error;
      try {
        await TeamDomain.create({
          teamId: team.id,
          name: "sdfsdf",
          createdById: user.id,
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
    });

    it("should not allow creation of domains within restricted list", async () => {
      const TeamDomain = await import("./TeamDomain");
      const team = await buildTeam();
      const user = await buildAdmin({ teamId: team.id });

      let error;
      try {
        // @ts-expect-error TeamDomain type
        await TeamDomain.create({
          teamId: team.id,
          name: "gmail.com",
          createdById: user.id,
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
    });

    it("should ignore casing and spaces when creating domains", async () => {
      const TeamDomain = await import("./TeamDomain");
      const team = await buildTeam();
      const user = await buildAdmin({ teamId: team.id });

      let error;
      try {
        // @ts-expect-error TeamDomain type
        await TeamDomain.create({
          teamId: team.id,
          name: "   GMail.com   ",
          createdById: user.id,
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
    });
  });
});
