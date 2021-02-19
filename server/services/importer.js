// @flow
import fs from "fs";
import os from "os";
import File from "formidable/lib/file";
import collectionImporter from "../commands/collectionImporter";
import type { Event } from "../events";
import { Attachment, User } from "../models";

export default class Importer {
  async on(event: Event) {
    switch (event.name) {
      case "collections.import": {
        const { type } = event.data;
        const attachment = await Attachment.findByPk(event.modelId);
        const user = await User.findByPk(event.actorId);

        const buffer = await attachment.buffer;
        const tmpDir = os.tmpdir();
        const tmpFilePath = `${tmpDir}/upload-${event.modelId}`;

        await fs.promises.writeFile(tmpFilePath, buffer);
        const file = new File({
          name: attachment.name,
          type: attachment.type,
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
