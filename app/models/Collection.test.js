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
});
