// @flow
import { DataTypes, sequelize } from '../sequelize';

const Attachment = sequelize.define('attachment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
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
});

Attachment.associate = models => {
  Attachment.belongsTo(models.Team);
  Attachment.belongsTo(models.Document);
  Attachment.belongsTo(models.User);
};

export default Attachment;
