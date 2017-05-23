/* eslint-disable */
import ErrorsStore from './ErrorsStore';

// Actions
describe('ErrorsStore', () => {
  let store;

  beforeEach(() => {
    store = new ErrorsStore();
  });

  test('#add should add errors', () => {
    expect(store.errors.length).toBe(0);
    store.add('first error');
    store.add('second error');
    expect(store.errors.length).toBe(2);
  });

  test('#remove should remove errors', () => {
    store.add('first error');
    store.add('second error');
    expect(store.errors.length).toBe(2);
    store.remove(0);
    expect(store.errors.length).toBe(1);
    expect(store.errors[0]).toBe('second error');
  });
});
