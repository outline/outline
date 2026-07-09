import { randomUUID } from "node:crypto";
import { DataViewType, PropertyType } from "@shared/types";
import { buildCollection } from "@server/test/factories";
import presentCollection from "./collection";

it("presents dataSchema and views", async () => {
  const propertyId = randomUUID();
  const view = {
    id: randomUUID(),
    name: "Table",
    type: DataViewType.Table,
    columns: [{ propertyId, visible: true }],
    sorts: [],
  };
  const collection = await buildCollection({
    dataSchema: [{ id: propertyId, name: "Status", type: PropertyType.Text }],
    views: [view],
  });

  const presented = await presentCollection(undefined, collection);
  expect(presented.dataSchema).toEqual([
    { id: propertyId, name: "Status", type: PropertyType.Text },
  ]);
  expect(presented.views).toEqual([view]);
});

it("presents null dataSchema and views for a regular collection", async () => {
  const collection = await buildCollection();
  const presented = await presentCollection(undefined, collection);
  expect(presented.dataSchema).toBeNull();
  expect(presented.views).toBeNull();
});

it("does not present dataSchema or views publicly", async () => {
  const collection = await buildCollection({ dataSchema: [] });
  const presented = await presentCollection(undefined, collection, {
    isPublic: true,
  });
  expect(presented.dataSchema).toBeUndefined();
  expect(presented.views).toBeUndefined();
});
