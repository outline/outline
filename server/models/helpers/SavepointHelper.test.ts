import { Tag } from "@server/models";
import { sequelize } from "@server/storage/database";
import { buildTeam } from "@server/test/factories";
import SavepointHelper from "./SavepointHelper";

describe("SavepointHelper", () => {
  describe("findOrCreate", () => {
    it("returns an existing row without creating", async () => {
      const team = await buildTeam();
      const existing = await Tag.create({ teamId: team.id, name: "found" });
      const create = vi.fn();

      const [tag, created] = await sequelize.transaction((transaction) =>
        SavepointHelper.findOrCreate(
          Tag,
          { teamId: team.id, name: "found" },
          transaction,
          create
        )
      );

      expect(tag.id).toBe(existing.id);
      expect(created).toBe(false);
      expect(create).not.toHaveBeenCalled();
    });

    it("creates a missing row inside a savepoint", async () => {
      const team = await buildTeam();

      const [tag, created] = await sequelize.transaction((transaction) =>
        SavepointHelper.findOrCreate(
          Tag,
          { teamId: team.id, name: "fresh" },
          transaction,
          (savepoint) =>
            Tag.create(
              { teamId: team.id, name: "fresh" },
              { transaction: savepoint }
            )
        )
      );

      expect(tag.name).toBe("fresh");
      expect(created).toBe(true);
    });

    it("returns the conflicting row and keeps the transaction usable", async () => {
      const team = await buildTeam();

      // an uncommitted competing insert: the lookup misses it, then the
      // savepoint's insert blocks on it and conflicts once it commits
      const competing = await sequelize.transaction();
      const winner = await Tag.create(
        { teamId: team.id, name: "raced" },
        { transaction: competing }
      );
      const pending = sequelize.transaction(async (transaction) => {
        const result = await SavepointHelper.findOrCreate(
          Tag,
          { teamId: team.id, name: "raced" },
          transaction,
          (savepoint) =>
            Tag.create(
              { teamId: team.id, name: "raced" },
              { transaction: savepoint }
            )
        );
        const count = await Tag.count({
          where: { teamId: team.id },
          transaction,
        });
        return [...result, count] as const;
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
      await competing.commit();
      const [tag, created, count] = await pending;

      expect(tag.id).toBe(winner.id);
      expect(created).toBe(false);
      expect(count).toBe(1);
    });
  });
});
