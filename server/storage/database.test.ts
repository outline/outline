import { QueryTypes } from "sequelize";
import type { Transaction } from "sequelize";
import type { Sequelize } from "sequelize-typescript";
import Document from "@server/models/Document";
import { buildDocument, buildTeam } from "@server/test/factories";
import env from "@server/env";
import {
  applyStatementTimeoutToTransactions,
  createDatabaseInstance,
} from "./database";

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

describe("applyStatementTimeoutToTransactions", () => {
  let instance: Sequelize;

  beforeAll(() => {
    instance = applyStatementTimeoutToTransactions(
      createDatabaseInstance(env.DATABASE_URL ?? "", {}),
      1234
    );
  });

  afterAll(async () => {
    await instance.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const showTimeout = (transaction?: Transaction) =>
    instance.query<{ statement_timeout: string }>("SHOW statement_timeout", {
      type: QueryTypes.SELECT,
      transaction,
    });

  it("should set the timeout in the statement that begins the transaction", async () => {
    const spy = vi.spyOn(instance, "query");

    const rows = await instance.transaction(showTimeout);

    expect(rows).toEqual([{ statement_timeout: "1234ms" }]);
    expect(spy.mock.calls.map(([sql]) => sql)).toEqual([
      "START TRANSACTION; SET LOCAL statement_timeout = 1234;",
      "SHOW statement_timeout",
      "COMMIT;",
    ]);
  });

  it("should not set the timeout again for a savepoint", async () => {
    const spy = vi.spyOn(instance, "query");

    const rows = await instance.transaction((transaction) =>
      instance.transaction({ transaction }, showTimeout)
    );

    expect(rows).toEqual([{ statement_timeout: "1234ms" }]);
    expect(
      spy.mock.calls.filter(
        ([sql]) => typeof sql === "string" && sql.includes("SET LOCAL")
      )
    ).toHaveLength(1);
  });

  it("should not leak the timeout outside of the transaction", async () => {
    await instance.transaction(showTimeout);

    const rows = await showTimeout();

    expect(rows).not.toEqual([{ statement_timeout: "1234ms" }]);
  });
});
