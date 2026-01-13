import { isDeepStrictEqual } from "util";
import type { Pointer } from "./pointer";
import { hasOwnProperty, objectType } from "./util";

/**
 * All diff* functions should return a list of operations, often empty.
 *
 * Each operation should be an object with two to four fields:
 * - `op`: the name of the operation; one of "add", "remove", "replace", "move",
 *   "copy", or "test".
 * - `path`: a JSON pointer string
 * - `from`: a JSON pointer string
 * - `value`: a JSON value
 *
 * The different operations have different arguments.
 * - "add": [`path`, `value`]
 * - "remove": [`path`]
 * - "replace": [`path`, `value`]
 * - "move": [`from`, `path`]
 * - "copy": [`from`, `path`]
 * - "test": [`path`, `value`]
 *
 * Currently this only really differentiates between Arrays, Objects, and
 * Everything Else, which is pretty much just what JSON substantially
 * differentiates between.
 */

export interface AddOperation {
  op: "add";
  path: string;
  value: unknown;
}
export interface RemoveOperation {
  op: "remove";
  path: string;
}
export interface ReplaceOperation {
  op: "replace";
  path: string;
  value: unknown;
}
export interface MoveOperation {
  op: "move";
  from: string;
  path: string;
}
export interface CopyOperation {
  op: "copy";
  from: string;
  path: string;
}
export interface TestOperation {
  op: "test";
  path: string;
  value: unknown;
}

export type Operation =
  | AddOperation
  | RemoveOperation
  | ReplaceOperation
  | MoveOperation
  | CopyOperation
  | TestOperation;

export function isDestructive({ op }: Operation): boolean {
  return op === "remove" || op === "replace" || op === "copy" || op === "move";
}

export type Diff = (
  input: unknown,
  output: unknown,
  ptr: Pointer
) => Operation[];
/**
 * VoidableDiff exists to allow the user to provide a partial diff(...) function,
 * falling back to the built-in diffAny(...) function if the user-provided function
 * returns void.
 */
export type VoidableDiff = (
  input: unknown,
  output: unknown,
  ptr: Pointer
) => Operation[] | void;

/**
 * List the keys in `minuend` that are not in `subtrahend`.
 *
 * A key is only considered if it is both 1) an own-property (o.hasOwnProperty(k))
 * of the object, and 2) has a value that is not undefined. This is to match JSON
 * semantics, where JSON object serialization drops keys with undefined values.
 *
 * @param minuend - object of interest.
 * @param subtrahend - object of comparison.
 * @returns array of keys that are in `minuend` but not in `subtrahend`.
 */
export function subtract(
  minuend: { [index: string]: unknown },
  subtrahend: { [index: string]: unknown }
): string[] {
  // initialize empty object; we only care about the keys, the values can be anything
  const obj: { [index: string]: number } = {};
  // build up obj with all the properties of minuend
  for (const add_key in minuend) {
    if (
      hasOwnProperty.call(minuend, add_key) &&
      minuend[add_key] !== undefined
    ) {
      obj[add_key] = 1;
    }
  }
  // now delete all the properties of subtrahend from obj
  // (deleting a missing key has no effect)
  for (const del_key in subtrahend) {
    if (
      hasOwnProperty.call(subtrahend, del_key) &&
      subtrahend[del_key] !== undefined
    ) {
      delete obj[del_key];
    }
  }
  // finally, extract whatever keys remain in obj
  return Object.keys(obj);
}

/**
 * List the keys that shared by all `objects`.
 *
 * The semantics of what constitutes a "key" is described in subtract.
 *
 * @param objects - array of objects to compare.
 * @returns array of keys that are in ("own-properties" of) every object in `objects`.
 */
export function intersection(
  objects: ArrayLike<{ [index: string]: unknown }>
): string[] {
  const length = objects.length;
  // prepare empty counter to keep track of how many objects each key occurred in
  const counter: { [index: string]: number } = {};
  // go through each object and increment the counter for each key in that object
  for (let i = 0; i < length; i++) {
    const object = objects[i];
    for (const key in object) {
      if (hasOwnProperty.call(object, key) && object[key] !== undefined) {
        counter[key] = (counter[key] || 0) + 1;
      }
    }
  }
  // now delete all keys from the counter that were not seen in every object
  for (const key in counter) {
    if (counter[key] < length) {
      delete counter[key];
    }
  }
  // finally, extract whatever keys remain in the counter
  return Object.keys(counter);
}

