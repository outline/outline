/* eslint-disable */
import stores from "~/stores";

describe('Collection model', () => {
  test('should initialize with data', () => {
    const collection = stores.collections.add({
      id: "123",
      name: 'Engineering'
    });
    expect(collection.name).toBe('Engineering');
  });
});