import { Op } from "sequelize";
import { Collection, Document } from "@server/models";
import { APIContext } from "@server/types";

type Props = {
  /** The collection to delete */
  collection: Collection;
};

export default async function collectionDestroyer(
  ctx: APIContext,
  { collection }: Props
) {
  await Document.update(
    {
      lastModifiedById: ctx.context.auth.user.id,
      deletedAt: new Date(),
    },
    {
      transaction: ctx.context.transaction,
      where: {
        teamId: collection.teamId,
        collectionId: collection.id,
        archivedAt: {
          [Op.is]: null,
        },
      },
    }
  );

  await collection.destroyWithCtx(ctx, { data: { name: collection.name } });
}
