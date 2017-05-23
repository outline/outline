/* eslint-disable */
import Collection from './Collection';

jest.mock('utils/ApiClient', () => ({
  client: { post: {} },
}));
jest.mock('stores', () => ({ errors: {} }));

describe('Collection model', () => {
  test('should initialize with data', () => {
    const collection = new Collection({
      id: 123,
      name: 'Engineering',
    });
    expect(collection.name).toBe('Engineering');
  });

  describe('#update', () => {
    test('should update', async () => {
      const collection = new Collection({
        id: 123,
        name: 'Engineering',
      });
      collection.client = {
        post: jest.fn(() => ({
          data: {
            name: 'New collection',
          },
        })),
      };

      await collection.update();

      expect(collection.client.post).toHaveBeenCalledWith('/collections.info', {
        id: 123,
      });
      expect(collection.name).toBe('New collection');
    });

    test('should report errors', async () => {
      const collection = new Collection({
        id: 123,
      });
      collection.client = {
        post: jest.fn(() => Promise.reject),
      };
      collection.errors = {
        add: jest.fn(),
      };

      await collection.update();

      expect(collection.errors.add).toHaveBeenCalledWith(
        'Collection failed loading'
      );
    });
  });
});
