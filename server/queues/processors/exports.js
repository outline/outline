// @flow
import fs from "fs";
import debug from "debug";
import mailer from "../../mailer";
import { FileOperation, Collection, Event, Team, User } from "../../models";
import type { Event as TEvent } from "../../types";
import { uploadToS3FromBuffer } from "../../utils/s3";
import { archiveCollections } from "../../utils/zip";

const log = debug("commands");

export default class ExportsProcessor {
  async on(event: TEvent) {
    switch (event.name) {
      case "collections.export":
      case "collections.export_all":
        const { actorId, teamId } = event;
        const team = await Team.findByPk(teamId);
        const user = await User.findByPk(actorId);
        let exportData = await FileOperation.findByPk(event.modelId);

        const collectionIds =
          event.collectionId || (await user.collectionIds());
        const collections = await Collection.where({
          collectionId: collectionIds,
        });

        // heavy lifting of creating the zip file
        log(`Archiving collections for file operation ${exportData.id}`);
        const filePath = await archiveCollections(collections);

        let url, state;
        try {
          const readBuffer = await fs.promises.readFile(filePath);
          const stat = await fs.promises.stat(filePath);

          await exportData.update({
            state: "uploading",
            size: stat.size,
          });

          await Event.add({
            name: "fileOperations.update",
            teamId,
            actorId,
            data: exportData.dataValues,
          });

          log(`Uploading archive for file operation ${exportData.id}`);
          url = await uploadToS3FromBuffer(
            readBuffer,
            "application/zip",
            exportData.key,
            "private"
          );

          log(`Upload complete for file operation ${exportData.id}`);
          state = "complete";
        } catch (e) {
          log("Failed to export data", e);
          state = "error";
          url = null;
        } finally {
          await exportData.update({
            state,
            url,
          });

          await Event.add({
            name: "fileOperations.update",
            teamId,
            actorId,
            data: exportData.dataValues,
          });

          if (state === "error") {
            mailer.exportFailure({
              to: user.email,
              teamUrl: team.url,
            });
          } else {
            mailer.exportSuccess({
              to: user.email,
              id: exportData.id,
              teamUrl: team.url,
            });
          }
        }
        break;
      default:
    }
  }
}
