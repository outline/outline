'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_passkeys', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      credentialId: {
        type: Sequelize.TEXT,
        allowNull: false,
        unique: true,
      },
      credentialPublicKey: {
        type: Sequelize.BLOB,
        allowNull: false,
      },
      counter: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
      },
      transports: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('user_passkeys', ['userId']);
    await queryInterface.addIndex('user_passkeys', ['credentialId'], {
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_passkeys');
  },
};
