import fs from "fs";
import invariant from "invariant";
import ExportFailureEmail from "@server/emails/templates/ExportFailureEmail";
import ExportSuccessEmail from "@server/emails/templates/ExportSuccessEmail";
import Logger from "@server/logging/logger";
import { FileOperation, Collection, Event, Team, User } from "@server/models";
import { FileOperationState } from "@server/models/FileOperation";
import { Event as TEvent } from "@server/types";
import { uploadToS3FromBuffer } from "@server/utils/s3";
import { archiveCollections } from "@server/utils/zip";
import BaseProcessor from "./BaseProcessor";

export default class ExportsProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = [
    "collections.export",
    "collections.export_all",
  ];

  async perform(event: TEvent) {
    switch (event.name) {
      case "collections.export":
      case "collections.export_all": {
        const { actorId, teamId } = event;
        const team = await Team.findByPk(teamId);
        invariant(team, "team operation not found");

        const user = await User.findByPk(actorId);
        invariant(user, "user operation not found");

        const fileOperation = await FileOperation.findByPk(event.modelId);
        invariant(fileOperation, "fileOperation not found");

        const collectionIds =
          "collectionId" in event && event.collectionId
            ? event.collectionId
            : await user.collectionIds();

        const collections = await Collection.findAll({
          where: {
            id: collectionIds,
          },
        });

        this.updateFileOperation(fileOperation, actorId, teamId, {
          state: FileOperationState.Creating,
        });
        // heavy lifting of creating the zip file
        Logger.info(
          "processor",
          `Archiving collections for file operation ${fileOperation.id}`
        );
        const filePath = await archiveCollections(collections);
        let url;
        let state = FileOperationState.Creating;

        try {
          // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
          const readBuffer = await fs.promises.readFile(filePath);
          // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
          const stat = await fs.promises.stat(filePath);
          this.updateFileOperation(fileOperation, actorId, teamId, {
            state: FileOperationState.Uploading,
            size: stat.size,
          });
          Logger.info(
            "processor",
            `Uploading archive for file operation ${fileOperation.id}`
          );
          url = await uploadToS3FromBuffer(
            readBuffer,
            "application/zip",
            fileOperation.key,
            "private"
          );
          Logger.info(
            "processor",
            `Upload complete for file operation ${fileOperation.id}`
          );
          state = FileOperationState.Complete;
        } catch (error) {
          Logger.error("Error exporting collection data", error, {
            fileOperationId: fileOperation.id,
          });
          state = FileOperationState.Error;
          url = undefined;
        } finally {
          this.updateFileOperation(fileOperation, actorId, teamId, {
            state,
            url,
          });

          if (state === FileOperationState.Error) {
            await ExportFailureEmail.schedule({
              to: user.email,
              teamUrl: team.url,
            });
          } else {
            await ExportSuccessEmail.schedule({
              to: user.email,
              id: fileOperation.id,
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
    data: Partial<FileOperation>
  ) {
    await fileOperation.update(data);
    await Event.schedule({
      name: "fileOperations.update",
      teamId,
      actorId,
      modelId: fileOperation.id,
    });
  }
}
