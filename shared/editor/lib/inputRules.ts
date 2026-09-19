import type { InputRule } from "prosemirror-inputrules";
import type { ResolvedPos } from "prosemirror-model";
import type { EditorState, Transaction } from "prosemirror-state";
import { Plugin, Selection, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

/**
 * The public typings for prosemirror-inputrules hide the `match`, `handler` and
 * `undoable` members as `@internal`, but they are needed to re-run rules here.
 */
declare module "prosemirror-inputrules" {
  interface InputRule {
    match: RegExp;
    handler: (
      state: EditorState,
      match: RegExpMatchArray,
      start: number,
      end: number
    ) => Transaction | null;
    undoable: boolean;
  }
}

/** A rule that fired, paired with the transaction that applies its effect. */
type InputRuleMatch = { tr: Transaction; rule: InputRule };

type PluginState = {
  transform: Transaction;
  from: number;
  to: number;
  text: string;
} | null;

const MAX_MATCH = 500;

/**
 * Applies the first input rule that matches the text typed in front of the
 * cursor, mirroring prosemirror-inputrules but additionally matching
 * block-anchored rules against the current "soft line" — the text following the
 * last hard break within a block. Users generally do not distinguish a soft
 * break from a new paragraph, so typing e.g. ``` after a soft break inside a
 * list item creates a code block just as it would at the start of a block.
 *
 * @param state the current editor state.
 * @param from the start of the typed range.
 * @param to the end of the typed range.
 * @param text the text being inserted.
 * @param rules the input rules to consider.
 * @returns the matched rule and its transaction, or null when nothing matched.
 */
export function applyInputRules(
  state: EditorState,
  from: number,
  to: number,
  text: string,
  rules: readonly InputRule[]
): InputRuleMatch | null {
  const $from = state.doc.resolve(from);
  const textBefore =
    $from.parent.textBetween(
      Math.max(0, $from.parentOffset - MAX_MATCH),
      $from.parentOffset,
      null,
      "\ufffc"
    ) + text;

  for (const rule of rules) {
    if (!isRuleAllowed(rule, $from)) {
      continue;
    }
    const match = rule.match.exec(textBefore);
    if (!match || match[0].length < text.length) {
      continue;
    }
    const start = from - (match[0].length - text.length);
    if (hasCodeMarkBetween(rule, state, start, $from.pos)) {
      continue;
    }
    const tr = rule.handler(state, match, start, to);
    if (tr) {
      return { tr, rule };
    }
  }

  return matchAfterSoftBreak(state, from, to, text, rules);
}

/**
 * Creates an input rules plugin. A drop-in replacement for the equivalent plugin
 * from prosemirror-inputrules that also fires block-anchored rules after a soft
 * break within a block.
 *
 * @param options.rules the input rules to enable.
 * @returns a ProseMirror plugin.
 */
export function inputRules({ rules }: { rules: readonly InputRule[] }) {
  const plugin: Plugin<PluginState> = new Plugin<PluginState>({
    state: {
      init() {
        return null;
      },
      apply(tr, prev) {
        const stored = tr.getMeta(plugin);
        if (stored) {
          return stored;
        }
        return tr.selectionSet || tr.docChanged ? null : prev;
      },
    },
    props: {
      handleTextInput(view, from, to, text) {
        if (view.composing) {
          return false;
        }
        const result = applyInputRules(view.state, from, to, text, rules);
        if (!result) {
          return false;
        }
        dispatch(view, result, plugin, from, to, text);
        return true;
      },
      handleDOMEvents: {
        compositionend: (view) => {
          setTimeout(() => {
            const { selection } = view.state;
            if (selection instanceof TextSelection && selection.$cursor) {
              const { pos } = selection.$cursor;
              const result = applyInputRules(view.state, pos, pos, "", rules);
              if (result) {
                dispatch(view, result, plugin, pos, pos, "");
              }
            }
          });
        },
      },
    },
    // Marks this as an input rules plugin so `undoInputRule` can find it.
    isInputRules: true,
  });

  return plugin;
}

/**
 * Retries block-anchored rules against the soft line following the last hard
 * break, splitting the block at that break so the rule applies only to the soft
 * line rather than the whole block.
 */
function matchAfterSoftBreak(
  state: EditorState,
  from: number,
  to: number,
  text: string,
  rules: readonly InputRule[]
): InputRuleMatch | null {
  const breakType = state.schema.nodes.br;
  if (!breakType) {
    return null;
  }

  const $from = state.doc.resolve(from);
  const parent = $from.parent;

  // Locate the hard break immediately preceding the cursor within the block,
  // stopping at the cursor rather than scanning the rest of the block.
  let breakEnd = -1; // offset within the block just after the last hard break
  let breakPos = -1; // absolute position of the last hard break
  for (let i = 0, offset = 0; i < parent.childCount; i++) {
    if (offset >= $from.parentOffset) {
      break;
    }
    const child = parent.child(i);
    if (child.type === breakType) {
      breakEnd = offset + child.nodeSize;
      breakPos = $from.start() + offset;
    }
    offset += child.nodeSize;
  }
  if (breakPos < 0) {
    return null;
  }

  const textBefore =
    parent.textBetween(breakEnd, $from.parentOffset, null, "\ufffc") + text;

  for (const rule of rules) {
    if (!isBlockAnchored(rule) || !isRuleAllowed(rule, $from)) {
      continue;
    }
    const match = rule.match.exec(textBefore);
    if (!match || match[0].length < text.length) {
      continue;
    }
    const start = from - (match[0].length - text.length);
    if (hasCodeMarkBetween(rule, state, start, $from.pos)) {
      continue;
    }

    // Split the block at the hard break so the soft line becomes its own block,
    // then apply the rule to that new block. Both edits form a single, undoable
    // transaction.
    const tr = state.tr;
    tr.delete(breakPos, breakPos + 1);
    tr.split(breakPos);

    // Bail out if a plugin filters or appends to the intermediate transaction,
    // as the handler's steps would then be computed against a different doc.
    const applied = state.apply(tr);
    if (applied.doc !== tr.doc) {
      continue;
    }

    const ruleTr = rule.handler(
      applied,
      match,
      tr.mapping.map(start),
      tr.mapping.map(to)
    );
    if (!ruleTr) {
      continue;
    }

    ruleTr.steps.forEach((step) => tr.step(step));

    // Carry over a selection set by the handler, re-resolved as the docs are
    // equal but not reference-equal.
    if (ruleTr.selectionSet) {
      tr.setSelection(Selection.fromJSON(tr.doc, ruleTr.selection.toJSON()));
    }
    if (ruleTr.scrolledIntoView) {
      tr.scrollIntoView();
    }
    return { tr, rule };
  }

  return null;
}

/** A rule is block-anchored when its match is pinned to the start of a block. */
function isBlockAnchored(rule: InputRule): boolean {
  return rule.match.source.startsWith("^");
}

/** Mirrors the code / code-mark context guards from prosemirror-inputrules. */
function isRuleAllowed(rule: InputRule, $from: ResolvedPos): boolean {
  if (!rule.inCodeMark && $from.marks().some((mark) => mark.type.spec.code)) {
    return false;
  }
  if ($from.parent.type.spec.code) {
    return !!rule.inCode;
  }
  return rule.inCode !== "only";
}

/** Whether the matched range overlaps an inline code mark, unless allowed. */
function hasCodeMarkBetween(
  rule: InputRule,
  state: EditorState,
  from: number,
  to: number
): boolean {
  if (rule.inCodeMark) {
    return false;
  }
  let found = false;
  state.doc.nodesBetween(from, to, (node) => {
    if (node.isInline && node.marks.some((mark) => mark.type.spec.code)) {
      found = true;
    }
  });
  return found;
}

function dispatch(
  view: EditorView,
  { tr, rule }: InputRuleMatch,
  plugin: Plugin<PluginState>,
  from: number,
  to: number,
  text: string
): void {
  if (rule.undoable) {
    tr.setMeta(plugin, { transform: tr, from, to, text });
  }
  view.dispatch(tr);
}