interface ArrayAdd {
  op: "add";
  index: number;
  value: unknown;
}
interface ArrayRemove {
  op: "remove";
  index: number;
}
interface ArrayReplace {
  op: "replace";
  index: number;
  original: unknown;
  value: unknown;
}
/** These are not proper Operation objects, but will be converted into
Operation objects eventually. {index} indicates the actual target position,
never 'end-of-array' */
type ArrayOperation = ArrayAdd | ArrayRemove | ArrayReplace;
function isArrayAdd(
  array_operation: ArrayOperation
): array_operation is ArrayAdd {
  return array_operation.op === "add";
}
function isArrayRemove(
  array_operation: ArrayOperation
): array_operation is ArrayRemove {
  return array_operation.op === "remove";
}

interface DynamicAlternative {
  /**
   * track prev key position for less memory usage
   */
  prev: string | null;
  operation: ArrayOperation | null;
  /**
   * cost indicates the total cost of getting to this position.
   */
  cost: number;
}

function buildOperations(
  memo: Array<Array<DynamicAlternative>>,
  i: number,
  j: number
) {
  let memoized: DynamicAlternative = memo[i][j];
  if (!memoized) {
    throw new Error("invalid memo");
  }
  const operations: ArrayOperation[] = [];
  while (memoized && memoized.prev && memoized.operation) {
    operations.push(memoized.operation);
    const index = memoized.prev.split(",");
    memoized = memo[Number(index[0])][Number(index[1])];
  }
  return operations.reverse();
}

/**
 * Calculate the shortest sequence of operations to get from `input` to `output`,
 * using a dynamic programming implementation of the Levenshtein distance algorithm.
 *
 * To get from the input ABC to the output AZ we could just delete all the input
 * and say "insert A, insert Z" and be done with it. That's what we do if the
 * input is empty. But we can be smarter.
 *
 *           output
 *                A   Z
 *                -   -
 *           [0]  1   2
 * input A |  1  [0]  1
 *       B |  2  [1]  1
 *       C |  3   2  [2]
 *
 * 1) start at 0,0 (+0)
 * 2) keep A (+0)
 * 3) remove B (+1)
 * 4) replace C with Z (+1)
 *
 * If the `input` (source) is empty, they'll all be in the top row, resulting in an
 * array of 'add' operations.
 * If the `output` (target) is empty, everything will be in the left column,
 * resulting in an array of 'remove' operations.
 *
 * @returns a list of add/remove/replace operations.
 */
export function diffArrays<T>(
  input: T[],
  output: T[],
  ptr: Pointer,
  diff: Diff = diffAny
): Operation[] {
  // set up cost matrix (very simple initialization: just a map)
  const input_length =
    isNaN(input.length) || input.length <= 0 ? 0 : input.length;
  const output_length =
    isNaN(output.length) || output.length <= 0 ? 0 : output.length;
  let input_end = input_length;
  let output_end = output_length;
  while (input_end > 0 && output_end > 0) {
    // accelerate same arrays
    if (isDeepStrictEqual(input[input_end - 1], output[output_end - 1])) {
      input_end--;
      output_end--;
    } else {
      break;
    }
  }
  const memo: Array<Array<DynamicAlternative>> = new Array(input_end + 1);
  for (let i = 0; i <= input_end; i++) {
    memo[i] = new Array(output_end + 1);
  }
  memo[0][0] = { prev: null, operation: null, cost: 0 };
  /**
   * Calculate the cheapest sequence of operations required to get from
   * input.slice(0, i) to output.slice(0, j).
   * There may be other valid sequences with the same cost, but none cheaper.
   *
   * @param i The row in the layout above
   * @param j The column in the layout above
   * @returns An object containing a list of operations, along with the total cost
   *          of applying them (+1 for each add/remove/replace operation)
   */
  // handle weird objects masquerading as Arrays that don't have proper length
  // properties by using 0 for everything but positive numbers
  for (let i = 0; i <= input_end; i++) {
    for (let j = 0; j <= output_end; j++) {
      let memoized = memo[i][j];
      if (memoized) {
        continue;
      }
      const add_prev_key = `${i},${j - 1}`;
      const remove_prev_key = `${i - 1},${j}`;
      const replace_prev_key = `${i - 1},${j - 1}`;
      const remove_operation: ArrayRemove = {
        op: "remove",
        index: i - 1,
      };
      const add_operation: ArrayAdd = {
        op: "add",
        index: i - 1,
        value: output[j - 1],
      };

      if (j === 0) {
        memoized = {
          prev: remove_prev_key,
          operation: remove_operation,
          cost: memo[i - 1][j].cost + 1,
        };
      } else if (i === 0) {
        memoized = {
          prev: add_prev_key,
          operation: add_operation,
          cost: memo[i][j - 1].cost + 1,
        };
      } else {
        if (isDeepStrictEqual(input[i - 1], output[j - 1])) {
          memoized = memo[i - 1][j - 1];
        } else {
          const remove_prev = memo[i - 1][j];
          const add_prev = memo[i][j - 1];
          const replace_prev = memo[i - 1][j - 1];
          const min_cost = Math.min(
            replace_prev.cost,
            add_prev.cost,
            remove_prev.cost
          );
          if (remove_prev.cost === min_cost) {
            memoized = {
              prev: remove_prev_key,
              operation: remove_operation,
              cost: memo[i - 1][j].cost + 1,
            };
          } else if (add_prev.cost === min_cost) {
            memoized = {
              prev: add_prev_key,
              operation: add_operation,
              cost: memo[i][j - 1].cost + 1,
            };
          } else {
            const replace_operation: ArrayReplace = {
              op: "replace",
              index: i - 1,
              original: input[i - 1],
              value: output[j - 1],
            };
            memoized = {
              prev: replace_prev_key,
              operation: replace_operation,
              cost: memo[i - 1][j - 1].cost + 1,
            };
          }
        }
      }
      memo[i][j] = memoized;
    }
  }
  const array_operations = buildOperations(memo, input_end, output_end);
  const [padded_operations] = array_operations.reduce<[Operation[], number]>(
    ([operations, padding], array_operation) => {
      if (isArrayAdd(array_operation)) {
        const padded_index = array_operation.index + 1 + padding;
        const index_token =
          padded_index < input_length + padding ? String(padded_index) : "-";
        const operation = {
          op: array_operation.op,
          path: ptr.add(index_token).toString(),
          value: array_operation.value,
        };
        // padding++ // maybe only if array_operation.index > -1 ?
        return [operations.concat(operation), padding + 1];
      } else if (isArrayRemove(array_operation)) {
        const operation = {
          op: array_operation.op,
          path: ptr.add(String(array_operation.index + padding)).toString(),
        };
        // padding--
        return [operations.concat(operation), padding - 1];
      } else {
        // replace
        const replace_ptr = ptr.add(String(array_operation.index + padding));
        const replace_operations = diff(
          array_operation.original,
          array_operation.value,
          replace_ptr
        );
        return [operations.concat(...replace_operations), padding];
      }
    },
    [[], 0]
  );
  return padded_operations;
}

