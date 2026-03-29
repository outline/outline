import { randomUUID } from "crypto";
import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Attachment, Team } from "@server/models";
import AttachmentHelper from "@server/models/helpers/AttachmentHelper";
import { authorize } from "@server/policies";
import presentAttachment from "@server/presenters/attachment";
import FileStorage from "@server/storage/files";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import { AttachmentPreset } from "@shared/types";
import { error, success, buildAPIContext, withTracing } from "./util";

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
          size: z.coerce.number().describe("The file size in bytes."),
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

            const presignedPost = await FileStorage.getPresignedPost(
              ctx,
              key,
              acl,
              maxUploadSize,
              contentType
            );

            const uploadUrl = FileStorage.getUploadUrl();
            const form = {
              "Cache-Control": "max-age=31557600",
              "Content-Type": contentType,
              ...presignedPost.fields,
            };

            // Build a ready-to-use curl command for the MCP client
            const formArgs = Object.entries(form)
              .map(([k, v]) => `-F '${k}=${v}'`)
              .join(" ");
            const curlCommand = `curl -X POST ${formArgs} -F 'file=@/path/to/file' '${uploadUrl}'`;

            return success({
              uploadUrl,
              form,
              maxUploadSize,
              curlCommand,
              attachment: {
                ...presentAttachment(attachment),
                url: attachment.redirectUrl,
              },
            });
          } catch (message) {
            return error(message);
          }
        }
      )
    );
  }
}
