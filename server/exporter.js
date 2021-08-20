// @flow
import fs from "fs";
import debug from "debug";
import mailer from "./mailer";
import { FileOperation, Collection, Team, Event, User } from "./models";
import policy from "./policies";
import { createQueue } from "./utils/queue";
import { getAWSKeyForFileOp, uploadToS3FromBuffer } from "./utils/s3";
const { can } = policy;

const log = debug("exporter");
const exporterQueue = createQueue("exporter");
const queueOptions = {
  attempts: 2,
  removeOnComplete: true,
  backoff: {
    type: "exponential",
    delay: 60 * 1000,
  },
};

async function fileOperationsUpdate(teamId, userId, exportData) {
  await Event.add({
    name: "fileOperations.update",
    teamId: teamId,
    actorId: userId,
    data: {
      type: exportData.type,
      id: exportData.id,
      state: exportData.state,
      size: exportData.size,
      collectionId: exportData.collectionId,
      createdAt: exportData.createdAt,
    },
  });
}

type exportAndEmailCollectionsType = {|
  teamId: string,
  userId: string,
  email: string,
  collectionId?: string,
  fileOperationId?: string,
|};

async function exportAndEmailCollections({
  teamId,
  userId,
  email,
  collectionId,
  fileOperationId,
}: exportAndEmailCollectionsType) {
  log("Archiving team", teamId);
  const { archiveCollections } = require("./utils/zip");
  const team = await Team.findByPk(teamId);
  const user = await User.findByPk(userId);

  let collections;
  if (!collectionId) {
    collections = await Collection.scope({
      method: ["withMembership", userId],
    }).findAll({
      where: { teamId },
      order: [["name", "ASC"]],
    });

    collections = collections.reduce((agg, collection) => {
      if (can(user, "read", collection)) {
        return [...agg, collection];
      }
      return agg;
    }, []);
  } else {
    collections = [await Collection.findByPk(collectionId)];
  }

  const acl = process.env.AWS_S3_ACL || "private";

  let exportData;
  let state;
  let key;

  if (fileOperationId) {
    exportData = await FileOperation.findByPk(fileOperationId);
    state = exportData.state;
    key = exportData.key;
  } else {
    const name = collectionId ? collections[0].name : team.name;
    key = getAWSKeyForFileOp(team.id, name, acl);
    state = "creating";
    exportData = await FileOperation.create({
      type: "export",
      state,
      key,
      url: null,
      size: 0,
      collectionId: collectionId ?? null,
      userId,
      teamId,
    });
  }

  await fileOperationsUpdate(teamId, userId, exportData);

  const filePath = await archiveCollections(collections);

  log("Archive path", filePath);

  let url;
  try {
    const readBuffer = await fs.promises.readFile(filePath);
    state = "uploading";
    exportData.state = state;
    const stat = await fs.promises.stat(filePath);
    exportData.size = stat.size;

    await exportData.save();
    await fileOperationsUpdate(teamId, userId, exportData);

    url = await uploadToS3FromBuffer(readBuffer, "application/zip", key, acl);

    state = "complete";
  } catch (e) {
    log("Failed to export data", e);
    state = "error";
    url = null;
  } finally {
    exportData.state = state;
    exportData.url = url;
    await exportData.save();

    await fileOperationsUpdate(teamId, userId, exportData);

    if (collectionId) {
      await Event.create({
        name: "collections.export",
        collectionId,
        teamId: teamId,
        actorId: userId,
        data: { name: collections[0].name, exportId: exportData.id },
      });
    } else {
      const collectionsExported = collections.map((c) => ({
        name: c.name,
        id: c.id,
      }));

      await Event.create({
        name: "collections.export_all",
        teamId: teamId,
        actorId: userId,
        data: {
          exportId: exportData.id,
          collections: collectionsExported,
        },
      });
    }

    if (state === "error") {
      mailer.exportFailure({
        to: email,
      });
    } else {
      mailer.exportSuccess({
        to: email,
        id: exportData.id,
      });
    }
  }
}

exporterQueue.process(async (job) => {
  log("Process", job.data);

  switch (job.data.type) {
    case "export-collections":
      const { teamId, userId, email, collectionId, fileOperationId } = job.data;
      return await exportAndEmailCollections({
        teamId,
        userId,
        email,
        collectionId,
        fileOperationId,
      });
    default:
  }
});

export const exportCollections = (
  teamId: string,
  userId: string,
  email: string,
  collectionId?: string,
  fileOperationId?: string
) => {
  exporterQueue.add(
    {
      type: "export-collections",
      teamId,
      userId,
      email,
      collectionId,
      fileOperationId,
    },
    queueOptions
  );
};
