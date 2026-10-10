import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import mime from "mime-types";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

/** The identifier of the MCP skills extension (SEP-2640). */
export const skillsExtensionId = "io.modelcontextprotocol/skills";

/**
 * Registers the skills in this directory on the given server. Each skill file
 * is exposed as a `skill://` resource, and the `skills/list` and `skills/get`
 * methods of the skills extension return the skill manifests.
 *
 * @param server - the MCP server instance to register on.
 * @throws if a skill does not have valid frontmatter.
 */
export function skillResources(server: McpServer) {
  const skills = loadSkills();

  for (const skill of skills) {
    for (const file of skill.files) {
      const isSkillFile = file.uri === skill.uri;

      server.registerResource(
        isSkillFile ? skill.frontmatter.name : path.posix.basename(file.uri),
        file.uri,
        {
          description: isSkillFile ? skill.frontmatter.description : undefined,
          mimeType: file.mimeType,
        },
        (uri) => ({
          contents: [
            mime.charset(file.mimeType)
              ? {
                  uri: uri.href,
                  mimeType: file.mimeType,
                  text: file.content.toString("utf8"),
                }
              : {
                  uri: uri.href,
                  mimeType: file.mimeType,
                  blob: file.content.toString("base64"),
                },
          ],
        })
      );
    }
  }

  server.server.setRequestHandler(ListSkillsRequestSchema, () => ({
    resultType: "complete",
    skills: skills.map(presentSkill),
    ttlMs: cacheTtlMs,
    cacheScope: "public",
  }));

  server.server.setRequestHandler(GetSkillRequestSchema, (request) => {
    const skill = skills.find((s) => s.uri === request.params.uri);
    if (!skill) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `No skill is served at ${request.params.uri}`
      );
    }

    return {
      resultType: "complete",
      skill: presentSkill(skill),
      ttlMs: cacheTtlMs,
      cacheScope: "public",
    };
  });
}

interface SkillFile {
  uri: string;
  mimeType: string;
  content: Buffer;
  digest: string;
}

interface Skill {
  uri: string;
  frontmatter: SkillFrontmatter;
  files: SkillFile[];
}

const skillsDirectory = path.resolve("server/mcp/skills");

const skillUriPrefix = "skill://outline";

const cacheTtlMs = 60 * 60 * 1000;

const FrontmatterSchema = z.looseObject({
  name: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  description: z.string().min(1),
});

type SkillFrontmatter = z.infer<typeof FrontmatterSchema>;

const ListSkillsRequestSchema = z.object({
  method: z.literal("skills/list"),
  params: z.object({ cursor: z.string().optional() }).optional(),
});

const GetSkillRequestSchema = z.object({
  method: z.literal("skills/get"),
  params: z.object({ uri: z.string() }),
});

let cachedSkills: Skill[] | undefined;

/**
 * Reads every skill directory from disk once and caches the result.
 *
 * @returns the skills with their file contents and digests.
 */
function loadSkills(): Skill[] {
  if (cachedSkills) {
    return cachedSkills;
  }

  const directories = fs
    .readdirSync(skillsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  cachedSkills = directories.map((directory) => {
    const root = path.join(skillsDirectory, directory);
    const uri = `${skillUriPrefix}/${directory}/SKILL.md`;
    const files = listFiles(root).map((relativePath) => {
      const content = fs.readFileSync(path.join(root, relativePath));
      return {
        uri: `${skillUriPrefix}/${directory}/${relativePath}`,
        mimeType: mime.lookup(relativePath) || "application/octet-stream",
        content,
        digest: `sha256:${createHash("sha256").update(content).digest("hex")}`,
      };
    });

    const skillFile = files.find((file) => file.uri === uri);
    if (!skillFile) {
      throw new Error(`Skill "${directory}" is missing SKILL.md`);
    }

    const frontmatter = parseFrontmatter(skillFile.content.toString("utf8"));
    if (frontmatter.name !== directory) {
      throw new Error(
        `Skill name "${frontmatter.name}" must match its directory "${directory}"`
      );
    }

    return { uri, frontmatter, files };
  });

  return cachedSkills;
}

/**
 * Lists the files below a directory, recursively.
 *
 * @param root - the directory to list.
 * @returns the file paths relative to the root, with "/" as the separator.
 */
function listFiles(root: string): string[] {
  return fs
    .readdirSync(root, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(root, path.join(entry.parentPath, entry.name))
    )
    .map((relativePath) => relativePath.split(path.sep).join("/"))
    .sort();
}

/**
 * Parses the YAML frontmatter at the start of a SKILL.md file.
 *
 * @param markdown - the contents of the SKILL.md file.
 * @returns the frontmatter as a plain object.
 * @throws if the frontmatter is missing or does not have a valid name and description.
 */
function parseFrontmatter(markdown: string): SkillFrontmatter {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    throw new Error("SKILL.md must begin with YAML frontmatter");
  }

  // The core schema keeps values JSON-safe, for example dates stay strings.
  return FrontmatterSchema.parse(
    yaml.load(match[1], { schema: yaml.CORE_SCHEMA })
  );
}

/**
 * Presents a skill as an entry of the skills extension.
 *
 * @param skill - the skill to present.
 * @returns the skill entry with a digest and size for each file.
 */
function presentSkill(skill: Skill) {
  return {
    uri: skill.uri,
    frontmatter: skill.frontmatter,
    resources: skill.files.map((file) => ({
      uri: file.uri,
      digest: file.digest,
      size: file.content.byteLength,
    })),
  };
}
