import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { iconNames } from "@shared/utils/IconNames";
import { attachmentTools } from "./tools/attachments";
import { collectionTools } from "./tools/collections";
import { commentTools } from "./tools/comments";
import { documentTools } from "./tools/documents";
import { fetchTool } from "./tools/fetch";
import { templateTools } from "./tools/templates";
import { userTools } from "./tools/users";
import { skillResources, skillsExtensionId } from "./skills";
import { iconNamesResourceUri } from "./util";
import { version } from "../../package.json";

/**
 * Creates a fresh MCP server instance with tools filtered by the OAuth
 * scopes granted to the current token.
 *
 * @param origin - the origin of this deployment, used for absolute asset URLs.
 * @param scopes - the OAuth scopes granted to the access token.
 * @param guidance - optional workspace guidance to append to default instructions.
 * @returns a configured McpServer ready to be connected to a transport.
 */
export function createMcpServer(
  origin: string,
  scopes: string[],
  guidance?: string
): McpServer {
  const instructions = guidance
    ? `${defaultInstructions}\n\n${guidance}`
    : defaultInstructions;

  const server = new McpServer(
    {
      name: "outline",
      title: "Outline",
      version,
      websiteUrl: origin,
      icons: [
        {
          src: `${origin}/images/icon-192.png`,
          mimeType: "image/png",
          sizes: ["192x192"],
        },
        {
          src: `${origin}/images/icon-512.png`,
          mimeType: "image/png",
          sizes: ["512x512"],
        },
      ],
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        extensions: {
          [skillsExtensionId]: {},
        },
      },
      instructions,
    }
  );

  // Exposed as a resource rather than inlined into every icon field's schema,
  // so the full list is fetched on demand instead of shipped with tools/list.
  server.registerResource(
    "icons",
    iconNamesResourceUri,
    {
      title: "Icon names",
      description:
        "The names of the icons available for document and collection icons.",
      mimeType: "application/json",
    },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(iconNames),
        },
      ],
    })
  );

  skillResources(server);

  attachmentTools(server, scopes);
  collectionTools(server, scopes);
  commentTools(server, scopes);
  documentTools(server, scopes);
  fetchTool(server, scopes);
  templateTools(server, scopes);
  userTools(server, scopes);

  return server;
}

const defaultInstructions = `Document markdown content must not begin with a top-level heading (H1) — the title is stored as a separate field, so set it via the title parameter and start the content with body text or a lower-level heading instead.

Document and collection markdown support @mentions using the syntax: @[Display Name](mention://user/userId). For example: @[John Doe](mention://user/c9a1b2e3-...). Use the "list_users" tool to find user IDs.

Read images and attachments with the "fetch" tool by setting resource to "attachment" and passing either the attachment ID or an /api/attachments.redirect?id=... URL; the tool will return a signed URL for download.

Base64-encoded images are supported in document content for all formats. When creating a document from HTML that includes images or videos, pass the markup with format "html" — remote URLs and base64 media are imported as attachments automatically. Do not convert such HTML to markdown, and do not upload the HTML file itself as an attachment.

When asked to create a document that follows a template, use the "list_templates" tool to find a matching template; each result already includes the template body as markdown. To use it unchanged, pass its ID as templateId to "create_document" and the new document is pre-filled from it. To adapt it first, modify the returned body and pass the result as the text parameter to "create_document". Either way no separate fetch is needed.`;
