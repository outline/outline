"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("document_tags", {
			id: {
				type: Sequelize.UUID,
				defaultValue: Sequelize.UUIDV4,
				primaryKey: true,
				allowNull: false,
			},
			documentId: {
				type: Sequelize.UUID,
				allowNull: false,
				references: {
					model: "documents",
					key: "id",
				},
				onDelete: "CASCADE",
			},
			tagId: {
				type: Sequelize.UUID,
				allowNull: false,
				references: {
					model: "tags",
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
			createdAt: {
				type: Sequelize.DATE,
				allowNull: false,
			},
		});

		await queryInterface.addConstraint("document_tags", {
			fields: ["documentId", "tagId"],
			type: "unique",
			name: "document_tags_document_id_tag_id_unique",
		});

		await queryInterface.addIndex("document_tags", ["tagId"], {
			name: "document_tags_tag_id",
			concurrently: true,
		});

		await queryInterface.addIndex("document_tags", ["documentId"], {
			name: "document_tags_document_id",
			concurrently: true,
		});
	},

	async down(queryInterface) {
		await queryInterface.dropTable("document_tags");
	},
};
