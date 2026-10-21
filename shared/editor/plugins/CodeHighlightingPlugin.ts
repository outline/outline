import type { Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type refractorType from "refractor/core";
import { getLoaderForLanguage, getRefractorLangForLanguage } from "../lib/code";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

/** A highlighted token, with offsets relative to the start of the block content. */
interface TokenRange {
  from: number;
  to: number;
  className: string;
}

interface CodeBlock {
  node: Node;
  pos: number;
}

interface CodeHighlightingState {
  /** The decorations for all code blocks in the document. */
  decorations: DecorationSet;
  /** The code blocks the decorations were built for, in document order. */
  blocks: CodeBlock[];
  /** Whether a block still shows tokens from before its last edit. */
  stale: boolean;
}

/** Blocks with more characters than this are highlighted after a pause in typing. */
const deferredHighlightLength = 10000;

/** Time to wait after the last edit before a deferred highlight. */
const deferredHighlightDelay = 200;

const languagePromises: Record<
  string,
  Promise<string | undefined> | undefined
> = {};

let refractor: typeof refractorType | undefined;

/** Lazily load refractor core. */
async function getRefractor() {
  refractor ??= (await import("refractor/core")).default;
  return refractor;
}

async function loadLanguage(language: string) {
  const r = await getRefractor();
  if (!language || r.registered(language)) {
    return;
  }

  if (languagePromises[language]) {
    return languagePromises[language];
  }

  const loader = getLoaderForLanguage(language);
  if (!loader) {
    return;
  }

  languagePromises[language] = loader()
    .then((syntax) => {
      r.register(syntax);
      return language;
    })
    .catch((err) => {
      // It will retry loading the language on the next render
      // oxlint-disable-next-line no-console
      console.error(
        `Failed to load language ${language} for code highlighting`,
        err
      );
      delete languagePromises[language]; // Remove failed promise from cache
      return undefined;
    });

  return languagePromises[language];
}

/**
 * Create the DOM for a line number. The number itself is a CSS counter, so
 * every widget is identical and the view can reuse them as lines change.
 *
 * @returns the line number element.
 */
function createLineNumber() {
  const element = document.createElement("span");
  element.className = EditorStyleHelper.codeBlockLineNumber;
  element.setAttribute("aria-hidden", "true");
  return element;
}

/**
 * Create a widget decoration that marks the start of a line in a code block.
 *
 * @param pos - the position of the start of the line.
 * @returns the widget decoration.
 */
function lineNumberWidget(pos: number) {
  return Decoration.widget(pos, createLineNumber, {
    side: -1,
    marks: [],
    key: "line-number",
    // Keep the widget editable, Chrome otherwise deletes it on Backspace at
    // the start of a line instead of the line break.
    raw: true,
  });
}

/**
 * Create the line number decorations for a code block.
 *
 * @param block - the code block.
 * @returns the decorations.
 */
function lineNumberDecorations({ node, pos }: CodeBlock): Decoration[] {
  const text = node.textContent;
  const decorations = [lineNumberWidget(pos + 1)];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      decorations.push(lineNumberWidget(pos + 2 + i));
    }
  }
  const gutterWidth = String(decorations.length).length;

  decorations.push(
    Decoration.node(
      pos,
      pos + node.nodeSize,
      {
        style: `--line-number-gutter-width: ${gutterWidth};`,
      },
      {
        key: `line-${gutterWidth}-gutter`,
      }
    )
  );
  return decorations;
}

/**
 * Convert refractor output to token ranges. Adjacent tokens with the same
 * classes are merged so that the view renders fewer elements.
 *
 * @param nodes - the refractor nodes.
 * @param classNames - the classes inherited from parent nodes.
 * @param state - the accumulated tokens and current offset.
 * @returns the accumulated tokens and current offset.
 */
function parseNodes(
  nodes: refractorType.RefractorNode[],
  classNames: string[] = [],
  state: { tokens: TokenRange[]; offset: number } = { tokens: [], offset: 0 }
) {
  for (const node of nodes) {
    if (node.type === "element") {
      parseNodes(
        node.children,
        [...classNames, ...(node.properties.className || [])],
        state
      );
      continue;
    }

    const from = state.offset;
    state.offset += node.value.length;
    if (!classNames.length) {
      continue;
    }

    const className = classNames.join(" ");
    const previous = state.tokens[state.tokens.length - 1];
    if (previous && previous.to === from && previous.className === className) {
      previous.to = state.offset;
    } else {
      state.tokens.push({ from, to: state.offset, className });
    }
  }
  return state;
}

/**
 * Find all code blocks with the given node name in a document.
 *
 * @param doc - the document.
 * @param name - the node name.
 * @returns the code blocks in document order.
 */
function findCodeBlocks(doc: Node, name: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === name) {
      blocks.push({ node, pos });
    }
    return !node.isTextblock;
  });
  return blocks;
}

/**
 * Check if the code blocks are the same nodes as before a transaction, and
 * only moved because of changes outside of them.
 *
 * @param tr - the transaction.
 * @param previous - the code blocks before the transaction.
 * @param blocks - the code blocks after the transaction.
 * @returns true if the decorations of the previous blocks can be mapped.
 */
