const tableName = 'backlinks';
const constraintName = 'backlinks_reverseDocumentId_fkey';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`alter table "${tableName}" drop constraint "${constraintName}"`)
    await queryInterface.sequelize.query(
      `alter table "${tableName}"
        add constraint "${constraintName}" foreign key("reverseDocumentId") references "documents" ("id")
        on delete cascade`
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`alter table "${tableName}" drop constraint "${constraintName}"`)
    await queryInterface.sequelize.query(
      `alter table "${tableName}"\
        add constraint "${constraintName}" foreign key("reverseDocumentId") references "documents" ("id")
        on delete no action`
    );
  },
};