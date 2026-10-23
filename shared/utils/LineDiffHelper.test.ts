import { LineDiffHelper } from "./LineDiffHelper";

/**
 * Returns the length of the longest common subsequence with dynamic programming.
 */
function lcsLength(a: string[], b: string[]) {
  const table = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0)
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      table[i][j] =
        a[i - 1] === b[j - 1]
          ? table[i - 1][j - 1] + 1
          : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }
  return table[a.length][b.length];
}

describe("LineDiffHelper", () => {
  describe("unified", () => {
    it("should return an empty string when the lines are identical", () => {
      expect(LineDiffHelper.unified("a\nb", "a\nb")).toEqual("");
      expect(LineDiffHelper.unified("a\nb\n", "a\nb")).toEqual("");
      expect(LineDiffHelper.unified("", "")).toEqual("");
    });

    it("should add every line to an empty text", () => {
      expect(LineDiffHelper.unified("", "a\nb")).toEqual(
        ["@@ -0,0 +1,2 @@", "+a", "+b"].join("\n")
      );
    });

    it("should remove every line from a text", () => {
      expect(LineDiffHelper.unified("a\nb", "")).toEqual(
        ["@@ -1,2 +0,0 @@", "-a", "-b"].join("\n")
      );
    });

    it("should list removed lines before added lines", () => {
      expect(LineDiffHelper.unified("a\nb\nc", "a\nB\nc")).toEqual(
        ["@@ -1,3 +1,3 @@", " a", "-b", "+B", " c"].join("\n")
      );
    });

    it("should limit the context around each change", () => {
      const before = Array.from({ length: 10 }, (_, i) => `${i}`);
      const after = before.map((line) => (line === "5" ? "five" : line));

      expect(
        LineDiffHelper.unified(before.join("\n"), after.join("\n"), {
          context: 1,
        })
      ).toEqual(["@@ -5,3 +5,3 @@", " 4", "-5", "+five", " 6"].join("\n"));
    });

    it("should merge changes separated by up to two contexts of lines", () => {
      const before = Array.from({ length: 10 }, (_, i) => `${i}`);
      const merged = before.map((line) =>
        line === "2" || line === "5" ? "x" : line
      );
      const split = before.map((line) =>
        line === "2" || line === "6" ? "x" : line
      );

      expect(
        LineDiffHelper.unified(before.join("\n"), merged.join("\n"), {
          context: 1,
        })
      ).toEqual(
        [
          "@@ -2,6 +2,6 @@",
          " 1",
          "-2",
          "+x",
          " 3",
          " 4",
          "-5",
          "+x",
          " 6",
        ].join("\n")
      );
      expect(
        LineDiffHelper.unified(before.join("\n"), split.join("\n"), {
          context: 1,
        })
      ).toEqual(
        [
          "@@ -2,3 +2,3 @@",
          " 1",
          "-2",
          "+x",
          " 3",
          "@@ -6,3 +6,3 @@",
          " 5",
          "-6",
          "+x",
          " 7",
        ].join("\n")
      );
    });

    it("should return undefined when the diff does not complete in time", () => {
      const before = Array.from({ length: 100 }, (_, i) => `${i}`);
      const after = [...before].reverse();

      expect(
        LineDiffHelper.unified(before.join("\n"), after.join("\n"), {
          timeout: 0,
        })
      ).toBeUndefined();
    });

    it("should return a shortest diff that turns before into after", () => {
      let seed = 1;
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      const randomLines = () =>
        Array.from(
          { length: Math.floor(random() * 30) },
          () => ["a", "b", "c", "d", ""][Math.floor(random() * 5)]
        );

      for (let run = 0; run < 500; run++) {
        const a = randomLines();
        const b = randomLines();
        const toText = (list: string[]) =>
          list.map((line) => `${line}\n`).join("");
        const lines = (
          LineDiffHelper.unified(toText(a), toText(b), {
            context: Infinity,
          }) ?? ""
        )
          .split("\n")
          .filter((line) => line && !line.startsWith("@@"));

        const changes = lines.filter((line) => line[0] !== " ").length;
        const before = lines
          .filter((line) => line[0] !== "+")
          .map((line) => line.slice(1));
        const after = lines
          .filter((line) => line[0] !== "-")
          .map((line) => line.slice(1));

        // A diff of identical lines has no hunks to rebuild from.
        if (lines.length === 0) {
          expect(a).toEqual(b);
          continue;
        }
        expect(before).toEqual(a);
        expect(after).toEqual(b);
        expect(changes).toEqual(a.length + b.length - 2 * lcsLength(a, b));
      }
    });
  });
});