function blocksUnchanged(
  tr: Transaction,
  previous: CodeBlock[],
  blocks: CodeBlock[]
) {
  if (previous.length !== blocks.length) {
    return false;
  }

  return blocks.every((block, index) => {
    if (block.node !== previous[index].node) {
      return false;
    }
    const result = tr.mapping.mapResult(previous[index].pos + 1);
    return !result.deleted && result.pos === block.pos + 1;
  });
}

/**
 * Create a plugin that adds syntax highlighting and line numbers to code
 * blocks. Highlighted tokens are cached for each block node, so only blocks
 * that changed are highlighted again.
 *
 * @param options - the plugin options.
 * @returns the plugin.
 */
export function CodeHighlighting({
  name,
  lineNumbers,
}: {
  /** The node name. */
  name: string;
  /** Whether to include decorations representing line numbers */
  lineNumbers?: boolean;
}) {
  const key = new PluginKey<CodeHighlightingState>("codeHighlighting");
  const tokenCache = new WeakMap<Node, TokenRange[]>();
  const languagesToImport = new Set<string>();

  /**
   * Get the highlighted tokens for a code block.
   *
   * @param node - the code block node.
   * @returns the tokens, or undefined if the language is not loaded.
   */
  function getTokens(node: Node): TokenRange[] | undefined {
    const cached = tokenCache.get(node);
    if (cached) {
      return cached;
    }

    const language = node.attrs.language;
    const lang = getRefractorLangForLanguage(language);
    if (!lang) {
      return;
    }
    if (!refractor?.registered(lang)) {
      languagesToImport.add(language);
      return;
    }

    const { tokens } = parseNodes(refractor.highlight(node.textContent, lang));
    tokenCache.set(node, tokens);
    return tokens;
  }

  /**
   * Build the decorations for all code blocks in a document.
   *
   * @param doc - the document.
   * @param blocks - the code blocks in the document.
   * @param previous - the previous decorations mapped to the document, used
   * to defer highlighting large blocks that changed.
   * @returns the plugin state.
   */
  function build(
    doc: Node,
    blocks: CodeBlock[],
    previous?: DecorationSet
  ): CodeHighlightingState {
    const decorations: Decoration[] = [];
    let stale = false;

    for (const block of blocks) {
      const { node, pos } = block;
      if (lineNumbers) {
        decorations.push(...lineNumberDecorations(block));
      }

      if (
        previous &&
        !tokenCache.has(node) &&
        node.content.size > deferredHighlightLength
      ) {
        const language = node.attrs.language;
        const mapped = previous.find(
          pos,
          pos + node.nodeSize,
          (spec) => spec.language === language
        );
        if (mapped.length) {
          decorations.push(...mapped);
          stale = true;
          continue;
        }
      }

      const tokens = getTokens(node);
      if (!tokens) {
        continue;
      }
      const language = node.attrs.language;
      const start = pos + 1;
      for (const token of tokens) {
        decorations.push(
          Decoration.inline(
            start + token.from,
            start + token.to,
            { class: token.className },
            { language }
          )
        );
      }
    }

    return {
      decorations: DecorationSet.create(doc, decorations),
      blocks,
      stale,
    };
  }

  return new Plugin<CodeHighlightingState>({
    key,
    state: {
      init: (_, { doc }) => build(doc, findCodeBlocks(doc, name)),
      apply: (tr, value) => {
        // Sent when a language loads or a deferred highlight is due.
        const refresh = !!tr.getMeta("codeHighlighting");
        if (!tr.docChanged && !refresh) {
          return value;
        }

        const blocks = findCodeBlocks(tr.doc, name);
        if (refresh) {
          return build(tr.doc, blocks);
        }

        const mapped = value.decorations.map(tr.mapping, tr.doc);
        if (blocksUnchanged(tr, value.blocks, blocks)) {
          return { ...value, decorations: mapped, blocks };
        }

        return build(tr.doc, blocks, mapped);
      },
    },
    view: (view) => {
      let timeout: ReturnType<typeof setTimeout> | undefined;

      const refresh = () => {
        if (!view.isDestroyed) {
          view.dispatch(view.state.tr.setMeta("codeHighlighting", true));
        }
      };

      const refreshWhenIdle = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          // Changing decorations around an active composition breaks IME input.
          if (view.composing) {
            refreshWhenIdle();
            return;
          }
          refresh();
        }, deferredHighlightDelay);
      };

      const importLanguages = () => {
        if (!languagesToImport.size) {
          return;
        }

        const languages = [...languagesToImport];
        languagesToImport.clear();

        void Promise.all(languages.map(loadLanguage)).then(() => {
          const loaded = languages.some((language) => {
            const lang = getRefractorLangForLanguage(language);
            return !!lang && refractor?.registered(lang);
          });
          if (loaded) {
            refresh();
          }
        });
      };

      if (refractor) {
        importLanguages();
      } else {
        void getRefractor().then(refresh);
      }

      return {
        update: () => {
          if (key.getState(view.state)?.stale) {
            refreshWhenIdle();
          }
          importLanguages();
        },
        destroy: () => {
          clearTimeout(timeout);
        },
      };
    },
    props: {
      decorations(state) {
        return key.getState(state)?.decorations;
      },
    },
  });
}
