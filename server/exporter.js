// @flow
import fs from "fs";
import debug from "debug";
import mailer from "./mailer";
import { FileOperation, Collection, Team, Event, User } from "./models";
import { createQueue } from "./utils/queue";
import { uploadToS3FromBuffer } from "./utils/s3";

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
  fileOperationId: string,
  collectionId?: string,
|};

// TODO: Refactor to use commmand pattern
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
    const collectionIds = await user.collectionIds();

    collections = await Promise.all(
      collectionIds.map(
        async (collectionId) => await Collection.findByPk(collectionId)
      )
    );
  } else {
    collections = [await Collection.findByPk(collectionId)];
  }

  let exportData;
  let state;
  let key;

  exportData = await FileOperation.findByPk(fileOperationId);
  state = exportData.state;
  key = exportData.key;
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

    url = await uploadToS3FromBuffer(
      readBuffer,
      "application/zip",
      key,
      "private"
    );

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
        teamUrl: team.url,
      });
    } else {
      mailer.exportSuccess({
        to: email,
        id: exportData.id,
        teamUrl: team.url,
      });
    }
  }
}

exporterQueue.process(async function exportProcessor(job) {
  log("Process", job.data);

  switch (job.data.type) {
    case "export-collections":
      const { teamId, userId, email, collectionId, fileOperationId } = job.data;
      return await exportAndEmailCollections({
        teamId,
        userId,
        email,
        fileOperationId,
        collectionId,
      });
    default:
  }
});

export const exportCollections = (
  teamId: string,
  userId: string,
  email: string,
  fileOperationId: string,
  collectionId?: string
) => {
  exporterQueue.add(
    {
      type: "export-collections",
      teamId,
      userId,
      email,
      fileOperationId,
      collectionId,
    },
    queueOptions
  );
};
