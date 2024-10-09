import compact from "lodash/compact";
import difference from "lodash/difference";
import uniq from "lodash/uniq";
import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  DataType,
  BelongsTo,
  ForeignKey,
  Column,
  Table,
  Scopes,
} from "sequelize-typescript";
import Document from "./Document";
import Group from "./Group";
import GroupMembership from "./GroupMembership";
import GroupUser from "./GroupUser";
import User from "./User";
import UserMembership from "./UserMembership";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Scopes(() => ({
  withSourceDocument: {
    include: [
      {
        model: Document,
        as: "reverseDocument",
      },
    ],
  },
}))
@Table({ tableName: "backlinks", modelName: "backlink" })
@Fix
class Backlink extends IdModel<
  InferAttributes<Backlink>,
  Partial<InferCreationAttributes<Backlink>>
> {
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

  @BelongsTo(() => Document, "reverseDocumentId")
  reverseDocument: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  reverseDocumentId: string;

  public static async findSourceDocumentIdsForUser(
    documentId: string,
    user: User
  ) {
    const backlinks = await this.scope("withSourceDocument").findAll({
      attributes: ["reverseDocumentId"],
      where: {
        documentId,
      },
    });
    const collectionIds = await user.collectionIds();

    const sourceDocumentIds = backlinks
      .filter((backlink) =>
        collectionIds.includes(backlink.reverseDocument.collectionId ?? "")
      )
      .map((backlink) => backlink.reverseDocumentId);

    const remainingSourceDocumentIds = difference(
      backlinks.map((backlink) => backlink.reverseDocumentId),
      sourceDocumentIds
    );

    if (remainingSourceDocumentIds.length) {
      const [userMemberships, groupMemberships] = await Promise.all([
        UserMembership.findAll({
          where: {
            documentId: remainingSourceDocumentIds,
          },
        }),
        GroupMembership.findAll({
          where: {
            documentId: remainingSourceDocumentIds,
          },
          include: [
            {
              model: Group,
              required: true,
              include: [
                {
                  model: GroupUser,
                  required: true,
                  where: {
                    userId: user.id,
                  },
                },
              ],
            },
          ],
        }),
      ]);

      sourceDocumentIds.push(
        ...compact(userMemberships.map((m) => m.documentId)),
        ...compact(groupMemberships.map((m) => m.documentId))
      );
    }

    return uniq(sourceDocumentIds);
  }
}

export default Backlink;
