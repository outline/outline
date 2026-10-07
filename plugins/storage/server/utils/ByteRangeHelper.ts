/** A resolved byte range, inclusive at both ends. */
export interface ByteRange {
  start: number;
  end: number;
}

export class ByteRangeHelper {
  /** Returned when the requested range lies entirely outside of the file. */
  static readonly unsatisfiable: unique symbol = Symbol("unsatisfiable");

  /**
   * Parses a single byte range from a Range header, resolved against the size
   * of the file being requested.
   *
   * @param header The value of the Range header, if any.
   * @param size The size of the file in bytes.
   * @returns The range to serve, `unsatisfiable` if it lies outside of the
   * file, or undefined if the entire file should be served.
   */
  static parse(
    header: string | undefined,
    size: number
  ): ByteRange | typeof ByteRangeHelper.unsatisfiable | undefined {
    if (!header) {
      return;
    }

    // Only a single range is supported, requests for multiple ranges are
    // served in full instead.
    const match = header.trim().match(/^bytes=(\d*)-(\d*)$/);
    if (!match) {
      return;
    }

    const [, first, last] = match;

    if (size === 0) {
      return this.unsatisfiable;
    }

    // A range with no start requests the final N bytes of the file.
    if (first === "") {
      const suffixLength = parseInt(last, 10);
      if (isNaN(suffixLength)) {
        return;
      }
      if (suffixLength === 0) {
        return this.unsatisfiable;
      }
      return { start: Math.max(size - suffixLength, 0), end: size - 1 };
    }

    const start = parseInt(first, 10);
    if (start >= size) {
      return this.unsatisfiable;
    }

    // A range with no end, or one that runs past the file, ends at the last
    // byte.
    const end = last === "" ? size - 1 : Math.min(parseInt(last, 10), size - 1);
    if (end < start) {
      return this.unsatisfiable;
    }

    return { start, end };
  }
}
