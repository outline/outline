import fs from "fs-extra";
import yaml from "js-yaml";
import ZipHelper from "@server/utils/ZipHelper";
import {
  buildCollection,
  buildDocument,
  buildFileOperation,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import ExportOKFZipTask from "./ExportOKFZipTask";

describe("ExportOKFZipTask", () => {
  it("should write frontmatter and a root index", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: user.id,
      description: "About the collection",
    });
    const document = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      title: "Test1",
      text: "First line of body",
    });
    await collection.addDocumentToStructure(document);
    const fileOperation = await buildFileOperation({
      teamId: team.id,
      userId: user.id,
    });

    const task = new ExportOKFZipTask();
    const filePath = await task.exportCollections([collection], fileOperation);

    try {
      const contents = await readZipContents(filePath);
      expect(Object.keys(contents).sort()).toEqual(
        [`${collection.name}/Test1.md`, "index.md"].sort()
      );

      const [frontmatter, body] = splitFrontmatter(
        contents[`${collection.name}/Test1.md`]
      );
      expect(frontmatter).toMatchObject({
        type: "Document",
        title: "Test1",
        description: "First line of body",
        status: "stable",
        generated: {
          by: `human:${user.email}`,
          at: document.updatedAt.toISOString(),
        },
      });
      expect(frontmatter.resource).toBe(`${team.url}${document.path}`);
      expect(body.startsWith("\n")).toBe(true);
      expect(body).toContain("First line of body");

      const [indexFrontmatter, indexBody] = splitFrontmatter(
        contents["index.md"]
      );
      expect(indexFrontmatter).toEqual({ okf_version: "0.2" });
      expect(indexBody.startsWith("\n# Collections\n")).toBe(true);
      expect(indexBody).toContain(
        `* [${collection.name}](${encodeURI(collection.name)}/) - About the collection`
      );
    } finally {
      await fs.remove(filePath);
    }
  });

  it("should not use reserved file names for documents", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: user.id,
    });
    const document = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      title: "index",
    });
    await collection.addDocumentToStructure(document);
    const fileOperation = await buildFileOperation({
      teamId: team.id,
      userId: user.id,
    });

    const task = new ExportOKFZipTask();
    const filePath = await task.exportCollections([collection], fileOperation);

    try {
      const contents = await readZipContents(filePath);
      expect(Object.keys(contents).sort()).toEqual(
        [`${collection.name}/index (1).md`, "index.md"].sort()
      );
    } finally {
      await fs.remove(filePath);
    }
  });

  it("should rewrite internal links but keep the resource URL", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      createdById: user.id,
    });
    const target = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      title: "Target",
    });
    const source = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      title: "Source",
      text: `See [Target](${target.path})`,
    });
    await collection.addDocumentToStructure(target);
    await collection.addDocumentToStructure(source);
    const fileOperation = await buildFileOperation({
      teamId: team.id,
      userId: user.id,
    });

    const task = new ExportOKFZipTask();
    const filePath = await task.exportCollections([collection], fileOperation);

    try {
      const contents = await readZipContents(filePath);
      const [frontmatter, body] = splitFrontmatter(
        contents[`${collection.name}/Source.md`]
      );
      expect(frontmatter.resource).toContain(source.path);
      expect(body).toContain("(./Target.md)");
      expect(body).not.toContain(target.path);
    } finally {
      await fs.remove(filePath);
    }
  });
});

function splitFrontmatter(content: string): [Record<string, unknown>, string] {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error("No frontmatter found");
  }
  const data = yaml.load(match[1]);
  if (typeof data !== "object" || data === null) {
    throw new Error("Frontmatter is not a mapping");
  }
  return [data as Record<string, unknown>, match[2]];
}

async function readZipContents(
  filePath: string
): Promise<Record<string, string>> {
  const contents: Record<string, string> = {};
  await ZipHelper.walk(filePath, async (entry) => {
    if (!entry.isDirectory) {
      contents[entry.fileName] = (await entry.readBuffer(1024 * 1024)).toString(
        "utf8"
      );
    }
  });
  return contents;
}
