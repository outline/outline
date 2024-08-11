import "./bootstrap";
import { Op } from "sequelize";
import { Attachment } from "@server/models";
import FileStorage from "@server/storage/files";

const limit = 100;
const page = 0;

export default async function main(exit = false) {
  const work = async (page: number): Promise<void> => {
    const teamId = process.argv[2];
    const dryRun = process.argv[3] !== "execute";

    if (!teamId) {
      throw new Error("Team ID is required");
    }

    console.log(`page ${page}, ${dryRun ? "DRY RUN" : ""}`);

    const attachments = await Attachment.unscoped().findAll({
      attributes: ["id", "key"],
      where: {
        teamId,
        updatedAt: { [Op.gt]: new Date("2024-08-01") },
        createdAt: { [Op.lt]: new Date("2024-08-01") },
      },
      limit,
      offset: page * limit,
      order: [["createdAt", "ASC"]],
      paranoid: false,
    });

    for (const attachment of attachments) {
      console.log(`Checking: ${attachment.key}`);
      const exists = await FileStorage.getFileExists(attachment.key);

      if (!exists) {
        // key with the last slash in the string replaced with a double slash
        const possibleKey = attachment.key.replace(/\/([^/]*)$/, "//$1");
        const existsAlt = await FileStorage.getFileExists(possibleKey);
        if (existsAlt) {
          console.log(`Exists at double slash, move it: ${possibleKey}`);

          if (dryRun) {
            console.log(`Would move: ${possibleKey} to ${attachment.key}`);
          } else {
            await FileStorage.moveFile(possibleKey, attachment.key);
          }
        }
      } else {
        console.log(`Attachment exists: ${attachment.key}`);
      }
    }

    return attachments.length === limit ? work(page + 1) : undefined;
  };

  await work(page);

  if (exit) {
    console.log("Complete");
    process.exit(0);
  }
}

if (process.env.NODE_ENV !== "test") {
  void main(true);
}
