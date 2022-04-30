'use strict';

module.exports = {
  up: async (queryInterface) => {
    let again = 1;
  
    while (again) {
      console.log("Backfilling collection sort…");
      const [, metadata] = await queryInterface.sequelize.query(`
WITH rows AS (
  SELECT id FROM collections WHERE "sort" IS NULL ORDER BY id LIMIT 1000
)
UPDATE collections
SET "sort" = :sort::jsonb
WHERE EXISTS (SELECT * FROM rows WHERE collections.id = rows.id)
  `, {
        replacements: {
          sort: JSON.stringify({ field: "title", direction: "asc" }),
        }
      });

      again = metadata.rowCount;
    }
  },

  down: async () => {
    // cannot be undone
  }
};