export function diffObjects(
  input: Record<string, unknown>,
  output: Record<string, unknown>,
  ptr: Pointer,
  diff: Diff = diffAny
): Operation[] {
  // if a key is in input but not output -> remove it
  const operations: Operation[] = [];
  subtract(input, output).forEach((key) => {
    operations.push({ op: "remove", path: ptr.add(key).toString() });
  });
  // if a key is in output but not input -> add it
  subtract(output, input).forEach((key) => {
    operations.push({
      op: "add",
      path: ptr.add(key).toString(),
      value: output[key],
    });
  });
  // if a key is in both, diff it recursively
  intersection([input, output]).forEach((key) => {
    operations.push(...diff(input[key], output[key], ptr.add(key)));
  });
  return operations;
}

/**
 * `diffAny()` returns an empty array if `input` and `output` are materially equal
 * (i.e., would produce equivalent JSON); otherwise it produces an array of patches
 * that would transform `input` into `output`.
 *
 * > Here, "equal" means that the value at the target location and the
 * > value conveyed by "value" are of the same JSON type, and that they
 * > are considered equal by the following rules for that type:
 * > o  strings: are considered equal if they contain the same number of
 * >    Unicode characters and their code points are byte-by-byte equal.
 * > o  numbers: are considered equal if their values are numerically
 * >    equal.
 * > o  arrays: are considered equal if they contain the same number of
 * >    values, and if each value can be considered equal to the value at
 * >    the corresponding position in the other array, using this list of
 * >    type-specific rules.
 * > o  objects: are considered equal if they contain the same number of
 * >    members, and if each member can be considered equal to a member in
 * >    the other object, by comparing their keys (as strings) and their
 * >    values (using this list of type-specific rules).
 * > o  literals (false, true, and null): are considered equal if they are
 * >    the same.
 */
export function diffAny(
  input: unknown,
  output: unknown,
  ptr: Pointer,
  diff: Diff = diffAny
): Operation[] {
  // strict equality handles literals, numbers, and strings (a sufficient but not necessary cause)
  if (input === output) {
    return [];
  }
  const input_type = objectType(input);
  const output_type = objectType(output);
  if (input_type === "array" && output_type === "array") {
    return diffArrays(input as unknown[], output as unknown[], ptr, diff);
  }
  if (input_type === "object" && output_type === "object") {
    return diffObjects(
      input as Record<string, unknown>,
      output as Record<string, unknown>,
      ptr,
      diff
    );
  }
  // at this point we know that input and output are materially different;
  // could be array -> object, object -> array, boolean -> undefined,
  // number -> string, or some other combination, but nothing that can be split
  // up into multiple patches: so `output` must replace `input` wholesale.
  return [{ op: "replace", path: ptr.toString(), value: output }];
}
