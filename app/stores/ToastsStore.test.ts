/* eslint-disable */
import stores from ".";
// Actions
describe('ToastsStore', () => {
  // @ts-expect-error ts-migrate(7034) FIXME: Variable 'store' implicitly has type 'any' in some... Remove this comment to see the full error message
  let store;
  beforeEach(() => {
    store = stores.toasts;
  });
  test('#add should add messages', () => {
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'store' implicitly has an 'any' type.
    expect(store.orderedData.length).toBe(0);
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'store' implicitly has an 'any' type.
    store.showToast('first error');
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'store' implicitly has an 'any' type.
    store.showToast('second error');
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'store' implicitly has an 'any' type.
    expect(store.orderedData.length).toBe(2);
  });
  test('#remove should remove messages', () => {
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'store' implicitly has an 'any' type.
    store.toasts.clear();
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'store' implicitly has an 'any' type.
    const id = store.showToast('first error');
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'store' implicitly has an 'any' type.
    store.showToast('second error');
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'store' implicitly has an 'any' type.
    expect(store.orderedData.length).toBe(2);
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'store' implicitly has an 'any' type.
    store.hideToast(id);
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'store' implicitly has an 'any' type.
    expect(store.orderedData.length).toBe(1);
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'store' implicitly has an 'any' type.
    expect(store.orderedData[0].message).toBe('second error');
  });
});