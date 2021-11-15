module.exports = {
  up: async (queryInterface, Sequelize) => {
    let tableName, constraintName;
    tableName = "collection_groups";
    constraintName = "collection_groups_collectionId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"
        add constraint "${constraintName}" foreign key("collectionId") references "collections" ("id")
        on delete cascade`);
    constraintName = "collection_groups_groupId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"
        add constraint "${constraintName}" foreign key("groupId") references "groups" ("id")
        on delete cascade`);
  },
  down: async (queryInterface, Sequelize) => {
    let tableName, constraintName;
    tableName = "collection_groups";
    constraintName = "collection_groups_collectionId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"
        add constraint "${constraintName}" foreign key("collectionId") references "collections" ("id")
        on delete no action`);
    constraintName = "collection_groups_groupId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"
        add constraint "${constraintName}" foreign key("groupId") references "groups" ("id")
        on delete no action`);
  },
};
