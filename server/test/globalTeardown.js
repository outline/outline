import { sequelize } from "@server/storage/database";

module.exports = async function (opts) {
  if (!opts.watch && !opts.watchAll) {
    await sequelize.close();
  }
};
