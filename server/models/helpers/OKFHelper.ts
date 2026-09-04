import yaml from "js-yaml";
import env from "@server/env";
import type Document from "@server/models/Document";

interface Frontmatter {
  type: string;
  title: string;
  description?: string;
  resource: string;
  status: "draft" | "stable" | "deprecated";
  generated: { by: string; at: string };
}

interface IndexEntry {
  /** The display name of the entry. */
  title: string;
  /** The path of the entry relative to the index file. */
  path: string;
  /** A short description of the entry, if any. */
  description?: string | null;
}

/**
 * Helpers for writing documents in the Open Knowledge Format (OKF), a bundle
 * of markdown files with YAML frontmatter.
 *
 * @see https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md
 */
export default class OKFHelper {
  /** The version of the specification the exported bundle targets. */
  public static readonly version = "0.2";

  /** Name of the directory listing entry. */
  public static readonly indexFileName = "index.md";

  /** File names that may not be used for a concept document. */
  public static readonly reservedFileNames = ["index.md", "log.md"];

  /** The concept type written to every exported document. */
  public static readonly conceptType = "Document";

  /**
   * Whether a file name is reserved by the format and cannot hold a document.
   *
   * @param fileName The file name, without any directory.
   * @returns true if the name is reserved.
   */
  public static isReservedFileName(fileName: string): boolean {
    return this.reservedFileNames.includes(fileName.toLowerCase());
  }

  /**
   * Builds the frontmatter block that precedes a document's markdown body.
   *
   * @param document The document being exported.
   * @returns The YAML frontmatter, including delimiters and a trailing newline.
   */
  public static frontmatter(document: Document): string {
    const description = this.singleLine(document.getSummary());
    const actor = document.updatedBy ?? document.createdBy;

    const data: Frontmatter = {
      type: this.conceptType,
      title: document.titleWithDefault,
      ...(description ? { description } : {}),
      resource: `${env.URL}${document.path}`,
      status: this.status(document),
      generated: {
        by: `human:${actor.email ?? actor.id}`,
        at: document.updatedAt.toISOString(),
      },
    };

    return this.serialize(data);
  }

  /**
   * Builds the bundle-root index that declares the format version and lists
   * the top-level entries of the bundle.
   *
   * @param heading The heading the entries are grouped under.
   * @param entries The entries to list.
   * @returns The contents of the root index.md.
   */
  public static rootIndex(heading: string, entries: IndexEntry[]): string {
    const lines = entries.map((entry) => {
      const description = this.singleLine(entry.description);
      const link = `[${entry.title}](${encodeURI(entry.path)})`;
      return description ? `* ${link} - ${description}` : `* ${link}`;
    });

    return `${this.serialize({ okf_version: this.version })}\n# ${heading}\n\n${lines.join("\n")}\n`;
  }

  private static status(document: Document): "draft" | "stable" | "deprecated" {
    if (document.archivedAt) {
      return "deprecated";
    }
    if (!document.publishedAt) {
      return "draft";
    }
    return "stable";
  }

  private static singleLine(value?: string | null): string {
    return (value ?? "").replace(/\s+/g, " ").trim();
  }

  private static serialize(data: object): string {
    return `---\n${yaml.dump(data, { lineWidth: -1, noRefs: true })}---\n`;
  }
}
