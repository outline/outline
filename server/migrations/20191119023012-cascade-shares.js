const tableName = 'shares';
const constraintName = 'shares_documentId_fkey';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`alter table "${tableName}" drop constraint "${constraintName}"`)
    await queryInterface.sequelize.query(
      `alter table "${tableName}"
        add constraint "${constraintName}" foreign key("documentId") references "documents" ("id")
        on delete cascade`
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`alter table "${tableName}" drop constraint "${constraintName}"`)
    await queryInterface.sequelize.query(
      `alter table "${tableName}"\
        add constraint "${constraintName}" foreign key("documentId") references "documents" ("id")
        on delete no action`
    );
  },
};