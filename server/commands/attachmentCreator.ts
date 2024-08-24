import { v4 as uuidv4 } from "uuid";
import { AttachmentPreset } from "@shared/types";
import { Attachment, User } from "@server/models";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import FileStorage from "@server/storage/files";
import { APIContext } from "@server/types";
import { RequestInit } from "@server/utils/fetch";

type BaseProps = {
  /** The ID of the attachment */
  id?: string;
  /** The name of the attachment */
  name: string;
  /** The user who is creating the attachment */
  user: User;
  /** The source of the attachment */
  source?: "import";
  /** The preset to use for the attachment */
  preset: AttachmentPreset;
  /** The request context */
  ctx: APIContext;
  /** Options to pass to fetch when downloading the attachment */
  fetchOptions?: RequestInit;
};

type UrlProps = BaseProps & {
  url: string;
};

type BufferProps = BaseProps & {
  buffer: Buffer;
  type: string;
};

type Props = UrlProps | BufferProps;

export default async function attachmentCreator({
  id,
  name,
  user,
  source,
  preset,
  ctx,
  fetchOptions,
  ...rest
}: Props): Promise<Attachment | undefined> {
  const acl = AttachmentHelper.presetToAcl(preset);
  const key = AttachmentHelper.getKey({
    acl,
    id: uuidv4(),
    name,
    userId: user.id,
  });

  let attachment;

  if ("url" in rest) {
    const { url } = rest;
    const res = await FileStorage.storeFromUrl(url, key, acl, fetchOptions);

    if (!res) {
      return;
    }
    attachment = await Attachment.createWithCtx(ctx, {
      id,
      key,
      acl,
      size: res.contentLength,
      contentType: res.contentType,
      teamId: user.teamId,
      userId: user.id,
    });
  } else {
    const { buffer, type } = rest;
    await FileStorage.store({
      body: buffer,
      contentType: type,
      contentLength: buffer.length,
      key,
      acl,
    });

    attachment = await Attachment.createWithCtx(ctx, {
      id,
      key,
      acl,
      size: buffer.length,
      contentType: type,
      teamId: user.teamId,
      userId: user.id,
    });
  }

  return attachment;
}
