'use strict';

module.exports = {
	async up(queryInterface) {
		await queryInterface.removeConstraint('tags', 'tags_team_id_name_unique');

		await queryInterface.sequelize.query(
			`CREATE UNIQUE INDEX tags_team_id_name_unique ON tags ("teamId", name) WHERE "deletedAt" IS NULL`
		);
	},

	async down(queryInterface) {
		await queryInterface.sequelize.query(
			`DROP INDEX IF EXISTS tags_team_id_name_unique`
		);

		await queryInterface.addConstraint('tags', {
			fields: ['teamId', 'name'],
			type: 'unique',
			name: 'tags_team_id_name_unique',
		});
	},
};
