module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("teams", {
      id: {
        type: "UUID",
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: "CHARACTER VARYING",
        allowNull: true,
      },
      slackId: {
        type: "CHARACTER VARYING",
        allowNull: true,
        unique: true,
      },
      slackData: {
        type: "JSONB",
        allowNull: true,
      },
      createdAt: {
        type: "TIMESTAMP WITH TIME ZONE",
        allowNull: false,
      },
      updatedAt: {
        type: "TIMESTAMP WITH TIME ZONE",
        allowNull: false,
      },
    });
    await queryInterface.createTable("atlases", {
      id: {
        type: "UUID",
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: "CHARACTER VARYING",
        allowNull: true,
      },
      description: {
        type: "CHARACTER VARYING",
        allowNull: true,
      },
      type: {
        type: "CHARACTER VARYING",
        allowNull: true,
      },
      navigationTree: {
        type: "JSONB",
        allowNull: true,
      },
      createdAt: {
        type: "TIMESTAMP WITH TIME ZONE",
        allowNull: false,
      },
      updatedAt: {
        type: "TIMESTAMP WITH TIME ZONE",
        allowNull: false,
      },
      teamId: {
        type: "UUID",
        allowNull: false,
      },
    });
    await queryInterface.createTable("users", {
      id: {
        type: "UUID",
        allowNull: false,
        primaryKey: true,
      },
      email: {
        type: "CHARACTER VARYING",
        allowNull: false,
      },
      username: {
        type: "CHARACTER VARYING",
        allowNull: false,
      },
      name: {
        type: "CHARACTER VARYING",
        allowNull: false,
      },
      isAdmin: {
        type: "BOOLEAN",
        allowNull: true,
        defaultValue: false,
      },
      slackAccessToken: {
        type: "bytea",
        allowNull: true,
      },
      slackId: {
        type: "CHARACTER VARYING",
        unique: true,
        allowNull: false,
      },
      slackData: {
        type: "JSONB",
        allowNull: true,
      },
      jwtSecret: {
        type: "bytea",
        allowNull: true,
      },
      createdAt: {
        type: "TIMESTAMP WITH TIME ZONE",
        allowNull: false,
      },
      updatedAt: {
        type: "TIMESTAMP WITH TIME ZONE",
        allowNull: false,
      },
      teamId: {
        type: "UUID",
        allowNull: true,
      },
    });
    await queryInterface.createTable("documents", {
      id: {
        type: "UUID",
        allowNull: false,
        primaryKey: true,
      },
      urlId: {
        type: "CHARACTER VARYING",
        allowNull: false,
        unique: true,
      },
      private: {
        type: "BOOLEAN",
        allowNull: false,
        defaultValue: true,
      },
      title: {
        type: "CHARACTER VARYING",
        allowNull: false,
      },
      text: {
        type: "TEXT",
        allowNull: true,
      },
      html: {
        type: "TEXT",
        allowNull: true,
      },
      preview: {
        type: "TEXT",
        allowNull: true,
      },
      createdAt: {
        type: "TIMESTAMP WITH TIME ZONE",
        allowNull: false,
      },
      updatedAt: {
        type: "TIMESTAMP WITH TIME ZONE",
        allowNull: false,
      },
      userId: {
        type: "UUID",
        allowNull: true,
      },
      atlasId: {
        type: "UUID",
        allowNull: true,
      },
      teamId: {
        type: "UUID",
        allowNull: true,
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropAllTables();
  },
};
