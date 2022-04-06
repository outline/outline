import fs from "fs";
import os from "os";
import File from "formidable/lib/file";
import invariant from "invariant";
import collectionImporter from "@server/commands/collectionImporter";
import { Event, FileOperation, Attachment, User } from "@server/models";
import { Event as TEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class ImportsProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = ["collections.import"];

  async perform(event: TEvent) {
    switch (event.name) {
      case "collections.import": {
        let state, error;
        const { type } = event.data;
        const attachment = await Attachment.findByPk(event.modelId);
        invariant(attachment, "attachment not found");

        const user = await User.findByPk(event.actorId);
        invariant(user, "user not found");

        const fileOperation = await FileOperation.create({
          type: "import",
          state: "creating",
          size: attachment.size,
          key: attachment.key,
          userId: user.id,
          teamId: user.teamId,
        });

        await Event.schedule({
          name: "fileOperations.create",
          modelId: fileOperation.id,
          teamId: user.teamId,
          actorId: user.id,
        });

        try {
          const buffer = await attachment.buffer;
          const tmpDir = os.tmpdir();
          const tmpFilePath = `${tmpDir}/upload-${event.modelId}`;
          await fs.promises.writeFile(tmpFilePath, buffer as Uint8Array);
          const file = new File({
            name: attachment.name,
            type: attachment.contentType,
            path: tmpFilePath,
          });

          await collectionImporter({
            file,
            user,
            type,
            ip: event.ip,
          });
          await attachment.destroy();

          state = "complete";
        } catch (err) {
          state = "error";
          error = err.message;
        } finally {
          await fileOperation.update({ state, error });
          await Event.schedule({
            name: "fileOperations.update",
            modelId: fileOperation.id,
            teamId: user.teamId,
            actorId: user.id,
          });
        }

        return;
      }

      default:
    }
  }
}
