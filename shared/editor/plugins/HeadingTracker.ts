import { Node } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import sorted from "sorted-array-functions";
import Heading, { HeadingLevel } from "../nodes/Heading";
import { findBlockNodes } from "../queries/findChildren";

/**
 * Algorithm for finding which headings to unfold upon backspacing is as follows:
 *
 * 1. From a given cursor position(after backspacing), of all the headings that came before it,
 *    find the closest heading corresponding to every level.
 * 2. Arrange those headings in a stack, maintaining the invariant that the
 *    heading at a given position in the stack is closer to the cursor than the one below it,
 *    and also, is of a level larger than that of the one below it.
 *    This invariant ensures that the heading at a given position in the stack is the "descendant" of the
 *    heading that's just below it in the stack.
 * 3. Pop out the headings from the stack, one by one and collect the ones which are collapsed.
 * 4. Unfold those collapsed headings.
 *
 * Example:
 *
 *    Consider the following document structure,
 *     _____________________________________________________________________________
 *    | H2(c)                                                                       |
 *    |   This goes under H2                                                        |
 *    |                                                                             |
 *    | H1(c)                                                                       |
 *    |   This goes under H1                                                        |
 *    |   H3(c)                                                                     |
 *    |     This goes under H3, which is under H1!                                  |
 *    |   H3'(u)                                                                    |
 *    |     This goes under H3', which is under H1!                                 |
 *    |     H4(c)                                                                   |
 *    |       This goes under H4, which is under H3, which, further, is under H1!   |
 *    |_____________________________________________________________________________|
 *
 *    The (c) & (u) denote folded and unfolded states of the heading, respectively.
 *
 *    Now, let's say the cursor lands under H4 upon backspacing. The desired state, after backspacing should be that H1,
 *    along with its "descendant" H4 end up being unfolded, displaying respective content under them.
 *
 *    So, Let's look at the the closest heading of each level from the cursor,
 *    Level 1: H1
 *    Level 2: H2
 *    Level 3: H3'(and not H3)
 *    Level 4: H4
 *
 *    And, the stack maintaing the invariant would look like,
 *
 *    | H4 |
 *    | -- |
 *    | H3'|
 *    | -- |
 *    | H1 |
 *     ----
 *
 *    * Level of H4(4) > Level of H3'(3) && H4 is closer to the cursor than H3'
 *    * Level of H3'(3) > Level of H1(1) && H3' is closer to the cursor than H1
 *
 *    Notice that we didn't push H2 onto the stack after H1, because that would violate the invariant considering
 *    H2 is further away from the cursor than H1, and therefore, is NOT A DESCENDANT of H1.
 *    So, we don't care about H2's collapsed state in this particular case.
 *
 *    Now, we pop out headings and collect the ones which are collapsed, i.e, H1 and H4. Then, we unfold them.
 */

export class HeadingTracker extends Plugin {
  private sortedHeadingPositions: SortedHeadingPositions;
  private closestHeadingsStack: Stack<HeadingWithPos>;
  private doc: Node;

  constructor() {
    super({
      appendTransaction: (transactions, _oldState, newState) => {
        if (!transactions.some((tr) => tr.docChanged)) {
          return;
        }
        this.doc = newState.doc;
        this.updateHeadingPositions();
        const cursorPos = newState.selection.from;
        this.collectPrevClosestHeadingsFrom(cursorPos);
        const closestHeading = this.closestHeadingsStack.top();
        if (
          closestHeading &&
          cursorPos > closestHeading.pos.before &&
          cursorPos < closestHeading.pos.after
        ) {
          return;
        }
        const headingsToUnfold = this.findHeadingsToUnfold();
        let transaction = newState.tr;
        for (const heading of headingsToUnfold) {
          transaction = transaction.setNodeMarkup(
            heading.pos.before,
            undefined,
            {
              ...heading.node.attrs,
              collapsed: false,
            }
          );
        }

        return transaction;
      },
    });
  }

  private updateHeadingPositions() {
    this.sortedHeadingPositions = new SortedHeadingPositions();
    const blocks = findBlockNodes(this.doc);
    for (const block of blocks) {
      if (block.node.type.name === "heading") {
        const $pos = this.doc.resolve(block.pos + 1);
        this.sortedHeadingPositions.add(
          { before: $pos.before(), after: $pos.after() },
          block.node.attrs.level
        );
      }
    }
  }

  private findPrevHeadingFrom(
    pos: number,
    level: number
  ): HeadingWithPos | null {
    const prevHeadingPos = this.sortedHeadingPositions.prev(pos, level);

    const prevHeading = (
      prevHeadingPos ? this.doc.nodeAt(prevHeadingPos.before) : null
    ) as Heading | null;
    return prevHeading ? { node: prevHeading, pos: prevHeadingPos! } : null;
  }

  private collectPrevClosestHeadingsFrom(pos: number) {
    this.closestHeadingsStack = new Stack();
    for (let level = 1; level <= HeadingLevel.Four; level++) {
      const heading = this.findPrevHeadingFrom(pos, level);
      if (heading) {
        if (this.closestHeadingsStack.isEmpty()) {
          this.closestHeadingsStack.push(heading);
        } else {
          const closestHeadingSoFar = this.closestHeadingsStack.top();
          if (heading.pos.after > closestHeadingSoFar!.pos.after) {
            this.closestHeadingsStack.push(heading);
          }
        }
      }
    }
  }

  private findHeadingsToUnfold() {
    const headings: HeadingWithPos[] = [];
    while (!this.closestHeadingsStack.isEmpty()) {
      const heading = this.closestHeadingsStack.pop();
      if (heading && heading.node.attrs?.collapsed) {
        headings.push(heading);
      }
    }

    return headings;
  }
}

class SortedHeadingPositions {
  private sortedPositionsByLevel: Map<number, HeadingPos[]>;
  private cmpFn = (a: HeadingPos, b: HeadingPos) => {
    if (a.before === b.before) {
      return 0;
    }
    return a.before < b.before ? -1 : 1;
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

  public prev(pos: number, level: number): HeadingPos | null {
    const prevIndex = sorted.lt(
      this.sortedPositionsByLevel.get(level)!,
      { after: pos, before: pos },
      this.cmpFn
    );
    return prevIndex !== -1
      ? this.sortedPositionsByLevel.get(level)![prevIndex]
      : null;
  }
}

export class Stack<T> {
  private items: T[] = [];

  public push(item: T): void {
    this.items.push(item);
  }

  public pop(): T | undefined {
    return this.items.pop();
  }

  public top(): T | undefined {
    return this.items[this.items.length - 1];
  }

  public isEmpty(): boolean {
    return this.items.length === 0;
  }
}

type HeadingPos = {
  before: number;
  after: number;
};

type HeadingWithPos = {
  node: Heading;
  pos: HeadingPos;
};
