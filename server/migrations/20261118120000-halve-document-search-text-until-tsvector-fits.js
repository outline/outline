"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
    CREATE OR REPLACE FUNCTION documents_search_trigger() RETURNS trigger AS $$
    declare
      "textLength" integer := 1000000;
    begin
      loop
        begin
          new."searchVector" :=
            setweight(to_tsvector('english', coalesce(new.title, '')),'A') ||
            setweight(to_tsvector('english', coalesce(array_to_string(new."previousTitles", ' , '),'')),'C') ||
            setweight(to_tsvector('english', substring(coalesce(new.text, ''), 1, "textLength")), 'D');
          return new;
        exception when program_limit_exceeded then
          if "textLength" = 0 then
            raise;
          end if;

          -- The tsvector limit is on the output size, so index a shorter prefix.
          "textLength" := "textLength" / 2;
        end;
      end loop;
    end
    $$ LANGUAGE plpgsql;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
    CREATE OR REPLACE FUNCTION documents_search_trigger() RETURNS trigger AS $$
    begin
      begin
        new."searchVector" :=
          setweight(to_tsvector('english', coalesce(new.title, '')),'A') ||
          setweight(to_tsvector('english', coalesce(array_to_string(new."previousTitles", ' , '),'')),'C') ||
          setweight(to_tsvector('english', substring(coalesce(new.text, ''), 1, 1000000)), 'D');
      exception when program_limit_exceeded then
        -- The tsvector limit is on the output size, so text made of mostly
        -- unique tokens can overflow it. Index a shorter prefix instead.
        new."searchVector" :=
          setweight(to_tsvector('english', coalesce(new.title, '')),'A') ||
          setweight(to_tsvector('english', coalesce(array_to_string(new."previousTitles", ' , '),'')),'C') ||
          setweight(to_tsvector('english', substring(coalesce(new.text, ''), 1, 500000)), 'D');
      end;
      return new;
    end
    $$ LANGUAGE plpgsql;
    `);
  },
};
