import { randomUUID } from "node:crypto";
import type { Property } from "@shared/types";
import { PropertyType } from "@shared/types";
import Database from "@server/models/Database";
import {
  buildDatabase,
  buildDocument,
  buildTeam,
} from "@server/test/factories";
import { RelationHelper } from "./RelationHelper";

/**
 * Builds two databases in the same team, with a bidirectional relation from
 * the first to the second.
 */
async function buildLinkedDatabases() {
  const team = await buildTeam();
  const projects = await buildDatabase({ teamId: team.id, name: "Projects" });
  const tasks = await buildDatabase({ teamId: team.id, name: "Tasks" });

  const relationId = randomUUID();
  const inverseId = randomUUID();

  const schema: Property[] = [
    {
      id: relationId,
      name: "Tasks",
      type: PropertyType.Relation,
      config: { targetDatabaseId: tasks.id, inversePropertyId: inverseId },
    },
  ];

  const previousSchema = projects.dataSchema;
  projects.dataSchema = schema;
  await projects.save();
  await RelationHelper.syncInverseProperties(projects, previousSchema);
  await tasks.reload();

  return { team, projects, tasks, relationId, inverseId };
}

describe("syncInverseProperties", () => {
  it("should create a mirror property on the target database", async () => {
    const { tasks, projects, relationId, inverseId } =
      await buildLinkedDatabases();

    const mirror = tasks.getProperty(inverseId);
    expect(mirror).toBeTruthy();
    expect(mirror?.type).toBe(PropertyType.Relation);
    expect(mirror?.config?.targetDatabaseId).toBe(projects.id);
    expect(mirror?.config?.inversePropertyId).toBe(relationId);
  });

  it("should remove the mirror when the relation is removed", async () => {
    const { projects, tasks, inverseId } = await buildLinkedDatabases();

    const previousSchema = projects.dataSchema;
    projects.dataSchema = [];
    await projects.save();
    await RelationHelper.syncInverseProperties(projects, previousSchema);

    await tasks.reload();
    expect(tasks.getProperty(inverseId)).toBeUndefined();
  });

  it("should remove the mirror when the relation is made one-way", async () => {
    const { projects, tasks, relationId, inverseId } =
      await buildLinkedDatabases();

    const previousSchema = projects.dataSchema;
    projects.dataSchema = [
      {
        id: relationId,
        name: "Tasks",
        type: PropertyType.Relation,
        config: { targetDatabaseId: tasks.id },
      },
    ];
    await projects.save();
    await RelationHelper.syncInverseProperties(projects, previousSchema);

    await tasks.reload();
    expect(tasks.getProperty(inverseId)).toBeUndefined();
  });

  it("should keep the mirror's name when it has been renamed", async () => {
    const { projects, tasks, inverseId } = await buildLinkedDatabases();

    tasks.upsertProperty({
      ...tasks.getProperty(inverseId)!,
      name: "Parent project",
    });
    await tasks.save();

    await RelationHelper.syncInverseProperties(projects, projects.dataSchema);
    await tasks.reload();
    expect(tasks.getProperty(inverseId)?.name).toBe("Parent project");
  });

  it("should reject a relation pointing at another team's database", async () => {
    const team = await buildTeam();
    const otherTeam = await buildTeam();
    const source = await buildDatabase({ teamId: team.id });
    const foreign = await buildDatabase({ teamId: otherTeam.id });

    const previousSchema = source.dataSchema;
    source.dataSchema = [
      {
        id: randomUUID(),
        name: "Linked",
        type: PropertyType.Relation,
        config: {
          targetDatabaseId: foreign.id,
          inversePropertyId: randomUUID(),
        },
      },
    ];

    await expect(
      RelationHelper.syncInverseProperties(source, previousSchema)
    ).rejects.toThrow(/same workspace/);
  });

  it("should support a relation pointing at its own database", async () => {
    const database = await buildDatabase();
    const relationId = randomUUID();
    const inverseId = randomUUID();

    const previousSchema = database.dataSchema;
    database.dataSchema = [
      {
        id: relationId,
        name: "Blocks",
        type: PropertyType.Relation,
        config: {
          targetDatabaseId: database.id,
          inversePropertyId: inverseId,
        },
      },
    ];
    await RelationHelper.syncInverseProperties(database, previousSchema);
    await database.save();

    const reloaded = await Database.findByPk(database.id, {
      rejectOnEmpty: true,
    });
    expect(reloaded.getProperty(inverseId)?.config?.inversePropertyId).toBe(
      relationId
    );
  });
});

