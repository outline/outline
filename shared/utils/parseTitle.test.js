/* eslint-disable flowtype/require-valid-file-annotation */
import parseTitle from './parseTitle';

it('should trim the title', () => {
  expect(parseTitle(`#    Lots of space     `).title).toBe('Lots of space');
});

it('should extract first title', () => {
  expect(parseTitle(`# Title one\n# Title two`).title).toBe('Title one');
});

it('should remove escape characters', () => {
  expect(parseTitle(`# Thing \\- one`).title).toBe('Thing - one');
  expect(parseTitle(`# \\[wip\\] Title`).title).toBe('[wip] Title');
  expect(parseTitle(`# \\> Title`).title).toBe('> Title');
});

it('should parse emoji if first character', () => {
  const parsed = parseTitle(`# 😀 Title`);
  expect(parsed.title).toBe('😀 Title');
  expect(parsed.emoji).toBe('😀');
});

it('should not parse emoji if not first character', () => {
  const parsed = parseTitle(`# Title 🌈`);
  expect(parsed.title).toBe('Title 🌈');
  expect(parsed.emoji).toBe(undefined);
});
