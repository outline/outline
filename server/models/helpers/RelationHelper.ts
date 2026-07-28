import { difference } from "es-toolkit";
import type { Transaction } from "sequelize";
import type { DocumentProperties, Property } from "@shared/types";
import { PropertyType } from "@shared/types";
import { ValidationError } from "@server/errors";
import Database from "@server/models/Database";
import Document from "@server/models/Document";

/**
 * Keeps the two sides of a bidirectional relation consistent.
 *
 * A relation property may name an `inversePropertyId` on the database it
 * targets. When it does, the two properties mirror each other: the mirror
 * property is created and removed alongside the property that declares it, and
 * writing rows through one side updates the other.
 */
export class RelationHelper {
  /**
   * Returns the relation properties in a schema that declare a mirror on their
   * target database.
   *
   * @param schema The data schema to scan
   * @returns The bidirectional relation properties.
   */
  public static bidirectionalRelations(schema: Property[]): Property[] {
    return schema.filter(
      (property) =>
        property.type === PropertyType.Relation &&
        !!property.config?.targetDatabaseId &&
        !!property.config?.inversePropertyId
    );
  }

  /**
   * Reconciles the mirror properties on target databases after a database's
   * schema changed — creating mirrors for newly bidirectional relations and
   * removing them for relations that were deleted or made one-way.
   *
   * A database may point a relation at itself, in which case the mirror lives
   * in the same schema and is written in place.
   *
   * @param database The database whose schema changed, already holding the new schema
   * @param previousSchema The schema as it was before the change
   * @param options Transaction to write within
   */
  public static async syncInverseProperties(
    database: Database,
    previousSchema: Property[],
    options: { transaction?: Transaction } = {}
  ): Promise<void> {
    const { transaction } = options;
    const current = this.bidirectionalRelations(database.dataSchema);
    const previous = this.bidirectionalRelations(previousSchema);

    // a mirror is stale when the property that declared it is gone, or now
    // points somewhere else
    const stale = previous.filter(
      (property) =>
        !current.some(
          (item) =>
            item.id === property.id &&
            item.config?.inversePropertyId ===
              property.config?.inversePropertyId &&
            item.config?.targetDatabaseId === property.config?.targetDatabaseId
        )
    );

    for (const property of stale) {
      const target = await this.loadTarget(
        database,
        property.config!.targetDatabaseId!,
        transaction
      );
      if (!target) {
        continue;
      }
      target.removeProperty(property.config!.inversePropertyId!);
      await this.persist(database, target, transaction);
    }

    for (const property of current) {
      const targetDatabaseId = property.config!.targetDatabaseId!;
      const inversePropertyId = property.config!.inversePropertyId!;

      const target = await this.loadTarget(
        database,
        targetDatabaseId,
        transaction
      );
      if (!target) {
        throw ValidationError(
          `Relation property "${property.name}" references a database that does not exist`
        );
      }
      if (target.teamId !== database.teamId) {
        throw ValidationError(
          `Relation property "${property.name}" must reference a database in the same workspace`
        );
      }

      const existing = target.getProperty(inversePropertyId);
      if (
        existing &&
        (existing.type !== PropertyType.Relation ||
          existing.config?.targetDatabaseId !== database.id)
      ) {
        throw ValidationError(
          `Property "${existing.name}" on the target database is not a relation back to this database`
        );
      }

      target.upsertProperty({
        id: inversePropertyId,
        name: existing?.name ?? database.name,
        type: PropertyType.Relation,
        config: {
          ...existing?.config,
          targetDatabaseId: database.id,
          inversePropertyId: property.id,
        },
      });
      await this.persist(database, target, transaction);
    }
  }

  /**
   * Mirrors a row's relation changes onto the rows it references, so that
   * adding a link from one side adds the matching link on the other.
   *
   * Values are read back and rewritten per referenced row, which keeps the
   * write small — only rows whose membership actually changed are touched.
   *
   * @param document The row that was written
   * @param schema The data schema of the row's database
   * @param previousProperties The row's property values before the write
   * @param options Transaction to write within
   */
  public static async syncInverseValues(
    document: Document,
    schema: Property[],
    previousProperties: DocumentProperties,
    options: { transaction?: Transaction } = {}
  ): Promise<void> {
    const { transaction } = options;
    const relations = this.bidirectionalRelations(schema);
    if (relations.length === 0) {
      return;
    }

    for (const property of relations) {
      const inversePropertyId = property.config!.inversePropertyId!;
      const before = asIds(previousProperties[property.id]);
      const after = asIds(document.properties[property.id]);

      const added = difference(after, before);
      const removed = difference(before, after);
      if (added.length === 0 && removed.length === 0) {
        continue;
      }

      const targets = await Document.findAll({
        where: { id: [...added, ...removed], teamId: document.teamId },
        transaction,
      });

      for (const target of targets) {
        const existing = asIds(target.properties?.[inversePropertyId]);
        const next = added.includes(target.id)
          ? existing.includes(document.id)
            ? existing
            : [...existing, document.id]
          : existing.filter((id) => id !== document.id);

        if (next.length === existing.length) {
          continue;
        }

        target.properties = { ...target.properties };
        if (next.length > 0) {
          target.properties[inversePropertyId] = next;
        } else {
          delete target.properties[inversePropertyId];
        }
        target.changed("properties", true);
        await target.save({ transaction, hooks: false, silent: true });
      }
    }
  }

  /**
   * Clears every back-reference to a row before it is removed, so that
   * deleting one side of a relation does not leave dangling links on the
   * other.
   *
   * @param document The row being deleted
   * @param schema The data schema of the row's database
   * @param options Transaction to write within
   */
  public static async clearInverseValues(
    document: Document,
    schema: Property[],
    options: { transaction?: Transaction } = {}
  ): Promise<void> {
    const { transaction } = options;
    const relations = this.bidirectionalRelations(schema);

    for (const property of relations) {
      const inversePropertyId = property.config!.inversePropertyId!;
      const referenced = asIds(document.properties?.[property.id]);
      if (referenced.length === 0) {
        continue;
      }

      const targets = await Document.findAll({
        where: { id: referenced, teamId: document.teamId },
        transaction,
      });

      for (const target of targets) {
        const existing = asIds(target.properties?.[inversePropertyId]);
        const next = existing.filter((id) => id !== document.id);
        if (next.length === existing.length) {
          continue;
        }

        target.properties = { ...target.properties };
        if (next.length > 0) {
          target.properties[inversePropertyId] = next;
        } else {
          delete target.properties[inversePropertyId];
        }
        target.changed("properties", true);
        await target.save({ transaction, hooks: false, silent: true });
      }
    }
  }

  /** Loads a target database, reusing the source when it points at itself. */
  private static async loadTarget(
    database: Database,
    targetDatabaseId: string,
    transaction?: Transaction
  ): Promise<Database | null> {
    return targetDatabaseId === database.id
      ? database
      : Database.findByPk(targetDatabaseId, { transaction });
  }

  /** Saves a target database unless it is the source, which the caller saves. */
  private static async persist(
    database: Database,
    target: Database,
    transaction?: Transaction
  ): Promise<void> {
    if (target.id !== database.id) {
      await target.save({ transaction });
    }
  }
}

function asIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
