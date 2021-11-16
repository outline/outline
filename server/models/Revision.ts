// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'slat... Remove this comment to see the full error message
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
});

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'models' implicitly has an 'any' type.
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
      include: [
        {
          model: models.User,
          as: "user",
          paranoid: false,
        },
      ],
    },
    {
      override: true,
    }
  );
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'documentId' implicitly has an 'any' typ... Remove this comment to see the full error message
Revision.findLatest = function (documentId) {
  return Revision.findOne({
    where: {
      documentId,
    },
    order: [["createdAt", "DESC"]],
  });
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'document' implicitly has an 'any' type.
Revision.createFromDocument = function (document, options) {
  return Revision.create(
    {
      title: document.title,
      text: document.text,
      userId: document.lastModifiedById,
      editorVersion: document.editorVersion,
      version: document.version,
      documentId: document.id,
      // revision time is set to the last time document was touched as this
      // handler can be debounced in the case of an update
      createdAt: document.updatedAt,
    },
    options
  );
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
    this.text = serializer.serialize(nodes, {
      version: 2,
    });
    this.version = 2;
    migrated = true;
  }

  if (migrated) {
    return this.save({
      silent: true,
      hooks: false,
    });
  }
};

export default Revision;
