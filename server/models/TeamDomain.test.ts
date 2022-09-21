import env from "@server/env";
import { buildAdmin, buildTeam } from "@server/test/factories";
import { getTestDatabase } from "@server/test/support";
import TeamDomain from "./TeamDomain";

const db = getTestDatabase();

afterAll(db.disconnect);

beforeEach(async () => {
  await db.flush();
  jest.resetAllMocks();
});

describe("team domain model", () => {
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
      env.DEPLOYMENT = "hosted";
      const TeamDomain = import("./TeamDomain");
      const team = await buildTeam();
      const user = await buildAdmin({ teamId: team.id });

      let error;
      try {
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
      env.DEPLOYMENT = "hosted";
      const TeamDomain = import("./TeamDomain");
      const team = await buildTeam();
      const user = await buildAdmin({ teamId: team.id });

      let error;
      try {
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
