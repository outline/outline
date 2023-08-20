import { Transaction } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import { Attachment, Event, User } from "@server/models";
import FileStorage from "@server/storage/files";

export default async function attachmentCreator({
  id,
  name,
  type,
  buffer,
  user,
  source,
  ip,
  transaction,
}: {
  id?: string;
  name: string;
  type: string;
  buffer: Buffer;
  user: User;
  source?: "import";
  ip?: string;
  transaction?: Transaction;
}) {
  const key = `uploads/${user.id}/${uuidv4()}/${name}`;
  const acl = process.env.AWS_S3_ACL || "private";
  const url = await FileStorage.upload({
    body: buffer,
    contentType: type,
    contentLength: buffer.length,
    key,
    acl,
  });
  const attachment = await Attachment.create(
    {
      id,
      key,
      acl,
      url,
      size: buffer.length,
      contentType: type,
      teamId: user.teamId,
      userId: user.id,
    },
    {
      transaction,
    }
  );
  await Event.create(
    {
      name: "attachments.create",
      data: {
        name,
        source,
      },
      modelId: attachment.id,
      teamId: user.teamId,
      actorId: user.id,
      ip,
    },
    {
      transaction,
    }
  );
  return attachment;
}
