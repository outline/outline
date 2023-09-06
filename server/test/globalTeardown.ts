import { sequelize } from "@server/storage/database";

module.exports = async function () {
  await sequelize.close();
};
