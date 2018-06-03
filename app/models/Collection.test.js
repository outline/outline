/* eslint-disable */
import Collection from './Collection';
const { client } = require('utils/ApiClient');

describe('Collection model', () => {
  test('should initialize with data', () => {
    const collection = new Collection({
      id: 123,
      name: 'Engineering',
    });
    expect(collection.name).toBe('Engineering');
  });

  describe('#fetch', () => {
    test('should update data', async () => {
      client.post = jest.fn(() => ({
        data: {
          name: 'New collection',
        },
      }))

      const collection = new Collection({
        id: 123,
        name: 'Engineering',
      });

      await collection.fetch();
      expect(client.post).toHaveBeenCalledWith('/collections.info', { id: 123 });
      expect(collection.name).toBe('New collection');
    });
  });
});
