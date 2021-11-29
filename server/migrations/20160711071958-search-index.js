module.exports = {
  up: async (queryInterface, Sequelize) => {
    const searchDocument = `
ALTER TABLE documents ADD COLUMN "searchVector" tsvector;
CREATE INDEX documents_tsv_idx ON documents USING gin("searchVector");

CREATE FUNCTION documents_search_trigger() RETURNS trigger AS $$
begin
  new."searchVector" :=
    setweight(to_tsvector('english', coalesce(new.title, '')),'A') ||
    setweight(to_tsvector('english', coalesce(new.text, '')), 'C');
  return new;
end
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_tsvectorupdate BEFORE INSERT OR UPDATE
ON documents FOR EACH ROW EXECUTE PROCEDURE documents_search_trigger();
    `;
    const searchCollection = `
ALTER TABLE atlases ADD COLUMN "searchVector" tsvector;
CREATE INDEX atlases_tsv_idx ON atlases USING gin("searchVector");

CREATE FUNCTION atlases_search_trigger() RETURNS trigger AS $$
begin
  new."searchVector" :=
    setweight(to_tsvector('english', coalesce(new.name, '')),'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C');
  return new;
end
$$ LANGUAGE plpgsql;

CREATE TRIGGER atlases_tsvectorupdate BEFORE INSERT OR UPDATE
ON atlases FOR EACH ROW EXECUTE PROCEDURE atlases_search_trigger();
    `;
    await queryInterface.sequelize.query(searchDocument);
    await queryInterface.sequelize.query(searchCollection);
  },
  down: async (queryInterface, Sequelize) => {
    // TODO?
  },
};
