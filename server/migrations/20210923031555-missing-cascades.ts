module.exports = {
  up: async (queryInterface, Sequelize) => {
    let tableName, constraintName;
    tableName = "user_authentications";
    constraintName = "user_authentications_authenticationProviderId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"
        add constraint "${constraintName}" foreign key("authenticationProviderId") references "authentication_providers" ("id")
        on delete cascade`);
    constraintName = "user_authentications_userId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"
        add constraint "${constraintName}" foreign key("userId") references "users" ("id")
        on delete cascade`);
  },
  down: async (queryInterface, Sequelize) => {
    let tableName, constraintName;
    tableName = "user_authentications";
    constraintName = "user_authentications_authenticationProviderId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"
        add constraint "${constraintName}" foreign key("authenticationProviderId") references "authentication_providers" ("id")
        on delete no action`);
    constraintName = "user_authentications_userId_fkey";
    await queryInterface.sequelize.query(
      `alter table "${tableName}" drop constraint "${constraintName}"`
    );
    await queryInterface.sequelize.query(`alter table "${tableName}"
        add constraint "${constraintName}" foreign key("userId") references "users" ("id")
        on delete no action`);
  },
};
