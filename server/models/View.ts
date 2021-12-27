import { subMilliseconds } from "date-fns";
import { FindOptions, Op } from "sequelize";
import {
  BelongsTo,
  Column,
  Default,
  ForeignKey,
  Table,
  DataType,
} from "sequelize-typescript";
import { USER_PRESENCE_INTERVAL } from "@shared/constants";
import Document from "./Document";
import User from "./User";
import BaseModel from "./base/BaseModel";

@Table({ tableName: "views", modelName: "view" })
class View extends BaseModel {
  @Column
  lastEditingAt: Date | null;

  @Default(1)
  @Column(DataType.INTEGER)
  count: number;

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  static incrementOrCreate = async (where: {
    userId?: string;
    documentId?: string;
    collectionId?: string;
  }) => {
    const [model, created] = await View.findOrCreate({
      where,
    });

    if (!created) {
      model.count += 1;
      model.save();
    }

    return model;
  };

  static findByDocument = async (documentId: string) => {
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

  static findRecentlyEditingByDocument = async (documentId: string) => {
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

  static touch = async (
    documentId: string,
    userId: string,
    isEditing: boolean
  ) => {
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
}

export default View;
