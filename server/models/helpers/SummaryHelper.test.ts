import { randomUUID } from "node:crypto";
import { Op, Sequelize } from "sequelize";
import type { DataView, DocumentProperties, Property } from "@shared/types";
import { DataViewType, PropertyType, SummaryAggregation } from "@shared/types";
import {
  buildDatabase,
  buildDocument,
  buildTeam,
} from "@server/test/factories";
import { SummaryHelper } from "./SummaryHelper";

const priceId = randomUUID();
const statusId = randomUUID();

const schema: Property[] = [
  { id: priceId, name: "Price", type: PropertyType.Number },
  { id: statusId, name: "Status", type: PropertyType.Text },
];

/** Builds a database with three rows: two priced, one empty. */
async function buildRows() {
  const team = await buildTeam();
  const database = await buildDatabase({ teamId: team.id, dataSchema: schema });

  const build = async (properties: DocumentProperties) => {
    const document = await buildDocument({
      teamId: team.id,
      collectionId: database.collectionId,
      databaseId: database.id,
    });
    document.properties = properties;
    await document.save();
    return document;
  };

  await build({ [priceId]: 10, [statusId]: "open" });
  await build({ [priceId]: 30, [statusId]: "open" });
  await build({});

  return { team, database };
}

const buildView = (
  summaries: Partial<Record<string, SummaryAggregation>>
): DataView => ({
  id: randomUUID(),
  name: "Table",
  type: DataViewType.Table,
  columns: Object.entries(summaries).map(([propertyId, summary]) => ({
    propertyId,
    visible: true,
    summary,
  })),
  sorts: [],
});

describe("SummaryHelper", () => {
  it("should compute numeric aggregates over every matching row", async () => {
    const { database } = await buildRows();
    const where = { databaseId: database.id };

    const sum = await SummaryHelper.compute(
      buildView({ [priceId]: SummaryAggregation.Sum }),
      schema,
      where
    );
    expect(sum[priceId]).toBe(40);

    const avg = await SummaryHelper.compute(
      buildView({ [priceId]: SummaryAggregation.Avg }),
      schema,
      where
    );
    expect(avg[priceId]).toBe(20);

    const min = await SummaryHelper.compute(
      buildView({ [priceId]: SummaryAggregation.Min }),
      schema,
      where
    );
    expect(min[priceId]).toBe(10);

    const max = await SummaryHelper.compute(
      buildView({ [priceId]: SummaryAggregation.Max }),
      schema,
      where
    );
    expect(max[priceId]).toBe(30);
  });

  it("should count rows, filled and empty values", async () => {
    const { database } = await buildRows();
    const where = { databaseId: database.id };

    const result = await SummaryHelper.compute(
      buildView({ [priceId]: SummaryAggregation.Count }),
      schema,
      where
    );
    expect(result[priceId]).toBe(3);

    const filled = await SummaryHelper.compute(
      buildView({ [priceId]: SummaryAggregation.Filled }),
      schema,
      where
    );
    expect(filled[priceId]).toBe(2);

    const empty = await SummaryHelper.compute(
      buildView({ [priceId]: SummaryAggregation.Empty }),
      schema,
      where
    );
    expect(empty[priceId]).toBe(1);
  });

  it("should count distinct values", async () => {
    const { database } = await buildRows();
    const result = await SummaryHelper.compute(
      buildView({ [statusId]: SummaryAggregation.Unique }),
      schema,
      { databaseId: database.id }
    );
    expect(result[statusId]).toBe(1);
  });

  it("should aggregate only the rows matching the conditions", async () => {
    const { database } = await buildRows();
    const result = await SummaryHelper.compute(
      buildView({ [priceId]: SummaryAggregation.Sum }),
      schema,
      {
        databaseId: database.id,
        [Op.and]: [
          Sequelize.literal(
            `(("document"."properties" #>> ARRAY['${priceId}'])::numeric > 20)`
          ),
        ],
      }
    );
    // only the 30 row matches
    expect(result[priceId]).toBe(30);
  });

  it("should return null for aggregates with no rows to reduce", async () => {
    const team = await buildTeam();
    const database = await buildDatabase({
      teamId: team.id,
      dataSchema: schema,
    });

    const result = await SummaryHelper.compute(
      buildView({ [priceId]: SummaryAggregation.Avg }),
      schema,
      { databaseId: database.id }
    );
    expect(result[priceId]).toBeNull();
  });

  it("should exclude drafts unless they are part of the listing", async () => {
    const team = await buildTeam();
    const database = await buildDatabase({
      teamId: team.id,
      dataSchema: schema,
    });
    const draft = await buildDocument({
      teamId: team.id,
      collectionId: database.collectionId,
      databaseId: database.id,
      publishedAt: null,
    });
    draft.properties = { [priceId]: 100 };
    await draft.save();

    const where = { databaseId: database.id };
    const withoutDrafts = await SummaryHelper.compute(
      buildView({ [priceId]: SummaryAggregation.Sum }),
      schema,
      where
    );
    expect(withoutDrafts[priceId]).toBe(0);

    const withDrafts = await SummaryHelper.compute(
      buildView({ [priceId]: SummaryAggregation.Sum }),
      schema,
      where,
      { includeDrafts: true }
    );
    expect(withDrafts[priceId]).toBe(100);
  });

  it("should return nothing when no column asks for a summary", async () => {
    const { database } = await buildRows();
    const result = await SummaryHelper.compute(buildView({}), schema, {
      databaseId: database.id,
    });
    expect(result).toEqual({});
  });
});
