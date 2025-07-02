import { Op, WhereOptions } from "sequelize";
import isUUID from "validator/lib/isUUID";
import { UrlHelper } from "@shared/utils/UrlHelper";
import {
  AuthenticationError,
  AuthorizationError,
  InvalidRequestError,
  NotFoundError,
} from "@server/errors";
import { Collection, Share, User } from "@server/models";
import { authorize } from "@server/policies";

type Props = {
  id: string;
  shareId?: string;
  teamId?: string;
  user?: User;
};

export async function loadCollection({
  id,
  shareId,
  teamId,
  user,
}: Props): Promise<Collection> {
  if (!shareId && !user) {
    throw AuthenticationError(`Authentication or shareId required`);
  }

  if (shareId) {
    const shareUrlId =
      !isUUID(shareId) && UrlHelper.SHARE_URL_SLUG_REGEX.test(shareId)
        ? shareId
        : undefined;

    if (shareUrlId && !teamId) {
      throw InvalidRequestError(
        "teamId required for fetching share using shareUrlId"
      );
    }

    const where: WhereOptions<Share> = {
      revokedAt: {
        [Op.is]: null,
      },
      published: true,
    };

    if (shareUrlId) {
      where.urlId = shareUrlId;
      where.teamId = teamId;
    } else {
      where.id = shareId;
    }

    const share = await Share.findOne({
      where,
      include: [
        {
          model: Collection.scope([
            "defaultScope",
            { method: ["withMembership", user?.id] },
          ]),
          as: "collection",
        },
      ],
    });

    if (!share?.team.sharing || !share.collection?.sharing) {
      throw AuthorizationError();
    }

    if (share.collection.archivedAt) {
      throw NotFoundError();
    }

    return share.collection;
  } else {
    // Validation would ensure user is available here.
    const collection = await Collection.findByPk(id, {
      userId: user!.id,
      includeArchivedBy: true,
      rejectOnEmpty: true,
    });

    authorize(user!, "read", collection);

    return collection;
  }
}
