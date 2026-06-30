import path from "node:path";
import type { MarkdownPageImportTaskInputItem } from "@shared/schema";
import type { IntegrationService, ProsemirrorDoc } from "@shared/types";
import { Attachment } from "@server/models";
import type { ImportTask } from "@server/models";
import type {
  DiscoveredCollection,
  DiscoveredDocument,
} from "@server/queues/tasks/MarkdownAPIImportTask";
import MarkdownAPIImportTask from "@server/queues/tasks/MarkdownAPIImportTask";
import type { ZipTreeNode } from "@server/utils/ZipHelper";
import { resolveWikiLinks } from "../utils/resolveWikiLinks";

// Supertype of the base task's generic so the overrides below remain valid
// overrides of MarkdownAPIImportTask's Markdown-typed methods while still
// being able to inspect the Obsidian service value.
type Service = IntegrationService.Markdown | IntegrationService.Obsidian;

/** Folders Obsidian uses for its own state, which must not be imported. */
const IgnoredFolders = new Set([".obsidian", ".trash"]);

/** Title used when the archive has no single wrapping vault directory. */
const DefaultVaultTitle = "Obsidian Vault";

/** Removes a single trailing file extension from a name. */
function stripExtension(name: string): string {
  const ext = path.extname(name);
  return ext ? name.slice(0, -ext.length) : name;
}

/**
 * Imports an Obsidian vault export.
 *
 * An Obsidian vault is a folder of Markdown notes plus loose attachments —
 * structurally a Markdown zip — so the conversion, attachment, and persistence
 * machinery is inherited from {@link MarkdownAPIImportTask}. The Obsidian-specific
 * behavior is: the whole vault becomes a single collection, notes are titled by
 * their filename, and Obsidian-flavored wikilinks/embeds are parsed by the
 * `wikiLinks` markdown-it rule (enabled via {@link shouldParseWikiLinks}) and
 * then resolved against the vault's documents and attachments in
 * {@link transformContent}.
 */
export default class ObsidianAPIImportTask extends MarkdownAPIImportTask {
  protected async scheduleNextTask(
    importTask: ImportTask<Service>
  ): Promise<void> {
    await new ObsidianAPIImportTask().schedule({ importTaskId: importTask.id });
  }

  /**
   * Obsidian treats the filename as the note's title; a note's first heading
   * is real body content, so it is kept rather than lifted out as the title.
   *
   * @returns false so the leading heading is preserved in the document body.
   */
  protected shouldExtractTitleFromHeading(): boolean {
    return false;
  }

  /**
   * @returns true so `[[wikilinks]]` and `![[embeds]]` are parsed.
   */
  protected shouldParseWikiLinks(): boolean {
    return true;
  }

  /**
   * Maps the whole vault to a single collection. Obsidian vaults are usually
   * zipped from the vault folder, leaving one wrapping directory; we descend
   * into it (so its name becomes the collection name and loose root notes are
   * preserved as documents). Archives without that wrapper are gathered under
   * a single synthetic collection. Obsidian's own state folders are dropped.
   *
   * @param nodes The archive's top-level tree nodes.
   * @returns A single node whose children are the vault's contents.
   */
  protected resolveCollectionRootNodes(nodes: ZipTreeNode[]): ZipTreeNode[] {
    const visible = nodes.filter((node) => !IgnoredFolders.has(node.name));

    const wrapper =
      visible.length === 1 && visible[0].children.length > 0
        ? visible[0]
        : undefined;

    const title = wrapper?.title ?? DefaultVaultTitle;
    const children = (wrapper ? wrapper.children : visible).filter(
      (node) => !IgnoredFolders.has(node.name)
    );

    if (children.length === 0) {
      return [];
    }

    return [
      {
        name: title,
        title,
        pathInZip: wrapper?.pathInZip ?? "",
        children,
      },
    ];
  }

  /**
   * Extends the base path-keyed map with Obsidian's note-name keys, since
   * wikilinks target a note by name rather than by relative file path.
   *
   * @param collections The discovered collection tree.
   * @returns A map of every link target form to its document externalId.
   */
  protected buildDocMap(
    collections: DiscoveredCollection[]
  ): Record<string, string> {
    const map = super.buildDocMap(collections);
    const addNameKeys = (docs: DiscoveredDocument[]) => {
      for (const doc of docs) {
        const noteName = stripExtension(path.basename(doc.pathInZip));
        map[noteName] = doc.id;
        map[noteName.toLowerCase()] = doc.id;
        addNameKeys(doc.children);
      }
    };
    for (const collection of collections) {
      addNameKeys(collection.children);
    }
    return map;
  }

  /**
   * Resolves the raw wikilink targets produced by the `wikiLinks` rule against
   * the page's document and attachment maps.
   *
   * @param content The converted Prosemirror document.
   * @param page The per-page task input.
   * @returns The content with wikilink targets resolved.
   */
  protected transformContent(
    content: ProsemirrorDoc,
    page: MarkdownPageImportTaskInputItem
  ): ProsemirrorDoc {
    const attachmentByName = new Map(
      page.attachmentMap.map((item) => [
        path.basename(item.pathInZip).toLowerCase(),
        item.id,
      ])
    );

    return resolveWikiLinks(content, {
      resolveDocument: (target) => {
        const candidates = [
          target,
          stripExtension(target),
          path.basename(target),
          stripExtension(path.basename(target)),
        ];
        for (const candidate of candidates) {
          const id =
            page.docMap[candidate] ?? page.docMap[candidate.toLowerCase()];
          if (id) {
            return id;
          }
        }
        return undefined;
      },
      resolveAttachment: (target) => {
        const id = attachmentByName.get(path.basename(target).toLowerCase());
        return id ? Attachment.getRedirectUrl(id) : undefined;
      },
    }) as ProsemirrorDoc;
  }
}
