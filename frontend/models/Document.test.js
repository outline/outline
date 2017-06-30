/* eslint-disable */
import Document from './Document';

describe('Document model', () => {
  test('should initialize with data', () => {
    const document = new Document({
      id: 123,
      title: 'Onboarding',
      text: 'Some body text'
    });
    expect(document.title).toBe('Onboarding');
  });
});
