import "./bootstrap";
import { writeFileSync } from "fs";
import path from "path";
import type { NavigationNode } from "@shared/types";
import { Collection } from "@server/models";

type MindmapNode = {
  id?: string;
  name: string;
  url?: string;
  children?: MindmapNode[];
};

function mapNode(node: NavigationNode): MindmapNode {
  return {
    id: node.id,
    name: node.title || "Untitled",
    url: node.url,
    children: node.children?.map(mapNode),
  };
}

function parseArgValue(argName: string) {
  const raw = process.argv.find((arg) => arg.startsWith(`${argName}=`));
  return raw ? raw.split("=").slice(1).join("=") : undefined;
}

/**
 * Export collection structures into a mind map JSON.
 *
 * @param outputPath Optional output path.
 */
export default async function main(outputPath?: string) {
  const collectionFilter =
    parseArgValue("--collectionId") ||
    parseArgValue("--collection") ||
    parseArgValue("--urlId");

  const collectionScope = Collection.scope("withDocumentStructure");
  const collections = collectionFilter
    ? [
        await collectionScope.findByPk(collectionFilter, {
          rejectOnEmpty: true,
        }),
      ]
    : await collectionScope.findAll({
        attributes: ["id", "name", "urlId", "documentStructure"],
        paranoid: false,
      });

  const root: MindmapNode = {
    name: collectionFilter ? "Collection" : "Collections",
    children: collections.map((collection) => ({
      id: collection.id,
      name: collection.name ?? "Untitled",
      url: collection.path,
      children: (collection.documentStructure ?? []).map(mapNode),
    })),
  };

  const targetPath =
    outputPath ||
    parseArgValue("--output") ||
    path.join(process.cwd(), "collections.mindmap.json");

  writeFileSync(targetPath, JSON.stringify(root, null, 2), "utf8");
  console.log(`Mind map exported to ${targetPath}`);
}

if (process.env.NODE_ENV !== "test") {
  const outputPath = process.argv[2]?.startsWith("--") ? undefined : process.argv[2];
  void main(outputPath);
}
