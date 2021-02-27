'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("authentication_providers", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      serviceId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "teams"
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.createTable("user_authentication_providers", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users"
        }
      },
      authenticationProviderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "authentication_providers"
        }
      },
      serviceId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable("authentication_providers");
  }
};
