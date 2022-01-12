import path from "path";
import JSZip, { JSZipObject } from "jszip";

type ItemType = "collection" | "document" | "attachment";

export type Item = {
  path: string;
  dir: string;
  name: string;
  depth: number;
  metadata: Record<string, any>;
  type: ItemType;
  item: JSZipObject;
};

export async function parseOutlineExport(
  input: File | Buffer
): Promise<Item[]> {
  const zip = await JSZip.loadAsync(input);
  // this is so we can use async / await a little easier
  const items: Item[] = [];
  zip.forEach(async function (rawPath, item) {
    const itemPath = rawPath.replace(/\/$/, "");
    const dir = path.dirname(itemPath);
    const name = path.basename(item.name);
    const depth = itemPath.split("/").length - 1;

    // known skippable items
    if (itemPath.startsWith("__MACOSX") || itemPath.endsWith(".DS_Store")) {
      return;
    }

    // attempt to parse extra metadata from zip comment
    let metadata = {};

    try {
      metadata = item.comment ? JSON.parse(item.comment) : {};
    } catch (err) {
      console.log(
        `ZIP comment found for ${item.name}, but could not be parsed as metadata: ${item.comment}`
      );
    }

    if (depth === 0 && !item.dir) {
      throw new Error(
        "Root of zip file must only contain folders representing collections"
      );
    }

    let type: ItemType | undefined;

    if (depth === 0 && item.dir && name) {
      type = "collection";
    }

    if (depth > 0 && !item.dir && item.name.endsWith(".md")) {
      type = "document";
    }

    if (depth > 0 && !item.dir && itemPath.includes("uploads")) {
      type = "attachment";
    }

    if (!type) {
      return;
    }

    items.push({
      path: itemPath,
      dir,
      name,
      depth,
      type,
      metadata,
      item,
    });
  });
  return items;
}
