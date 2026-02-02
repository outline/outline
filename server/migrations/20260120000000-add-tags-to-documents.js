"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn("documents", "tags", {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: false,
            defaultValue: [],
        });
        await queryInterface.addIndex("documents", ["tags"], {
            using: "gin",
            name: "documents_tags_gin",
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeIndex("documents", "documents_tags_gin");
        await queryInterface.removeColumn("documents", "tags");
    },
};
