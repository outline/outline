// @flow
import debug from "debug";
import mailer from "./mailer";
import { Collection, Team } from "./models";
import { archiveCollections } from "./utils/zip";
import { createQueue } from "./utils/queue";

const log = debug("logistics");
const logisticsQueue = createQueue("logistics");
const queueOptions = {
  attempts: 2,
  removeOnComplete: true,
  backoff: {
    type: "exponential",
    delay: 60 * 1000,
  },
};

async function exportAndEmailCollections(teamId: string, email: string) {
  log("Archiving team", teamId);
  const team = await Team.findByPk(teamId);
  const collections = await Collection.findAll({
    where: { teamId },
    order: [["name", "ASC"]],
  });
  const filePath = await archiveCollections(collections);

  log("Archive path", filePath);

  mailer.export({
    to: email,
    attachments: [
      {
        filename: `${team.name} Export.zip`,
        path: filePath,
      },
    ],
  });
}

logisticsQueue.process(async job => {
  log("Process", job.data);

  switch (job.data.type) {
    case "export-collections":
      return await exportAndEmailCollections(job.data.teamId, job.data.email);
    default:
  }
});

export const exportCollections = (teamId: string, email: string) => {
  logisticsQueue.add(
    {
      type: "export-collections",
      teamId,
      email,
    },
    queueOptions
  );
};
