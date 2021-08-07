// @flow
import fs from "fs";
import debug from "debug";
import { v4 as uuidv4 } from "uuid";
import mailer from "./mailer";
import { Export, Collection, Team, Event } from "./models";

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

async function eventCreate(teamId, userId, exportData) {
  await Event.create({
    name: "collections.export_all",
    teamId: teamId,
    actorId: userId,
    data: {
      id: exportData.id,
      state: exportData.state,
      key: exportData.key,
      url: exportData.url,
      size: exportData.size,
      createdAt: exportData.createdAt,
    },
  });
}

async function exportAndEmailCollections(
  teamId: string,
  userId: string,
  email: string
) {
  log("Archiving team", teamId);
  const { archiveCollections } = require("./utils/zip");
  const team = await Team.findByPk(teamId);
  const collections = await Collection.findAll({
    where: { teamId },
    order: [["name", "ASC"]],
  });

  const acl = process.env.AWS_S3_ACL || "private";
  const bucket = acl === "public-read" ? "public" : "uploads";
  const key = `${bucket}/${teamId}/${uuidv4()}/${team.name}-export.zip`;
  let state = "creating";

  let exportData = await Export.create({
    state,
    key,
    url: null,
    size: 0,
    userId,
    teamId,
  });

  await eventCreate(teamId, userId, exportData);

  const filePath = await archiveCollections(collections);

  log("Archive path", filePath);

  const readBuffer = await fs.promises.readFile(filePath);
  let url;
  try {
    state = "uploading";
    exportData.state = state;
    const stat = await fs.promises.stat(filePath);
    exportData.size = stat.size;

    await exportData.save();
    await eventCreate(teamId, userId, exportData);

    url = await uploadToS3FromBuffer(readBuffer, "application/zip", key, acl);

    state = "complete";
  } catch (e) {
    log("Failed to export data", e);
    state = "error";
  } finally {
    exportData.state = state;
    exportData.url = url;
    await exportData.save();

    await eventCreate(teamId, userId, exportData);

    mailer.export({
      to: email,
      id: exportData.id,
      state,
    });
  }
}

exporterQueue.process(async (job) => {
  log("Process", job.data);

  switch (job.data.type) {
    case "export-collections":
      return await exportAndEmailCollections(
        job.data.teamId,
        job.data.userId,
        job.data.email
      );
    default:
  }
});

export const exportCollections = (
  teamId: string,
  userId: string,
  email: string
) => {
  exporterQueue.add(
    {
      type: "export-collections",
      teamId,
      userId,
      email,
    },
    queueOptions
  );
};
