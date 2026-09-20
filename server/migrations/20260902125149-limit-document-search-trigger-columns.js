"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'CREATE OR REPLACE TRIGGER documents_tsvectorupdate BEFORE INSERT OR UPDATE OF title, text, "previousTitles" ON documents FOR EACH ROW EXECUTE PROCEDURE documents_search_trigger();'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "CREATE OR REPLACE TRIGGER documents_tsvectorupdate BEFORE INSERT OR UPDATE ON documents FOR EACH ROW EXECUTE PROCEDURE documents_search_trigger();"
    );
  },
};
