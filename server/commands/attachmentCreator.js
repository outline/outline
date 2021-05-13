// @flow
import { v4 as uuidv4 } from "uuid";
import { Attachment, Event, User } from "../models";
import { uploadToS3FromBuffer } from "../utils/s3";

export default async function attachmentCreator({
  name,
  type,
  buffer,
  user,
  source,
  ip,
}: {
  name: string,
  type: string,
  buffer: Buffer,
  user: User,
  source?: "import",
  ip: string,
}) {
  const key = `uploads/${user.id}/${uuidv4()}/${name}`;
  const acl = process.env.AWS_S3_ACL || "private";
  const url = await uploadToS3FromBuffer(buffer, type, key, acl);

  const attachment = await Attachment.create({
    key,
    acl,
    url,
    size: buffer.length,
    contentType: type,
    teamId: user.teamId,
    userId: user.id,
  });

  await Event.create({
    name: "attachments.create",
    data: { name, source },
    modelId: attachment.id,
    teamId: user.teamId,
    actorId: user.id,
    ip,
  });

  return attachment;
}
