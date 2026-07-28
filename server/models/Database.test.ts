import { randomUUID } from "node:crypto";
import type { DataView, Property } from "@shared/types";
import { DataViewType, FilterOperator, PropertyType } from "@shared/types";
import { buildDatabase } from "@server/test/factories";
import Database from "./Database";

const buildSchema = (): Property[] => [
  {
    id: randomUUID(),
    name: "Status",
    type: PropertyType.Select,
    options: [
      { id: "todo", name: "To do" },
      { id: "done", name: "Done" },
    ],
  },
  {
    id: randomUUID(),
    name: "Priority",
    type: PropertyType.Number,
  },
];

describe("dataSchema", () => {
  test("should default to an empty schema", async () => {
    const database = await buildDatabase();
    expect(database.dataSchema).toEqual([]);
    expect(database.views).toEqual([]);
  });

  test("should reject an invalid schema", async () => {
    const database = await buildDatabase();
    const missingFields = [{ id: "nope" }] as unknown as Property[];
    await expect(
      database.update({ dataSchema: missingFields })
    ).rejects.toThrow();

    const unknownType = [
      { id: randomUUID(), name: "A", type: "formula" },
    ] as unknown as Property[];
    await expect(
      database.update({ dataSchema: unknownType })
    ).rejects.toThrow();
  });

  test("should reject a relation with no target database", async () => {
    const database = await buildDatabase();
    await expect(
      database.update({
        dataSchema: [
          { id: randomUUID(), name: "Linked", type: PropertyType.Relation },
        ],
      })
    ).rejects.toThrow();
  });

  test("should get, upsert and remove properties", async () => {
    const schema = buildSchema();
    const database = await buildDatabase({ dataSchema: schema });

    expect(database.getProperty(schema[0].id)?.name).toBe("Status");
    expect(database.getProperty(randomUUID())).toBeUndefined();

    database.upsertProperty({ ...schema[0], name: "State" });
    expect(database.getProperty(schema[0].id)?.name).toBe("State");
    expect(database.dataSchema.length).toBe(2);

    const added = { id: randomUUID(), name: "Due", type: PropertyType.Date };
    database.upsertProperty(added);
    expect(database.dataSchema.length).toBe(3);

    database.removeProperty(added.id);
    expect(database.dataSchema.length).toBe(2);

    await database.save();
    expect(database.getProperty(schema[0].id)?.name).toBe("State");
  });

  test("should remove view references when removing a property", async () => {
    const schema = buildSchema();
    const view: DataView = {
      id: randomUUID(),
      name: "Table",
      type: DataViewType.Table,
      columns: schema.map((property) => ({
        propertyId: property.id,
        visible: true,
      })),
      sorts: [{ propertyId: schema[0].id, direction: "asc" }],
      filter: {
        conjunction: "and",
        conditions: [
          {
            propertyId: schema[0].id,
            operator: FilterOperator.Is,
            value: "todo",
          },
          {
            propertyId: schema[1].id,
            operator: FilterOperator.Gt,
            value: 1,
          },
        ],
      },
      groupBy: schema[0].id,
    };
    const database = await buildDatabase({
      dataSchema: schema,
      views: [view],
    });

    database.removeProperty(schema[0].id);
    await database.save();

    const saved = database.getView(view.id);
    expect(saved?.columns).toEqual([
      { propertyId: schema[1].id, visible: true },
    ]);
    expect(saved?.sorts).toEqual([]);
    expect(saved?.filter).toEqual({
      conjunction: "and",
      conditions: [
        { propertyId: schema[1].id, operator: FilterOperator.Gt, value: 1 },
      ],
    });
    expect(saved?.groupBy).toBeUndefined();
  });
});

describe("views", () => {
  test("should reject invalid views", async () => {
    const database = await buildDatabase();
    const invalid = [{ id: "x" }] as unknown as DataView[];
    await expect(database.update({ views: invalid })).rejects.toThrow();
  });

  test("should get, upsert and remove views", async () => {
    const database = await buildDatabase();
    const view: DataView = {
      id: randomUUID(),
      name: "All",
      type: DataViewType.Table,
      columns: [],
      sorts: [],
    };

    database.upsertView(view);
    expect(database.getView(view.id)?.name).toBe("All");

    database.upsertView({ ...view, name: "Everything" });
    expect(database.views.length).toBe(1);
    expect(database.getView(view.id)?.name).toBe("Everything");

    database.removeView(view.id);
    expect(database.views).toEqual([]);
  });

  test("should hold several views of the same type", async () => {
    const database = await buildDatabase();
    const first: DataView = {
      id: randomUUID(),
      name: "Mine",
      type: DataViewType.Table,
      columns: [],
      sorts: [],
    };
    const second: DataView = { ...first, id: randomUUID(), name: "Everyone" };

    database.upsertView(first);
    database.upsertView(second);
    await database.save();

    expect(database.views.length).toBe(2);
    expect(database.getView(second.id)?.name).toBe("Everyone");
  });

  test("resolveView should prefer the named view, then the first", async () => {
    const first: DataView = {
      id: randomUUID(),
      name: "First",
      type: DataViewType.Table,
      columns: [],
      sorts: [],
    };
    const second: DataView = { ...first, id: randomUUID(), name: "Second" };
    const database = await buildDatabase({ views: [first, second] });

    expect(database.resolveView(second.id).name).toBe("Second");
    expect(database.resolveView(randomUUID()).name).toBe("First");
    expect(database.resolveView().name).toBe("First");
  });

  test("resolveView should build a table over all properties when none saved", async () => {
    const propertyId = randomUUID();
    const database = await buildDatabase({
      dataSchema: [{ id: propertyId, name: "Status", type: PropertyType.Text }],
    });

    const view = database.resolveView();
    expect(view.type).toBe(DataViewType.Table);
    expect(view.columns).toEqual([{ propertyId, visible: true }]);
  });

  test("buildDefaultView should show every property", () => {
    const propertyId = randomUUID();
    const view = Database.buildDefaultView([
      { id: propertyId, name: "Status", type: PropertyType.Text },
    ]);
    expect(view.columns).toEqual([{ propertyId, visible: true }]);
    expect(view.sorts).toEqual([]);
  });
});
