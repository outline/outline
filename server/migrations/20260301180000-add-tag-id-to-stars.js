"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("stars", "tagId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "tags",
        key: "id",
      },
      onDelete: "CASCADE",
    });

    await queryInterface.addIndex("stars", ["tagId"], {
      name: "stars_tag_id",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex("stars", "stars_tag_id");
    await queryInterface.removeColumn("stars", "tagId");
  },
};
