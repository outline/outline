"use strict";

const indexes = [
  ["documents", "createdById"],
  ["documents", "lastModifiedById"],
  ["revisions", "userId"],
  ["events", "userId"],
  ["notifications", "actorId"],
  ["notifications", "userId"],
  ["attachments", "userId"],
  ["comments", "createdById"],
  ["comments", "resolvedById"],
  ["shares", "userId"],
  ["shares", "revokedById"],
  ["reactions", "userId"],
  ["relationships", "userId"],
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const [table, column] of indexes) {
      await queryInterface.addIndex(table, [column], {
        concurrently: true,
      });
    }
  },

  async down(queryInterface) {
    for (const [table, column] of indexes.slice().reverse()) {
      await queryInterface.removeIndex(table, [column]);
    }
  },
};
