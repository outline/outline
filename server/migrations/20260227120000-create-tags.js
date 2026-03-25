"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("tags", {
			id: {
				type: Sequelize.UUID,
				defaultValue: Sequelize.UUIDV4,
				primaryKey: true,
				allowNull: false,
			},
			teamId: {
				type: Sequelize.UUID,
				allowNull: false,
				references: {
					model: "teams",
					key: "id",
				},
				onDelete: "CASCADE",
			},
			createdById: {
				type: Sequelize.UUID,
				allowNull: true,
				references: {
					model: "users",
					key: "id",
				},
				onDelete: "SET NULL",
			},
			name: {
				type: Sequelize.STRING(64),
				allowNull: false,
			},
			createdAt: {
				type: Sequelize.DATE,
				allowNull: false,
			},
			updatedAt: {
				type: Sequelize.DATE,
				allowNull: false,
			},
			deletedAt: {
				type: Sequelize.DATE,
				allowNull: true,
			},
		});

		await queryInterface.addConstraint("tags", {
			fields: ["teamId", "name"],
			type: "unique",
			name: "tags_team_id_name_unique",
		});

		await queryInterface.addIndex("tags", ["teamId"], {
			name: "tags_team_id",
			where: { deletedAt: null },
			concurrently: true,
		});

		await queryInterface.addIndex("tags", ["teamId", "name"], {
			name: "tags_team_id_name",
			where: { deletedAt: null },
			concurrently: true,
		});
	},

	async down(queryInterface) {
		await queryInterface.dropTable("tags");
	},
};
