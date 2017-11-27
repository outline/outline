/* eslint-disable */
import CollectionsStore from './CollectionsStore';

jest.mock('utils/ApiClient', () => ({
  client: { post: {} },
}));
jest.mock('stores', () => ({
  errors: { add: jest.fn() }
}));

describe('CollectionsStore', () => {
  let store;

  beforeEach(() => {
    store = new CollectionsStore({});
  });

  describe('#fetchAll', () => {
    test('should load stores', async () => {
      store.client = {
        post: jest.fn(() => ({
          data: [
            {
              id: 123,
              name: 'New collection',
            },
          ],
        })),
      };

      await store.fetchAll();

      expect(store.client.post).toHaveBeenCalledWith('/collections.list');
      expect(store.data.size).toBe(1);
      expect(store.data.values()[0].name).toBe('New collection');
    });

    test('should report errors', async () => {
      store.client = {
        post: jest.fn(() => Promise.reject),
      };

      await store.fetchAll();

      expect(store.errors.add).toHaveBeenCalledWith(
        'Failed to load collections'
      );
    });
  });
});
