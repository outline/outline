import { randomUUID } from "node:crypto";
import type { AttachmentPreset } from "@shared/types";
import type { User } from "@server/models";
import { Attachment } from "@server/models";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import FileStorage from "@server/storage/files";
import type { APIContext } from "@server/types";
import type { RequestInit } from "@server/utils/fetch";

type BaseProps = {
  /** The ID of the attachment, when provided creation is idempotent */
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
  // Scoped to the team so a caller-supplied id can never resolve an attachment
  // outside of it – an id that belongs elsewhere falls through to the insert
  // and collides there, as it did before.
  if (id) {
    const existing = await Attachment.findOne({
      where: { id, teamId: user.teamId },
      transaction: ctx.context.transaction,
    });

    if (existing) {
      return existing;
    }
  }

  const modelId = id ?? randomUUID();
  const acl = AttachmentHelper.presetToAcl(preset);
  const key = AttachmentHelper.getKey({
    id: modelId,
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
      id: modelId,
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
      id: modelId,
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
