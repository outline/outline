module.exports = {
  up: async (queryInterface, Sequelize) => {
    // upgrade to slate-md-serializer 3.0 means that newlines saved in Markdown are now
    // accurately reflected in the editor. To prevent a change in appearance in current docs
    // we need to collapse existing multiple newlines in the db.
    const [documents, metaData] = await queryInterface.sequelize.query(
      `SELECT * FROM documents`
    );

    for (const document of documents) {
      const id = document.id;
      const fixedText = document.text.replace(/\n{2,}/gi, "\n\n");
      if (fixedText === document.text) continue;
      // raw query to avoid hooks
      await queryInterface.sequelize.query(
        `
        update documents
        set "text" = :fixedText
        where id = :id
      `,
        {
          replacements: {
            fixedText,
            id,
          },
        }
      );
    }
  },
  down: async (queryInterface, Sequelize) => {
    // cannot be reversed
  },
};
