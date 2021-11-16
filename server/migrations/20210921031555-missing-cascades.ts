module.exports = {
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  up: async (queryInterface, Sequelize) => {
    let tableName, constraintName;
    tableName = "collection_users";
    constraintName = "collection_users_collectionId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"
        add constraint "${constraintName}" foreign key("collectionId") references "collections" ("id")
        on delete cascade`);
    constraintName = "collection_users_userId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"\
        add constraint "${constraintName}" foreign key("userId") references "users" ("id")
        on delete cascade`);
    tableName = "group_users";
    constraintName = "group_users_groupId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"
        add constraint "${constraintName}" foreign key("groupId") references "groups" ("id")
        on delete cascade`);
    constraintName = "group_users_userId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"
        add constraint "${constraintName}" foreign key("userId") references "users" ("id")
        on delete cascade`);
  },
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'queryInterface' implicitly has an 'any'... Remove this comment to see the full error message
  down: async (queryInterface, Sequelize) => {
    let tableName, constraintName;
    tableName = "collection_users";
    constraintName = "collection_users_collectionId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"\
        add constraint "${constraintName}" foreign key("collectionId") references "collections" ("id")
        on delete no action`);
    constraintName = "collection_users_userId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"\
        add constraint "${constraintName}" foreign key("userId") references "users" ("id")
        on delete no action`);
    tableName = "group_users";
    constraintName = "group_users_groupId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"
        add constraint "${constraintName}" foreign key("groupId") references "groups" ("id")
        on delete no action`);
    constraintName = "group_users_userId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"
        add constraint "${constraintName}" foreign key("userId") references "users" ("id")
        on delete no action`);
  },
};
