// @flow
import path from 'path';
import { DataTypes, sequelize } from '../sequelize';
import { deleteFromS3 } from '../utils/s3';

const Attachment = sequelize.define(
  'attachment',
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
      defaultValue: 'public-read',
      validate: {
        isIn: [['private', 'public-read']],
      },
    },
  },
  {
    getterMethods: {
      name: function() {
        return path.parse(this.key).base;
      },
      redirectUrl: function() {
        return `/api/attachments.redirect?id=${this.id}`;
      },
      isPrivate: function() {
        return this.acl === 'private';
      },
    },
  }
);

Attachment.beforeDestroy(async model => {
  await deleteFromS3(model.key);
});

Attachment.associate = models => {
  Attachment.belongsTo(models.Team);
  Attachment.belongsTo(models.Document);
  Attachment.belongsTo(models.User);
};

export default Attachment;
