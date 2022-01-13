import fs from "fs";
import invariant from "invariant";
import Logger from "@server/logging/logger";
import mailer from "@server/mailer";
import { FileOperation, Collection, Event, Team, User } from "@server/models";
import { Event as TEvent } from "@server/types";
import { uploadToS3FromBuffer } from "@server/utils/s3";
import { archiveCollections } from "@server/utils/zip";

export default class ExportsProcessor {
  async on(event: TEvent) {
    switch (event.name) {
      case "collections.export":
      case "collections.export_all": {
        const { actorId, teamId } = event;
        const team = await Team.findByPk(teamId);
        invariant(team, "team operation not found");

        const user = await User.findByPk(actorId);
        invariant(user, "user operation not found");

        const exportData = await FileOperation.findByPk(event.modelId);
        invariant(exportData, "exportData not found");

        const collectionIds =
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'collectionId' does not exist on type 'Co... Remove this comment to see the full error message
          event.collectionId || (await user.collectionIds());
        const collections = await Collection.findAll({
          where: {
            id: collectionIds,
          },
        });
        this.updateFileOperation(exportData, actorId, teamId, {
          state: "creating",
        });
        // heavy lifting of creating the zip file
        Logger.info(
          "processor",
          `Archiving collections for file operation ${exportData.id}`
        );
        const filePath = await archiveCollections(collections);
        let url, state;

        try {
          // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
          const readBuffer = await fs.promises.readFile(filePath);
          // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
          const stat = await fs.promises.stat(filePath);
          this.updateFileOperation(exportData, actorId, teamId, {
            state: "uploading",
            size: stat.size,
          });
          Logger.info(
            "processor",
            `Uploading archive for file operation ${exportData.id}`
          );
          url = await uploadToS3FromBuffer(
            readBuffer,
            "application/zip",
            exportData.key,
            "private"
          );
          Logger.info(
            "processor",
            `Upload complete for file operation ${exportData.id}`
          );
          state = "complete";
        } catch (error) {
          Logger.error("Error exporting collection data", error, {
            fileOperationId: exportData.id,
          });
          state = "error";
          url = null;
        } finally {
          this.updateFileOperation(exportData, actorId, teamId, {
            state,
            url,
          });

          if (state === "error") {
            mailer.sendTemplate("exportFailure", {
              to: user.email,
              teamUrl: team.url,
            });
          } else {
            mailer.sendTemplate("exportSuccess", {
              to: user.email,
              id: exportData.id,
              teamUrl: team.url,
            });
          }
        }

        break;
      }
      default:
    }
  }

  async updateFileOperation(
    fileOperation: FileOperation,
    actorId: string,
    teamId: string,
    data: Record<string, any>
  ) {
    await fileOperation.update(data);
    await Event.add({
      name: "fileOperations.update",
      teamId,
      actorId,
      // @ts-expect-error dataValues exists
      data: fileOperation.dataValues,
    });
  }
}
