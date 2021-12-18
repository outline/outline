import { subMilliseconds } from "date-fns";
import { USER_PRESENCE_INTERVAL } from "@shared/constants";
import { User } from "@server/models";
import { DataTypes, Op, sequelize } from "../sequelize";

const View = sequelize.define("view", {
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
});

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'models' implicitly has an 'any' type.
View.associate = (models) => {
  View.belongsTo(models.Document);
  View.belongsTo(models.User);
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'where' implicitly has an 'any' type.
View.increment = async (where) => {
  const [model, created] = await View.findOrCreate({
    where,
  });

  if (!created) {
    model.count += 1;
    model.save();
  }

  return model;
};

View.findByDocument = async (documentId: string) => {
  return View.findAll({
    where: {
      documentId,
    },
    order: [["updatedAt", "DESC"]],
    include: [
      {
        model: User,
        paranoid: false,
      },
    ],
  });
};

View.findRecentlyEditingByDocument = async (documentId: string) => {
  return View.findAll({
    where: {
      documentId,
      lastEditingAt: {
        [Op.gt]: subMilliseconds(new Date(), USER_PRESENCE_INTERVAL * 2),
      },
    },
    order: [["lastEditingAt", "DESC"]],
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
