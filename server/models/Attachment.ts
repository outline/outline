import path from "path";
import { DataTypes, sequelize } from "../sequelize";
import { deleteFromS3, getFileByKey } from "../utils/s3";

const Attachment = sequelize.define(
  "attachment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contentType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    acl: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "public-read",
      validate: {
        isIn: [["private", "public-read"]],
      },
    },
  },
  {
    getterMethods: {
      name: function () {
        return path.parse(this.key).base;
      },
      redirectUrl: function () {
        return `/api/attachments.redirect?id=${this.id}`;
      },
      isPrivate: function () {
        return this.acl === "private";
      },
      buffer: function () {
        return getFileByKey(this.key);
      },
    },
  }
);

Attachment.findAllInBatches = async (
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'query' implicitly has an 'any' type.
  query,
  callback: (
    // @ts-expect-error ts-migrate(2749) FIXME: 'Attachment' refers to a value, but is being used ... Remove this comment to see the full error message
    attachments: Array<Attachment>,
    query: Record<string, any>
  ) => Promise<void>
) => {
  if (!query.offset) query.offset = 0;
  if (!query.limit) query.limit = 10;
  let results;

  do {
    results = await Attachment.findAll(query);
    await callback(results, query);
    query.offset += query.limit;
  } while (results.length >= query.limit);
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'model' implicitly has an 'any' type.
Attachment.beforeDestroy(async (model) => {
  await deleteFromS3(model.key);
});

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'models' implicitly has an 'any' type.
Attachment.associate = (models) => {
  Attachment.belongsTo(models.Team);
  Attachment.belongsTo(models.Document);
  Attachment.belongsTo(models.User);
};

export default Attachment;
