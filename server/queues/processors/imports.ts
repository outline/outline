import fs from "fs";
import os from "os";
import File from "formidable/lib/file";
import invariant from "invariant";
import collectionImporter from "@server/commands/collectionImporter";
import { Attachment, User } from "@server/models";
import { Event } from "../../types";

export default class ImportsProcessor {
  async on(event: Event) {
    switch (event.name) {
      case "collections.import": {
        const { type } = event.data;
        const attachment = await Attachment.findByPk(event.modelId);
        invariant(attachment, "attachment not found");

        const user = await User.findByPk(event.actorId);
        invariant(user, "user not found");

        const buffer: any = await attachment.buffer;
        const tmpDir = os.tmpdir();
        const tmpFilePath = `${tmpDir}/upload-${event.modelId}`;
        await fs.promises.writeFile(tmpFilePath, buffer);
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
        return;
      }

      default:
    }
  }
}
