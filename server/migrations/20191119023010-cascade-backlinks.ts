// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'tableName'... Remove this comment to see the full error message
const tableName = "backlinks";
// because of this issue in Sequelize the foreign key constraint may be named differently depending
// on when the previous migrations were ran https://github.com/sequelize/sequelize/pull/9890
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'constraint... Remove this comment to see the full error message
const constraintNames = [
  "backlinks_reverseDocumentId_fkey",
  "reverseDocumentId_foreign_idx",
];
module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    let error;

    for (const constraintName of constraintNames) {
      try {
        await queryInterface.sequelize.query(
          `alter table "${tableName}" drop constraint "${constraintName}"`
        );
        await queryInterface.sequelize.query(`alter table "${tableName}"
            add constraint "${constraintName}" foreign key("reverseDocumentId") references "documents" ("id")
            on delete cascade`);
        return;
      } catch (err) {
        error = err;
      }
    }

    throw error;
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    let error;

    for (const constraintName of constraintNames) {
      try {
        await queryInterface.sequelize.query(
          `alter table "${tableName}" drop constraint "${constraintName}"`
        );
        await queryInterface.sequelize.query(`alter table "${tableName}"\
            add constraint "${constraintName}" foreign key("reverseDocumentId") references "documents" ("id")
            on delete no action`);
        return;
      } catch (err) {
        error = err;
      }
    }

    throw error;
  },
};
