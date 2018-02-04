/* eslint-disable */
import CollectionsStore from './CollectionsStore';
const { client } = require('utils/ApiClient');

describe('CollectionsStore', () => {
  let store;

  beforeEach(() => {
    store = new CollectionsStore({});
  });

  describe('#fetchPage', () => {
    test('should load stores', async () => {
      client.post = jest.fn(() => ({
        data: [
          {
            id: 123,
            name: 'New collection',
          },
        ],
      }))

      await store.fetchPage();

      expect(client.post).toHaveBeenCalledWith('/collections.list', undefined);
      expect(store.data.size).toBe(1);
      expect(store.data.values()[0].name).toBe('New collection');
    });

    test('should report errors', async () => {
      client.post = jest.fn(() => Promise.reject())
      store.errors = {
        add: jest.fn(),
      };

      await store.fetchPage();

      expect(store.errors.add).toHaveBeenCalledWith(
        'Failed to load collections'
      );
    });
  });
});
