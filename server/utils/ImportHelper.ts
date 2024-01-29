import path from "path";
import fs from "fs-extra";
import { deserializeFilename } from "./fs";

export type FileTreeNode = {
  /** The title, extracted from the file name */
  title: string;
  /** The file name including extension */
  name: string;
  /** Full path to the file within the zip file */
  path: string;
  /** Any nested children */
  children: FileTreeNode[];
};

export default class ImportHelper {
  /**
   * Collects the files and folders for a directory filePath.
   */
  public static async toFileTree(
    filePath: string,
    currentDepth = 0
  ): Promise<FileTreeNode | null> {
    const name = path.basename(filePath);
    const title = deserializeFilename(path.parse(path.basename(name)).name);
    const item = {
      path: filePath,
      name,
      title,
      children: [] as FileTreeNode[],
    };
    let stats;

    if ([".git", ".DS_Store", "__MACOSX"].includes(name)) {
      return null;
    }

    try {
      stats = await fs.stat(filePath);
    } catch (e) {
      return null;
    }

    if (stats.isFile()) {
      return item;
    }

    if (stats.isDirectory()) {
      const dirData = await fs.readdir(filePath);
      if (dirData === null) {
        return null;
      }

      item.children = (
        await Promise.all(
          dirData.map((child) =>
            this.toFileTree(path.join(filePath, child), currentDepth + 1)
          )
        )
      ).filter(Boolean) as FileTreeNode[];
    } else {
      return null;
    }

    return item;
  }
}
