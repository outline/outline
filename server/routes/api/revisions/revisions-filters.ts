import { Op } from "sequelize";
import type { WhereOptions } from "sequelize";

/**
 * Construye el objeto WhereOptions de Sequelize para filtrar revisiones.
 * Función pura extraída del handler para facilitar pruebas unitarias.
 */
export function buildRevisionWhereClause(
  documentId: string,
  userId?: string,
  dateFrom?: Date,
  dateTo?: Date
): WhereOptions {
  const where: WhereOptions = { documentId };

  if (userId) {
    (where as Record<symbol, unknown>)[Op.or] = [
      { userId },
      { collaboratorIds: { [Op.contains]: [userId] } },
    ];
  }

  if (dateFrom || dateTo) {
    const createdAtFilter: Record<symbol, Date> = {};
    if (dateFrom) {
      createdAtFilter[Op.gte] = dateFrom;
    }
    if (dateTo) {
      createdAtFilter[Op.lte] = dateTo;
    }
    where.createdAt = createdAtFilter;
  }

  return where;
}
