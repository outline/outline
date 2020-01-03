// @flow
import subMilliseconds from 'date-fns/sub_milliseconds';
import { Op, DataTypes, sequelize } from '../sequelize';
import { User } from '../models';
import { USER_PRESENCE_INTERVAL } from '../../shared/constants';

const View = sequelize.define(
  'view',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    lastEditingAt: {
      type: DataTypes.DATE,
    },
    count: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
  },
  {
    classMethods: {},
  }
);

View.associate = models => {
  View.belongsTo(models.Document);
  View.belongsTo(models.User);
};

View.increment = async where => {
  const [model, created] = await View.findOrCreate({ where });
  if (!created) {
    model.count += 1;
    model.save();
  }
  return model;
};

View.findByDocument = async documentId => {
  return View.findAll({
    where: { documentId },
    order: [['updatedAt', 'DESC']],
    include: [
      {
        model: User,
        paranoid: false,
      },
    ],
  });
};

View.findRecentlyEditingByDocument = async documentId => {
  return View.findAll({
    where: {
      documentId,
      lastEditingAt: {
        [Op.gt]: subMilliseconds(new Date(), USER_PRESENCE_INTERVAL * 2),
      },
    },
    order: [['lastEditingAt', 'DESC']],
  });
};

View.touch = async (documentId: string, userId: string, isEditing: boolean) => {
  const [view] = await View.findOrCreate({
    where: {
      userId,
      documentId,
    },
  });

  if (isEditing) {
    const lastEditingAt = new Date();
    view.lastEditingAt = lastEditingAt;
    await view.save();
  }

  return view;
};

export default View;
