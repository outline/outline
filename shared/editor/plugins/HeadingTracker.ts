import { Node, ResolvedPos } from "prosemirror-model";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import sorted from "sorted-array-functions";
import { HeadingLevel } from "../nodes/Heading";
import { findBlockNodes } from "../queries/findChildren";

export class HeadingTracker extends Plugin<SortedHeadingPositions> {
  private sortedHeadingPositions: SortedHeadingPositions;
  private static key = new PluginKey<SortedHeadingPositions>("HeadingTracker");

  constructor() {
    super({
      key: HeadingTracker.key,
      state: {
        init: (_config, instance) => {
          this.updateHeadingPositions(instance.doc);
          return this.sortedHeadingPositions;
        },
        apply: (tr, value) => {
          if (tr.docChanged) {
            this.updateHeadingPositions(tr.doc);
            value = this.sortedHeadingPositions;
          }

          return value;
        },
      },
    });
  }

  private updateHeadingPositions(doc: Node) {
    this.sortedHeadingPositions = new SortedHeadingPositions();
    const blocks = findBlockNodes(doc, true);
    for (const block of blocks) {
      if (block.node.type.name === "heading") {
        this.sortedHeadingPositions.add(block.pos, block.node.attrs.level);
      }
    }
  }

  public static getState(
    state: EditorState
  ): SortedHeadingPositions | undefined {
    return HeadingTracker.key.getState(state);
  }

  // a "cut" here is a resolved pos which meets the criteria:
  // 1. Nearest "end of node" position before next closest sibling heading
  //    such that the level of sibling heading is gte the level of heading at selection, or,
  // 2. If no such siblings exist, position pointing
  //    to the end of parent node of heading at selection
  public static findCutAfterHeadingAtSelection(
    state: EditorState
  ): ResolvedPos {
    const sortedHeadingPositions = HeadingTracker.getState(state);
    const { $from } = state.selection;
    const heading = state.selection.$from.parent;
    // closest headings of each level at depth same as that of heading at selection
    const closestHeadingsAfterSelection: HeadingPos[] = [];
    for (let level = 1; level <= heading.attrs.level; level++) {
      const next = sortedHeadingPositions?.next($from.pos, level);
      if (next && state.doc.resolve(next + 1).depth === $from.depth) {
        // keeping these in sorted list so we can easily query the closest later
        sorted.add(closestHeadingsAfterSelection, next);
      }
    }
    const closestIndex = sorted.gt(closestHeadingsAfterSelection, $from.pos);
    if (closestIndex === -1) {
      return state.doc.resolve($from.end(-1));
    }
    return state.doc.resolve(
      state.doc.resolve(closestHeadingsAfterSelection[closestIndex] - 1).end()
    );
  }
}

class SortedHeadingPositions {
  private sortedPositionsByLevel: Map<HeadingLevel, HeadingPos[]>;
  private cmpFn = (pos1: HeadingPos, pos2: HeadingPos) => {
    if (pos1 === pos2) {
      return 0;
    }
    return pos1 < pos2 ? -1 : 1;
  };

  constructor() {
    this.sortedPositionsByLevel = new Map();
    for (let l = 1; l <= HeadingLevel.Four; l++) {
      this.sortedPositionsByLevel.set(l, []);
    }
  }

  public add(pos: HeadingPos, level: number) {
    sorted.add(this.sortedPositionsByLevel.get(level)!, pos, this.cmpFn);
  }

  public next(pos: number, level: number): HeadingPos | null {
    const nextIndex = sorted.gt(
      this.sortedPositionsByLevel.get(level)!,
      pos,
      this.cmpFn
    );

    return nextIndex !== -1
      ? this.sortedPositionsByLevel.get(level)![nextIndex]
      : null;
  }
}

type HeadingPos = number;
