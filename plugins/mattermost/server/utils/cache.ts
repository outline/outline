import { Minute } from "@shared/utils/time";
import { CacheHelper } from "@server/utils/CacheHelper";
import { Channel } from "../../shared/types";

const CacheExpiry = (30 * Minute) / 1000;

const cacheKey = ({ teamId, userId }: { teamId: string; userId: string }) =>
  `mm_channels:${teamId}:${userId}`;

export const loadChannelsFromCache = async ({
  teamId,
  userId,
}: {
  teamId: string;
  userId: string;
}): Promise<Channel[] | undefined> =>
  CacheHelper.getData<Channel[]>(cacheKey({ teamId, userId }));

export const storeChannelsInCache = async ({
  teamId,
  userId,
  channels,
}: {
  teamId: string;
  userId: string;
  channels: Channel[];
}) => {
  await CacheHelper.setData(
    cacheKey({ teamId, userId }),
    channels,
    CacheExpiry
  );
};
