/* eslint-disable */
import stores from '.';

// Actions
describe('UiStore', () => {
  let store;

  beforeEach(() => {
    store = stores.ui;
  });

  test('#add should add messages', () => {
    expect(store.orderedToasts.length).toBe(0);
    store.showToast('first error');
    store.showToast('second error');
    expect(store.orderedToasts.length).toBe(2);
  });

  test('#remove should remove messages', () => {
    store.toasts.clear();
    const id = store.showToast('first error');
    store.showToast('second error');
    expect(store.orderedToasts.length).toBe(2);
    store.removeToast(id);
    expect(store.orderedToasts.length).toBe(1);
    expect(store.orderedToasts[0].message).toBe('second error');
  });
});
