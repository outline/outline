import { v4 as uuidv4 } from "uuid";
import type { Property } from "@shared/types";
import { PropertyType, RollupAggregation } from "@shared/types";
import {
  buildCollection,
  buildDocument,
  buildTeam,
} from "@server/test/factories";
import { RollupHelper } from "./RollupHelper";

const relationId = uuidv4();
const priceId = uuidv4();
const countId = uuidv4();
const sumId = uuidv4();
const avgId = uuidv4();
const minId = uuidv4();
const maxId = uuidv4();

function buildSchema(): Property[] {
  return [
    { id: relationId, name: "Items", type: PropertyType.Relation },
    {
      id: countId,
      name: "Item count",
      type: PropertyType.Rollup,
      config: {
        relationPropertyId: relationId,
        rollupAggregation: RollupAggregation.Count,
      },
    },
    {
      id: sumId,
      name: "Total",
      type: PropertyType.Rollup,
      config: {
        relationPropertyId: relationId,
        rollupPropertyId: priceId,
        rollupAggregation: RollupAggregation.Sum,
      },
    },
    {
      id: avgId,
      name: "Average",
      type: PropertyType.Rollup,
      config: {
        relationPropertyId: relationId,
        rollupPropertyId: priceId,
        rollupAggregation: RollupAggregation.Avg,
      },
    },
    {
      id: minId,
      name: "Cheapest",
      type: PropertyType.Rollup,
      config: {
        relationPropertyId: relationId,
        rollupPropertyId: priceId,
        rollupAggregation: RollupAggregation.Min,
      },
    },
    {
      id: maxId,
      name: "Priciest",
      type: PropertyType.Rollup,
      config: {
        relationPropertyId: relationId,
        rollupPropertyId: priceId,
        rollupAggregation: RollupAggregation.Max,
      },
    },
  ];
}

describe("RollupHelper", () => {
  it("should compute aggregations across related documents", async () => {
    const team = await buildTeam();
    const priceSchema: Property[] = [
      { id: priceId, name: "Price", type: PropertyType.Number },
    ];
    const itemCollection = await buildCollection({
      teamId: team.id,
      dataSchema: priceSchema,
    });
    const itemA = await buildDocument({
      teamId: team.id,
      collectionId: itemCollection.id,
      properties: { [priceId]: 10 },
    });
    const itemB = await buildDocument({
      teamId: team.id,
      collectionId: itemCollection.id,
      properties: { [priceId]: 30 },
    });
    const itemNoPrice = await buildDocument({
      teamId: team.id,
      collectionId: itemCollection.id,
    });

    const schema = buildSchema();
    const collection = await buildCollection({
      teamId: team.id,
      dataSchema: schema,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
      properties: { [relationId]: [itemA.id, itemB.id, itemNoPrice.id] },
    });

    const rollups = await RollupHelper.compute([document], schema);
    const values = rollups.get(document.id);

    expect(values).toBeTruthy();
    expect(values![countId]).toBe(3);
    expect(values![sumId]).toBe(40);
    expect(values![avgId]).toBe(20);
    expect(values![minId]).toBe(10);
    expect(values![maxId]).toBe(30);
  });

  it("should return count zero and no numeric aggregates for empty relations", async () => {
    const team = await buildTeam();
    const schema = buildSchema();
    const collection = await buildCollection({
      teamId: team.id,
      dataSchema: schema,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });

    const rollups = await RollupHelper.compute([document], schema);
    const values = rollups.get(document.id);
    expect(values?.[countId]).toBe(0);
    expect(values?.[sumId]).toBeUndefined();
    expect(values?.[avgId]).toBeUndefined();
  });

  it("should ignore related documents from other teams", async () => {
    const team = await buildTeam();
    const otherTeam = await buildTeam();
    const foreign = await buildDocument({ teamId: otherTeam.id });

    const schema = buildSchema();
    const collection = await buildCollection({
      teamId: team.id,
      dataSchema: schema,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    // bypass the write-time validation to simulate stale data
    document.properties = { [relationId]: [foreign.id] };

    const rollups = await RollupHelper.compute([document], schema);
    expect(rollups.get(document.id)?.[countId]).toBe(0);
  });

  it("should return an empty map when the schema has no rollups", async () => {
    const team = await buildTeam();
    const document = await buildDocument({ teamId: team.id });
    const rollups = await RollupHelper.compute(
      [document],
      [{ id: uuidv4(), name: "Text", type: PropertyType.Text }]
    );
    expect(rollups.size).toBe(0);
  });
});
