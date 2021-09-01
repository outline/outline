/* eslint-disable */
import stores from '.';

// Actions
describe('ToastsStore', () => {
  let store;

  beforeEach(() => {
    store = stores.toasts;
  });

  test('#add should add messages', () => {
    expect(store.orderedData.length).toBe(0);
    store.showToast('first error');
    store.showToast('second error');
    expect(store.orderedData.length).toBe(2);
  });

  test('#remove should remove messages', () => {
    store.toasts.clear();
    const id = store.showToast('first error');
    store.showToast('second error');
    expect(store.orderedData.length).toBe(2);
    store.hideToast(id);
    expect(store.orderedData.length).toBe(1);
    expect(store.orderedData[0].message).toBe('second error');
  });
});
