import { randomUUID } from "crypto";
import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import env from "@server/env";
import { InvalidRequestError, ValidationError } from "@server/errors";
import { Attachment, Team } from "@server/models";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import { authorize } from "@server/policies";
import presentAttachment from "@server/presenters/attachment";
import FileStorage from "@server/storage/files";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import { AttachmentPreset } from "@shared/types";
import { bytesToHumanReadable } from "@shared/utils/files";
import {
  error,
  success,
  buildAPIContext,
  pathToUrl,
  withTracing,
} from "./util";

/**
 * Registers attachment-related MCP tools on the given server, filtered by
 * the OAuth scopes granted to the current token.
 *
 * @param server - the MCP server instance to register on.
 * @param scopes - the OAuth scopes granted to the access token.
 */
export function attachmentTools(server: McpServer, scopes: string[]) {
  if (AuthenticationHelper.canAccess("attachments.create", scopes)) {
    server.registerTool(
      "create_attachment",
      {
        title: "Create attachment upload",
        description:
          "Requests a pre-signed upload URL. Use the returned uploadUrl and form fields to upload a file directly via a multipart POST request (e.g. with curl). The returned attachment URL is returned for use in documents.",
        annotations: {
          idempotentHint: false,
          readOnlyHint: false,
        },
        inputSchema: {
          contentType: z
            .string()
            .describe("The MIME type of the file, e.g. image/png, image/jpeg."),
          name: z
            .string()
            .describe("The filename including extension, e.g. screenshot.png."),
          size: z.coerce
            .number()
            .int()
            .nonnegative()
            .finite()
            .describe("The file size in bytes."),
        },
      },
      withTracing(
        "create_attachment",
        async ({ contentType, name, size }, extra) => {
          try {
            const ctx = buildAPIContext(extra);
            const { user } = ctx.state.auth;
            const team = await Team.findByPk(user.teamId, {
              rejectOnEmpty: true,
            });
            authorize(user, "createAttachment", team);

            const preset = AttachmentPreset.DocumentAttachment;
            const maxUploadSize =
              AttachmentHelper.presetToMaxUploadSize(preset);

            if (size > maxUploadSize) {
              throw ValidationError(
                `Sorry, this file is too large – the maximum size is ${bytesToHumanReadable(
                  maxUploadSize
                )}`
              );
            }

            const id = randomUUID();
            const acl = AttachmentHelper.presetToAcl(preset);
            const key = AttachmentHelper.getKey({
              id,
              name,
              userId: user.id,
            });

            const attachment = await Attachment.createWithCtx(ctx, {
              id,
              key,
              acl,
              size,
              contentType,
              teamId: user.teamId,
              userId: user.id,
            });

            const usePut = env.AWS_S3_UPLOAD_METHOD === "put";

            if (usePut) {
              const presignedPut = await FileStorage.getPresignedPut(
                key,
                acl,
                size,
                contentType
              );

              if (!presignedPut) {
                throw InvalidRequestError(
                  `The current storage backend does not support PUT uploads. Set AWS_S3_UPLOAD_METHOD to "post" or use an S3-compatible storage provider.`
                );
              }

              const curlCommand = `curl -X PUT ${Object.entries(
                presignedPut.headers
              )
                .map(([k, v]) => `-H '${k}: ${v}'`)
                .join(
                  " "
                )} --data-binary '@/path/to/file' '${presignedPut.url}'`;

              return success({
                mode: "put",
                url: presignedPut.url,
                headers: presignedPut.headers,
                maxUploadSize,
                curlCommand,
                attachment: pathToUrl(team, {
                  ...presentAttachment(attachment),
                  url: attachment.redirectUrl,
                }),
              });
            } else {
              const presignedPost = await FileStorage.getPresignedPost(
                ctx,
                key,
                acl,
                maxUploadSize,
                contentType
              );

              const uploadUrl = new URL(FileStorage.getUploadUrl(), team.url)
                .href;
              const form = {
                "Cache-Control": "max-age=31557600",
                "Content-Type": contentType,
                ...presignedPost.fields,
              };

              const formArgs = Object.entries(form)
                .map(([k, v]) => `-F '${k}=${v}'`)
                .join(" ");
              const curlCommand = `curl -X POST ${formArgs} -F 'file=@/path/to/file' '${uploadUrl}'`;

              return success({
                mode: "post",
                uploadUrl,
                form,
                maxUploadSize,
                curlCommand,
                attachment: pathToUrl(team, {
                  ...presentAttachment(attachment),
                  url: attachment.redirectUrl,
                }),
              });
            }
          } catch (message) {
            return error(message);
          }
        }
      )
    );
  }
}
