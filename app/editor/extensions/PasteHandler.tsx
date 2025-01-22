import { action, observable } from "mobx";
import { toggleMark } from "prosemirror-commands";
import { Slice } from "prosemirror-model";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import * as React from "react";
import { v4 } from "uuid";
import { LANGUAGES } from "@shared/editor/extensions/Prism";
import Extension, { WidgetProps } from "@shared/editor/lib/Extension";
import isMarkdown from "@shared/editor/lib/isMarkdown";
import normalizePastedMarkdown from "@shared/editor/lib/markdown/normalize";
import { isRemoteTransaction } from "@shared/editor/lib/multiplayer";
import { recreateTransform } from "@shared/editor/lib/prosemirror-recreate-transform";
import { isInCode } from "@shared/editor/queries/isInCode";
import { IconType, MentionType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import { isDocumentUrl, isUrl } from "@shared/utils/urls";
import stores from "~/stores";
import PasteMenu from "../components/PasteMenu";

/**
 * Checks if the HTML string is likely coming from Dropbox Paper.
 *
 * @param html The HTML string to check.
 * @returns True if the HTML string is likely coming from Dropbox Paper.
 */
function isDropboxPaper(html: string): boolean {
  return html?.includes("usually-unique-id");
}

function sliceSingleNode(slice: Slice) {
  return slice.openStart === 0 &&
    slice.openEnd === 0 &&
    slice.content.childCount === 1
    ? slice.content.firstChild
    : null;
}

/**
 * Parses the text contents of an HTML string and returns the src of the first
 * iframe if it exists.
 *
 * @param text The HTML string to parse.
 * @returns The src of the first iframe if it exists, or undefined.
 */
function parseSingleIframeSrc(html: string) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    if (
      doc.body.children.length === 1 &&
      doc.body.firstElementChild?.tagName === "IFRAME"
    ) {
      const iframe = doc.body.firstElementChild;
      const src = iframe.getAttribute("src");
      if (src) {
        return src;
      }
    }
  } catch (e) {
    // Ignore the million ways parsing could fail.
  }
  return undefined;
}

export default class PasteHandler extends Extension {
  state: {
    open: boolean;
    query: string;
    pastedText: string;
  } = observable({
    open: false,
    query: "",
    pastedText: "",
  });

  get name() {
    return "paste-handler";
  }

  private key = new PluginKey(this.name);

