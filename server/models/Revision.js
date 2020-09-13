// @flow
import MarkdownSerializer from "slate-md-serializer";
import { DataTypes, sequelize } from "../sequelize";

const serializer = new MarkdownSerializer();

const Revision = sequelize.define("revision", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  version: DataTypes.SMALLINT,
  editorVersion: DataTypes.STRING,
  title: DataTypes.STRING,
  text: DataTypes.TEXT,

  // backup contains a record of text at the moment it was converted to v2
  // this is a safety measure during deployment of new editor and will be
  // dropped in a future update
  backup: DataTypes.TEXT,
});

Revision.associate = (models) => {
  Revision.belongsTo(models.Document, {
    as: "document",
    foreignKey: "documentId",
    onDelete: "cascade",
  });
  Revision.belongsTo(models.User, {
    as: "user",
    foreignKey: "userId",
  });
  Revision.addScope(
    "defaultScope",
    {
      include: [{ model: models.User, as: "user", paranoid: false }],
    },
    { override: true }
  );
};

Revision.findLatest = function (documentId) {
  return Revision.findOne({
    where: {
      documentId,
    },
    order: [["createdAt", "DESC"]],
  });
};

Revision.prototype.migrateVersion = function () {
  let migrated = false;

  // migrate from document version 0 -> 1
  if (!this.version) {
    // removing the title from the document text attribute
    this.text = this.text.replace(/^#\s(.*)\n/, "");
    this.version = 1;
    migrated = true;
  }

  // migrate from document version 1 -> 2
  if (this.version === 1) {
    const nodes = serializer.deserialize(this.text);
    this.backup = this.text;
    this.text = serializer.serialize(nodes, { version: 2 });
    this.version = 2;
    migrated = true;
  }

  if (migrated) {
    return this.save({ silent: true, hooks: false });
  }
};

export default Revision;
