/* eslint-disable */
import stores from '../stores';

describe('Document model', () => {
  test('should initialize with data', () => {
    const document = stores.documents.add({
      id: 123,
      text: '# Onboarding\nSome body text',
    });
    expect(document.title).toBe('Onboarding');
  });
});
