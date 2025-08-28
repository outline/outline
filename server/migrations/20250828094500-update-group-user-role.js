"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add the role column
    await queryInterface.addColumn("group_users", "role", {
      type: Sequelize.ENUM("admin", "member"),
      allowNull: true,
    });

    // Update existing records: set role to 'admin' where isAdmin is true, otherwise 'member'
    await queryInterface.sequelize.query(`
      UPDATE group_users 
      SET role = CASE 
        WHEN "isAdmin" = true THEN 'admin'
        ELSE 'member'
      END
    `);

    // Make the role column non-nullable after data migration
    await queryInterface.changeColumn("group_users", "role", {
      type: Sequelize.ENUM("admin", "member"),
      allowNull: false,
      defaultValue: "member",
    });

    // Remove the isAdmin column
    await queryInterface.removeColumn("group_users", "isAdmin");
  },

  async down(queryInterface, Sequelize) {
    // Add back the isAdmin column
    await queryInterface.addColumn("group_users", "isAdmin", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Update isAdmin based on role
    await queryInterface.sequelize.query(`
      UPDATE group_users 
      SET "isAdmin" = (role = 'admin')
    `);

    // Remove the role column
    await queryInterface.removeColumn("group_users", "role");

    // Remove the enum type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_group_users_role"
    `);
  },
};
