/* eslint-disable */
import stores from '.';

// Actions
describe('UiStore', () => {
  let store;

  beforeEach(() => {
    store = stores.ui;
  });

  test('#add should add errors', () => {
    expect(store.toasts.length).toBe(0);
    store.showToast('first error');
    store.showToast('second error');
    expect(store.toasts.length).toBe(2);
  });

  test('#remove should remove errors', () => {
    store.toasts = [];
    store.showToast('first error');
    store.showToast('second error');
    expect(store.toasts.length).toBe(2);
    store.removeToast(0);
    expect(store.toasts.length).toBe(1);
    expect(store.toasts[0].message).toBe('second error');
  });
});
