/* eslint-disable flowtype/require-valid-file-annotation */
import getHeadingsForText from './getHeadingsForText';

it('should return an array of document headings', () => {
  const response = getHeadingsForText(`
# Header
  
## Subheading
`);

  expect(response.length).toBe(2);
  expect(response[0].level).toBe(1);
  expect(response[0].title).toBe('Header');
  expect(response[1].level).toBe(2);
  expect(response[1].title).toBe('Subheading');
});

it('should unescape special characters', () => {
  const response = getHeadingsForText(`# Header <\\>`);

  expect(response.length).toBe(1);
  expect(response[0].title).toBe('Header <>');
});
