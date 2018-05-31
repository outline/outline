/* eslint-disable */
import UiStore from './UiStore';

// Actions
describe('UiStore', () => {
  let store;

  beforeEach(() => {
    store = new UiStore();
  });

  test('#add should add errors', () => {
    expect(store.data.length).toBe(0);
    store.showToast('first error');
    store.showToast('second error');
    expect(store.toasts.length).toBe(2);
  });

  test('#remove should remove errors', () => {
    store.showToast('first error');
    store.showToast('second error');
    expect(store.toasts.length).toBe(2);
    store.removeToast(0);
    expect(store.toasts.length).toBe(1);
    expect(store.toasts[0]).toBe('second error');
  });
});
