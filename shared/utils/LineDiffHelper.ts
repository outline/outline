import { diff as myersDiff } from "fast-myers-diff";

/** Options for a unified line diff. */
export interface LineDiffOptions {
  /** The number of unchanged lines around each change, defaults to 3. */
  context?: number;
  /** The number of milliseconds the diff can run before it stops. */
  timeout?: number;
}

export class LineDiffHelper {
  /**
   * Generates the hunks of a unified diff between the lines of two strings.
   * Lines are compared as integer IDs with Myers' O(ND) algorithm, and lines
   * found on one side only are marked as changed before the diff runs.
   *
   * @param before the before text.
   * @param after the after text.
   * @param options the diff options.
   * @returns the diff hunks, an empty string when the lines are identical, or
   * undefined when the diff did not complete in the time limit.
   */
  static unified(
    before: string,
    after: string,
    options: LineDiffOptions = {}
  ): string | undefined {
    const a = LineDiffHelper.splitLines(before);
    const b = LineDiffHelper.splitLines(after);
    const changes = LineDiffHelper.diff(
      a,
      b,
      Date.now() + (options.timeout ?? Infinity)
    );

    if (!changes) {
      return undefined;
    }

    return LineDiffHelper.formatHunks(
      a,
      b,
      changes.removed,
      changes.added,
      options.context ?? 3
    );
  }

  /**
   * Splits text into lines, a trailing newline does not start a new line.
   *
   * @param text the text to split.
   * @returns the lines of the text.
   */
  private static splitLines(text: string): string[] {
    if (!text) {
      return [];
    }

    const lines = text.split("\n");
    if (lines[lines.length - 1] === "") {
      lines.pop();
    }
    return lines;
  }

  /**
   * Finds the lines removed from `a` and the lines added in `b`.
   *
   * @param a the before lines.
   * @param b the after lines.
   * @param deadline the time in milliseconds at which the diff stops.
   * @returns a flag for each line, or undefined when the deadline passed.
   */
  private static diff(
    a: string[],
    b: string[],
    deadline: number
  ): { removed: Uint8Array; added: Uint8Array } | undefined {
    const removed = new Uint8Array(a.length);
    const added = new Uint8Array(b.length);

    // Unchanged lines at the start and end are skipped before lines get IDs.
    let start = 0;
    let aEnd = a.length;
    let bEnd = b.length;
    while (start < aEnd && start < bEnd && a[start] === b[start]) {
      start++;
    }
    while (aEnd > start && bEnd > start && a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }

    const ids = new Map<string, number>();
    const toIds = (lines: string[], end: number) =>
      Int32Array.from({ length: end - start }, (_, index) => {
        const line = lines[start + index];
        let id = ids.get(line);
        if (id === undefined) {
          id = ids.size;
          ids.set(line, id);
        }
        return id;
      });
    const aIds = toIds(a, aEnd);
    const bIds = toIds(b, bEnd);

    const inA = new Uint8Array(ids.size);
    const inB = new Uint8Array(ids.size);
    aIds.forEach((id) => (inA[id] = 1));
    bIds.forEach((id) => (inB[id] = 1));

    // A line that is on one side only cannot match, so the diff skips it.
    const aShared: number[] = [];
    const bShared: number[] = [];
    aIds.forEach((id, i) => {
      if (inB[id]) {
        aShared.push(i);
      } else {
        removed[start + i] = 1;
      }
    });
    bIds.forEach((id, j) => {
      if (inA[id]) {
        bShared.push(j);
      } else {
        added[start + j] = 1;
      }
    });
    const x = Int32Array.from(aShared, (i) => aIds[i]);
    const y = Int32Array.from(bShared, (j) => bIds[j]);

    // The library has no time limit, so the comparator checks the deadline.
    let comparisons = 0;
    const equals = (i: number, j: number) => {
      if (comparisons++ % 1024 === 0 && Date.now() >= deadline) {
        throw new DeadlineError();
      }
      return x[i] === y[j];
    };

    try {
      for (const [aFrom, aTo, bFrom, bTo] of myersDiff(x, y, equals)) {
        for (let index = aFrom; index < aTo; index++) {
          removed[start + aShared[index]] = 1;
        }
        for (let index = bFrom; index < bTo; index++) {
          added[start + bShared[index]] = 1;
        }
      }
    } catch (err) {
      if (err instanceof DeadlineError) {
        return undefined;
      }
      throw err;
    }

    return { removed, added };
  }

  /**
   * Formats changed lines as unified diff hunks without file headers.
   *
   * @param a the before lines.
   * @param b the after lines.
   * @param removed a flag for each before line that was removed.
   * @param added a flag for each after line that was added.
   * @param context the number of unchanged lines around each change.
   * @returns the diff hunks joined by newlines.
   */
  private static formatHunks(
    a: string[],
    b: string[],
    removed: Uint8Array,
    added: Uint8Array,
    context: number
  ): string {
    // The edit script has an operation for each entry, and the number of
    // before and after lines that come before the entry.
    const length = a.length + added.reduce((sum, flag) => sum + flag, 0);
    const ops = new Uint8Array(length);
    const aCounts = new Int32Array(length + 1);
    const bCounts = new Int32Array(length + 1);
    let i = 0;
    let j = 0;

    for (let entry = 0; entry < length; entry++) {
      aCounts[entry] = i;
      bCounts[entry] = j;

      if (i < a.length && removed[i]) {
        ops[entry] = Removed;
        i++;
      } else if (j < b.length && added[j]) {
        ops[entry] = Added;
        j++;
      } else {
        ops[entry] = Unchanged;
        i++;
        j++;
      }
    }
    aCounts[length] = i;
    bCounts[length] = j;

    // An empty range starts at the line before it, as in unified diff output.
    const range = (counts: Int32Array, start: number, end: number) => {
      const lines = counts[end] - counts[start];
      return `${lines === 0 ? counts[start] : counts[start] + 1},${lines}`;
    };
    const toLine = (entry: number) =>
      ops[entry] === Added
        ? `+${b[bCounts[entry]]}`
        : `${ops[entry] === Removed ? "-" : " "}${a[aCounts[entry]]}`;

    const hunks: string[] = [];
    let position = 0;

    while (position < length) {
      let first = position;
      while (first < length && ops[first] === Unchanged) {
        first++;
      }
      if (first === length) {
        break;
      }

      // Changes separated by up to two contexts of unchanged lines share a hunk.
      let last = first;
      for (
        let entry = first + 1;
        entry < length && entry - last - 1 <= context * 2;
        entry++
      ) {
        if (ops[entry] !== Unchanged) {
          last = entry;
        }
      }

      const start = Math.max(position, first - context);
      const end = Math.min(length, last + 1 + context);
      hunks.push(
        `@@ -${range(aCounts, start, end)} +${range(bCounts, start, end)} @@`
      );
      for (let entry = start; entry < end; entry++) {
        hunks.push(toLine(entry));
      }
      position = end;
    }

    return hunks.join("\n");
  }
}

/** The edit script operations. */
const Unchanged = 0;
const Removed = 1;
const Added = 2;

/** Thrown by the comparator to stop a diff that passed its deadline. */
class DeadlineError extends Error {}