describe("syncInverseValues", () => {
  it("should add the back-reference on the linked row", async () => {
    const { team, projects, tasks, relationId, inverseId } =
      await buildLinkedDatabases();

    const project = await buildDocument({
      teamId: team.id,
      collectionId: projects.collectionId,
      databaseId: projects.id,
    });
    const task = await buildDocument({
      teamId: team.id,
      collectionId: tasks.collectionId,
      databaseId: tasks.id,
    });

    project.properties = { [relationId]: [task.id] };
    await project.save();
    await RelationHelper.syncInverseValues(project, projects.dataSchema, {});

    await task.reload();
    expect(task.properties[inverseId]).toEqual([project.id]);
  });

  it("should remove the back-reference when the link is dropped", async () => {
    const { team, projects, tasks, relationId, inverseId } =
      await buildLinkedDatabases();

    const project = await buildDocument({
      teamId: team.id,
      collectionId: projects.collectionId,
      databaseId: projects.id,
    });
    const task = await buildDocument({
      teamId: team.id,
      collectionId: tasks.collectionId,
      databaseId: tasks.id,
    });

    project.properties = { [relationId]: [task.id] };
    await project.save();
    await RelationHelper.syncInverseValues(project, projects.dataSchema, {});

    const previous = { ...project.properties };
    project.properties = {};
    await project.save();
    await RelationHelper.syncInverseValues(
      project,
      projects.dataSchema,
      previous
    );

    await task.reload();
    expect(task.properties[inverseId]).toBeUndefined();
  });

  it("should not duplicate an existing back-reference", async () => {
    const { team, projects, tasks, relationId, inverseId } =
      await buildLinkedDatabases();

    const project = await buildDocument({
      teamId: team.id,
      collectionId: projects.collectionId,
      databaseId: projects.id,
    });
    const task = await buildDocument({
      teamId: team.id,
      collectionId: tasks.collectionId,
      databaseId: tasks.id,
    });

    project.properties = { [relationId]: [task.id] };
    await project.save();
    await RelationHelper.syncInverseValues(project, projects.dataSchema, {});
    await RelationHelper.syncInverseValues(project, projects.dataSchema, {});

    await task.reload();
    expect(task.properties[inverseId]).toEqual([project.id]);
  });

  it("should do nothing for one-way relations", async () => {
    const team = await buildTeam();
    const target = await buildDatabase({ teamId: team.id });
    const relationId = randomUUID();
    const source = await buildDatabase({
      teamId: team.id,
      dataSchema: [
        {
          id: relationId,
          name: "Linked",
          type: PropertyType.Relation,
          config: { targetDatabaseId: target.id },
        },
      ],
    });

    const row = await buildDocument({
      teamId: team.id,
      collectionId: source.collectionId,
      databaseId: source.id,
    });
    const other = await buildDocument({
      teamId: team.id,
      collectionId: target.collectionId,
      databaseId: target.id,
    });

    row.properties = { [relationId]: [other.id] };
    await row.save();
    await RelationHelper.syncInverseValues(row, source.dataSchema, {});

    await other.reload();
    expect(other.properties).toEqual({});
  });
});

describe("clearInverseValues", () => {
  it("should drop back-references to a row before it is removed", async () => {
    const { team, projects, tasks, relationId, inverseId } =
      await buildLinkedDatabases();

    const project = await buildDocument({
      teamId: team.id,
      collectionId: projects.collectionId,
      databaseId: projects.id,
    });
    const task = await buildDocument({
      teamId: team.id,
      collectionId: tasks.collectionId,
      databaseId: tasks.id,
    });

    project.properties = { [relationId]: [task.id] };
    await project.save();
    await RelationHelper.syncInverseValues(project, projects.dataSchema, {});

    await RelationHelper.clearInverseValues(project, projects.dataSchema);

    await task.reload();
    expect(task.properties[inverseId]).toBeUndefined();
  });
});
