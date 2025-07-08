function defaultCmp(a: number, b: number) {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

function add(
  list: unknown[],
  value: unknown,
  cmp?: (a: unknown, b: unknown) => -1 | 0 | 1
) {
  if (!cmp) {
    cmp = defaultCmp;
  }

  let top = list.push(value) - 1;

  while (top) {
    if (cmp(list[top - 1], value) < 0) {
      return;
    }
    list[top] = list[top - 1];
    list[top - 1] = value;
    top--;
  }
}

function gt(
  list: unknown[],
  value: unknown,
  cmp?: (a: unknown, b: unknown) => -1 | 0 | 1
) {
  if (!cmp) {
    cmp = defaultCmp;
  }

  let i = indexOf(list, value, cmp);
  if (i === -1) {
    return -1;
  }

  for (; i < list.length; i++) {
    const c = cmp(list[i], value);
    if (c > 0) {
      return i;
    }
  }

  return -1;
}

function indexOf(
  list: unknown[],
  value: unknown,
  cmp?: (a: unknown, b: unknown) => -1 | 0 | 1
) {
  if (!cmp) {
    cmp = defaultCmp;
  }

  const len = list.length;
  let top = len - 1;
  let btm = 0;
  let mid = -1;

  while (top >= btm && btm >= 0 && top < len) {
    mid = Math.floor((top + btm) / 2);

    const c = cmp(list[mid], value);
    if (c === 0) {
      return mid;
    }

    if (c >= 0) {
      top = mid - 1;
    } else {
      btm = mid + 1;
    }
  }

  return mid;
}

export default {
  add,
  gt,
};
