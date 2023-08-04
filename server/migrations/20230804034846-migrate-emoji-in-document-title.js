"use strict";

const path = require("path");

module.exports = {
  async up(queryInterface, Sequelize) {
    if (process.env.DEPLOYMENT === "hosted") {
      return;
    }

    if (process.env.NODE_ENV === "test") {
      return;
    }

    const rootDir = "build";

    const { Document } = require(path.join(
      process.cwd(),
      rootDir,
      "server/models"
    ));
    const { default: parseTitle } = require(path.join(
      process.cwd(),
      rootDir,
      "shared/utils/parseTitle"
    ));

    await Document.scope(["withoutState", "withDrafts"]).findAllInBatches(
      {
        limit: 100,
        offset: 0,
        order: [["createdAt", "ASC"]],
        paranoid: false,
      },
      async (documents) => {
        for (const document of documents) {
          try {
            const { emoji, strippedTitle } = parseTitle(document.title);
            if (emoji) {
              document.emoji = emoji;
              document.title = strippedTitle;
              await queryInterface.sequelize.transaction(async (transaction) =>
                document.save({
                  silent: true,
                  transaction,
                })
              );
            }
          } catch (err) {
            console.error(`Failed at ${document.id}:`, err);
            continue;
          }
        }
      }
    );
  },

  async down(queryInterface, Sequelize) {
    // noop
  },
};
