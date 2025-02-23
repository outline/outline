const tableName = "team_domains";
// because of this issue in Sequelize the foreign key constraint may be named differently depending
// on when the previous migrations were ran https://github.com/sequelize/sequelize/pull/9890

const constraintNames = [
  "team_domains_createdById_fkey",
  "createdById_foreign_idx"
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let error;

    for (const constraintName of constraintNames) {
      try {
        await queryInterface.sequelize.query(
          `alter table "${tableName}" drop constraint "${constraintName}"`
        );
        await queryInterface.sequelize.query(`alter table "${tableName}"
            add constraint "${constraintName}" foreign key("createdById") references "users" ("id")
            on delete set null`);
        return;
      } catch (err) {
        error = err;
      }
    }

    throw error;
  },
  down: async (queryInterface, Sequelize) => {
    let error;

    for (const constraintName of constraintNames) {
      try {
        await queryInterface.sequelize.query(
          `alter table "${tableName}" drop constraint "${constraintName}"`
        );
        await queryInterface.sequelize.query(`alter table "${tableName}"\
            add constraint "${constraintName}" foreign key("createdById") references "users" ("id")
            on delete no action`);
        return;
      } catch (err) {
        error = err;
      }
    }

    throw error;
  },
};
