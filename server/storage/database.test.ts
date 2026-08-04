import type { Sequelize } from "sequelize-typescript";
import Document from "@server/models/Document";
import { buildDocument, buildTeam } from "@server/test/factories";
import env from "@server/env";
import { createDatabaseInstance } from "./database";

describe("read replica transactions", () => {
  let replica: Sequelize;

  beforeAll(() => {
    // A second connection to the same test database stands in for a replica.
    replica = createDatabaseInstance(
      env.DATABASE_URL ?? "",
      {},
      { readOnly: true }
    );
  });

  afterAll(async () => {
    await replica.close();
  });

  it("should execute a findAll on the transaction's connection when the transaction is opened on another instance", async () => {
    const team = await buildTeam();
    const document = await buildDocument({ teamId: team.id });

    const documents = await replica.transaction(async (transaction) => {
      const connection = (
        transaction as unknown as {
          connection: { query: (...args: unknown[]) => unknown };
        }
      ).connection;
      const spy = vi.spyOn(connection, "query");

      const results = await Document.unscoped().findAll({
        attributes: ["id"],
        where: { teamId: team.id },
        transaction,
      });

      expect(spy).toHaveBeenCalled();
      return results;
    });

    expect(documents.map((d) => d.id)).toEqual([document.id]);
  });
});
