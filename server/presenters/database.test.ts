import { randomUUID } from "node:crypto";
import type { DataView } from "@shared/types";
import { DataViewType, PropertyType } from "@shared/types";
import { buildDatabase } from "@server/test/factories";
import presentDatabase from "./database";

it("presents the schema and views", async () => {
  const propertyId = randomUUID();
  const view: DataView = {
    id: randomUUID(),
    name: "Table",
    type: DataViewType.Table,
    columns: [{ propertyId, visible: true }],
    sorts: [],
  };
  const database = await buildDatabase({
    name: "Roadmap",
    dataSchema: [{ id: propertyId, name: "Status", type: PropertyType.Text }],
    views: [view],
  });

  const presented = presentDatabase(database);
  expect(presented.name).toBe("Roadmap");
  expect(presented.collectionId).toBe(database.collectionId);
  expect(presented.dataSchema).toEqual([
    { id: propertyId, name: "Status", type: PropertyType.Text },
  ]);
  expect(presented.views).toEqual([view]);
});

it("presents an empty schema and views for a new database", async () => {
  const database = await buildDatabase();
  const presented = presentDatabase(database);
  expect(presented.dataSchema).toEqual([]);
  expect(presented.views).toEqual([]);
});
