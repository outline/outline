import { sequelize } from "@server/storage/database";

module.exports = async function () {
  const sql = sequelize.getQueryInterface();
  const tables = Object.keys(sequelize.models).map((model) => {
    const n = sequelize.models[model].getTableName();
    return sql.queryGenerator.quoteTable(
      typeof n === "string" ? n : n.tableName
    );
  });
  const flushQuery = `TRUNCATE ${tables.join(", ")} CASCADE`;

  await sequelize.query(flushQuery);
};
