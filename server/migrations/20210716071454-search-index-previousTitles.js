"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const searchDocument = `
    CREATE OR REPLACE FUNCTION documents_search_trigger() RETURNS trigger AS $$
    begin
      new."searchVector" :=
        setweight(to_tsvector('english', coalesce(new.title, '')),'A') ||
        setweight(to_tsvector('english', coalesce(array_to_string(new."previousTitles", ' , '),'')),'C') ||
        setweight(to_tsvector('english', coalesce(new.text, '')), 'B');
      return new;
    end
    $$ LANGUAGE plpgsql;
        `;
    await queryInterface.sequelize.query(searchDocument);
  },
  down: async (queryInterface, Sequelize) => {
    const searchDocument = `
    CREATE OR REPLACE FUNCTION documents_search_trigger() RETURNS trigger AS $$
    begin
      new."searchVector" :=
        setweight(to_tsvector('english', coalesce(new.title, '')),'A') ||
        setweight(to_tsvector('english', coalesce(new.text, '')), 'C');
      return new;
    end
    $$ LANGUAGE plpgsql;
        `;
    await queryInterface.sequelize.query(searchDocument);
  },
};
