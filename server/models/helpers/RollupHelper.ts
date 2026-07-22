import type { Transaction } from "sequelize";
import type { Property, PropertyValue } from "@shared/types";
import { PropertyType, RollupAggregation } from "@shared/types";
import Document from "@server/models/Document";

/**
 * Computes rollup property values at query time. Rollups aggregate a
 * property across the documents referenced by a relation property; their
 * values are never stored, so every read surface computes them through this
 * helper and merges the result into the presented properties.
 */
export class RollupHelper {
  /**
   * Computes the rollup values for the given documents against their
   * collection's data schema.
   *
   * @param documents The documents to compute rollups for
   * @param schema The collection's data schema
   * @param options Optional transaction to read within
   * @returns A map of document id to computed rollup values keyed by
   *   property id. Empty when the schema defines no valid rollups.
   */
  public static async compute(
    documents: Document[],
    schema: Property[],
    options: { transaction?: Transaction } = {}
  ): Promise<Map<string, Record<string, PropertyValue>>> {
    const result = new Map<string, Record<string, PropertyValue>>();

    const rollups = schema.filter(
      (property) =>
        property.type === PropertyType.Rollup &&
        schema.some(
          (item) =>
            item.id === property.config?.relationPropertyId &&
            item.type === PropertyType.Relation
        )
    );
    if (rollups.length === 0 || documents.length === 0) {
      return result;
    }

    // one batched read for every document referenced by any relation value
    const relationPropertyIds = new Set(
      rollups.map((property) => property.config?.relationPropertyId)
    );
    const referencedIds = Array.from(
      new Set(
        documents.flatMap((document) =>
          Array.from(relationPropertyIds).flatMap((propertyId) => {
            const value = propertyId
              ? document.properties?.[propertyId]
              : undefined;
            return Array.isArray(value)
              ? value.filter((id): id is string => typeof id === "string")
              : [];
          })
        )
      )
    );
    const related =
      referencedIds.length > 0
        ? await Document.findAll({
            attributes: ["id", "properties"],
            where: { id: referencedIds, teamId: documents[0].teamId },
            transaction: options.transaction,
          })
        : [];
    const relatedById = new Map(related.map((item) => [item.id, item]));

    for (const document of documents) {
      const values: Record<string, PropertyValue> = {};
      for (const rollup of rollups) {
        const relationValue =
          document.properties?.[rollup.config!.relationPropertyId!];
        const targets = (Array.isArray(relationValue) ? relationValue : [])
          .map((id) =>
            typeof id === "string" ? relatedById.get(id) : undefined
          )
          .filter((item): item is Document => !!item);
        const computed = this.aggregate(rollup, targets);
        if (computed !== undefined) {
          values[rollup.id] = computed;
        }
      }
      if (Object.keys(values).length > 0) {
        result.set(document.id, values);
      }
    }

    return result;
  }

  private static aggregate(
    rollup: Property,
    targets: Document[]
  ): PropertyValue | undefined {
    const aggregation = rollup.config?.rollupAggregation;

    if (aggregation === RollupAggregation.Count) {
      return targets.length;
    }

    const propertyId = rollup.config?.rollupPropertyId;
    if (!propertyId) {
      return undefined;
    }
    const numbers = targets
      .map((target) => target.properties?.[propertyId])
      .filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value)
      );
    if (numbers.length === 0) {
      return undefined;
    }

    switch (aggregation) {
      case RollupAggregation.Sum:
        return numbers.reduce((sum, value) => sum + value, 0);
      case RollupAggregation.Avg:
        return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
      case RollupAggregation.Min:
        return Math.min(...numbers);
      case RollupAggregation.Max:
        return Math.max(...numbers);
      default:
        return undefined;
    }
  }
}