  get plugins() {
    return [
      new Plugin({
        key: this.key,
        props: {
          transformPastedHTML(html: string) {
            if (isDropboxPaper(html)) {
              // Fixes double paragraphs when pasting from Dropbox Paper
              html = html.replace(/<div><br><\/div>/gi, "<p></p>");
            }
            return html;
          },
          handleDOMEvents: {
            keydown: (_, event) => {
              if (event.key === "Shift") {
                this.shiftKey = true;
              }
              return false;
            },
            keyup: (_, event) => {
              if (event.key === "Shift") {
                this.shiftKey = false;
              }
              return false;
            },
          },
          handlePaste: (view, event: ClipboardEvent) => {
            // Do nothing if the document isn't currently editable or there is no clipboard data
            if (!view.editable || !event.clipboardData) {
              return false;
            }

            const { state, dispatch } = view;
            const iframeSrc = parseSingleIframeSrc(
              event.clipboardData.getData("text/plain")
            );
            const text =
              iframeSrc && !isInCode(state)
                ? iframeSrc
                : event.clipboardData.getData("text/plain");
            const html = event.clipboardData.getData("text/html");
            const vscode = event.clipboardData.getData("vscode-editor-data");

            // If the users selection is currently in a code block then paste
            // as plain text, ignore all formatting and HTML content.
            if (isInCode(state)) {
              event.preventDefault();
              view.dispatch(state.tr.insertText(text));
              return true;
            }

            // Because VSCode is an especially popular editor that places metadata
            // on the clipboard, we can parse it to find out what kind of content
            // was pasted.
            const vscodeMeta = vscode ? JSON.parse(vscode) : undefined;
            const pasteCodeLanguage = vscodeMeta?.mode;
            const supportsCodeBlock = !!state.schema.nodes.code_block;
            const supportsCodeMark = !!state.schema.marks.code_inline;

            if (!this.shiftKey) {
              // Check if the clipboard contents can be parsed as a single url
              if (isUrl(text)) {
                // If there is selected text then we want to wrap it in a link to the url
                if (!state.selection.empty) {
                  toggleMark(this.editor.schema.marks.link, { href: text })(
                    state,
                    dispatch
                  );
                  return true;
                }

                // Is the link a link to a document? If so, we can grab the title and insert it.
                if (isDocumentUrl(text)) {
                  const slug = parseDocumentSlug(text);

                  if (slug) {
                    void stores.documents
                      .fetch(slug)
                      .then((document) => {
                        if (view.isDestroyed) {
                          return;
                        }
                        if (document) {
                          if (state.schema.nodes.mention) {
                            view.dispatch(
                              view.state.tr.replaceWith(
                                state.selection.from,
                                state.selection.to,
                                state.schema.nodes.mention.create({
                                  type: MentionType.Document,
                                  modelId: document.id,
                                  label: document.titleWithDefault,
                                  id: v4(),
                                })
                              )
                            );
                          } else {
                            const { hash } = new URL(text);
                            const hasEmoji =
                              determineIconType(document.icon) ===
                              IconType.Emoji;

                            const title = `${
                              hasEmoji ? document.icon + " " : ""
                            }${document.titleWithDefault}`;

                            this.insertLink(`${document.path}${hash}`, title);
                          }
                        }
                      })
                      .catch(() => {
                        if (view.isDestroyed) {
                          return;
                        }
                        this.insertLink(text);
                      });
                  }
                } else {
                  this.insertLink(text);
                }

                return true;
              }

              if (pasteCodeLanguage && pasteCodeLanguage !== "markdown") {
                if (text.includes("\n") && supportsCodeBlock) {
                  event.preventDefault();
                  view.dispatch(
                    state.tr
                      .replaceSelectionWith(
                        state.schema.nodes.code_block.create({
                          language: Object.keys(LANGUAGES).includes(
                            vscodeMeta.mode
                          )
                            ? vscodeMeta.mode
                            : null,
                        })
                      )
                      .insertText(text)
                  );
                  return true;
                }

                if (supportsCodeMark) {
                  event.preventDefault();
                  view.dispatch(
                    state.tr
                      .insertText(
                        text,
                        state.selection.from,
                        state.selection.to
                      )
                      .addMark(
                        state.selection.from,
                        state.selection.to + text.length,
                        state.schema.marks.code_inline.create()
                      )
                  );
                  return true;
                }
              }

              // If the HTML on the clipboard is from Prosemirror then the best
              // compatability is to just use the HTML parser, regardless of
              // whether it "looks" like Markdown, see: outline/outline#2416
              if (html?.includes("data-pm-slice")) {
                return false;
              }
            }

            // If the text on the clipboard looks like Markdown OR there is no
            // html on the clipboard then try to parse content as Markdown
            if (
              (isMarkdown(text) && !isDropboxPaper(html)) ||
              pasteCodeLanguage === "markdown" ||
              this.shiftKey
            ) {
              event.preventDefault();

              // get pasted content as slice
              const paste = this.editor.pasteParser.parse(
                normalizePastedMarkdown(text)
              );
              if (!paste) {
                return false;
              }

              const slice = paste.slice(0);
              const tr = view.state.tr;
              let currentPos = view.state.selection.from;

              // If the pasted content is a single paragraph then we loop over
              // it's content and insert each node one at a time to allow it to
              // be pasted inline with surrounding content.
              const singleNode = sliceSingleNode(slice);
              if (singleNode?.type === this.editor.schema.nodes.paragraph) {
                singleNode.forEach((node) => {
                  tr.insert(currentPos, node);
                  currentPos += node.nodeSize;
                });
              } else {
                singleNode
                  ? tr.replaceSelectionWith(singleNode, this.shiftKey)
                  : tr.replaceSelection(slice);
              }

              view.dispatch(
                tr
                  .scrollIntoView()
                  .setMeta("paste", true)
                  .setMeta("uiEvent", "paste")
              );
              return true;
            }

            // otherwise use the default HTML parser which will handle all paste
            // "from the web" events
            return false;
          },
        },
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, set) => {
            let mapping = tr.mapping;

            // See if the transaction adds or removes any placeholders – the placeholder display is
            // different depending on if we're uploading an image, video or plain file
            const meta = tr.getMeta(this.key);
            const hasDecorations = set.find().length;

            // Note: We always rebuild the mapping if the transaction comes from this plugin as otherwise
            // with the default mapping decorations are wiped out when you upload multiple files at a time.
            if (hasDecorations && (isRemoteTransaction(tr) || meta)) {
              try {
                mapping = recreateTransform(tr.before, tr.doc, {
                  complexSteps: true,
                  wordDiffs: false,
                  simplifyDiff: true,
                }).mapping;
              } catch (err) {
                // eslint-disable-next-line no-console
                console.warn("Failed to recreate transform: ", err);
              }
            }

            set = set.map(mapping, tr.doc);

            if (meta?.add) {
              const { from, to, id } = meta.add;
              const decorations = [
                Decoration.inline(
                  from,
                  to,
                  {
                    class: "paste-placeholder",
                  },
                  {
                    id,
                  }
                ),
              ];
              return set.add(tr.doc, decorations);
            }

            if (meta?.remove) {
              const { id } = meta.remove;
              const decorations = set.find(
                undefined,
                undefined,
                (spec) => spec.id === id
              );
              return set.remove(decorations);
            }

            return set;
          },
        },
      }),
    ];
  }

  private shiftKey = false;

  private showPasteMenu = action((text: string) => {
    this.state.pastedText = text;
    this.state.open = true;
  });

  private hidePasteMenu = action(() => {
    this.state.open = false;
  });

  private insertLink(href: string, title?: string) {
    const { view } = this.editor;
    const { state } = view;
    const { from } = state.selection;
    const to = from + (title ?? href).length;

    const transaction = view.state.tr
      .insertText(title ?? href, state.selection.from, state.selection.to)
      .addMark(from, to, state.schema.marks.link.create({ href }))
      .setMeta(this.key, { add: { from, to, id: href } });
    view.dispatch(transaction);
    this.showPasteMenu(href);
  }

  private findPlaceholder(
    state: EditorState,
    id: string
  ): [number, number] | null {
    const decos = this.key.getState(state) as DecorationSet;
    const found = decos?.find(undefined, undefined, (spec) => spec.id === id);
    return found?.length ? [found[0].from, found[0].to] : null;
  }

  keys() {
    return {
      Backspace: () => {
        this.hidePasteMenu();
        return false;
      },
      "Mod-z": () => {
        this.hidePasteMenu();
        return false;
      },
    };
  }

  widget = ({ rtl }: WidgetProps) => (
    <PasteMenu
      rtl={rtl}
      trigger=""
      embeds={this.editor.props.embeds}
      pastedText={this.state.pastedText}
      isActive={this.state.open}
      search={this.state.query}
      onClose={() => {
        this.hidePasteMenu();
      }}
      onSelect={(item) => {
        const { view } = this.editor;
        const { state } = view;

        switch (item.name) {
          case "link": {
            view.dispatch(
              state.tr.setMeta(this.key, {
                remove: { id: this.state.pastedText },
              })
            );
            this.hidePasteMenu();

            break;
          }
          case "embed": {
            const result = this.findPlaceholder(state, this.state.pastedText);

            if (result) {
              view.dispatch(
                state.tr.replaceWith(
                  result[0],
                  result[1],
                  this.editor.schema.text("")
                )
              );
            }

            this.editor.commands.embed({
              href: this.state.pastedText,
            });
            this.hidePasteMenu();
            break;
          }
          default:
            break;
        }
      }}
    />
  );
}
