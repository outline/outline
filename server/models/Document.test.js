/* eslint-disable flowtype/require-valid-file-annotation */
import { flushdb } from '../test/support';
import { buildDocument } from '../test/factories';

beforeEach(flushdb);
beforeEach(jest.resetAllMocks);

describe('#getSummary', () => {
  test('should strip markdown', async () => {
    const document = await buildDocument({
      version: 1,
      text: `*paragraph*

paragraph 2`,
    });

    expect(document.getSummary()).toBe('paragraph');
  });

  test('should strip title when no version', async () => {
    const document = await buildDocument({
      version: null,
      text: `# Heading
      
*paragraph*`,
    });

    expect(document.getSummary()).toBe('paragraph');
  });
});

describe('#migrateVersion', () => {
  test('should maintain empty paragraph under headings', async () => {
    const document = await buildDocument({
      version: 1,
      text: `# Heading

paragraph`,
    });
    await document.migrateVersion();
    expect(document.text).toBe(`# Heading

paragraph`);
  });

  test('should add breaks under headings with extra paragraphs', async () => {
    const document = await buildDocument({
      version: 1,
      text: `# Heading


paragraph`,
    });
    await document.migrateVersion();
    expect(document.text).toBe(`# Heading


\\
paragraph`);
  });

  test('should add breaks between paragraphs', async () => {
    const document = await buildDocument({
      version: 1,
      text: `paragraph

paragraph`,
    });
    await document.migrateVersion();
    expect(document.text).toBe(`paragraph

\\
paragraph`);
  });

  test('should add breaks for multiple empty paragraphs', async () => {
    const document = await buildDocument({
      version: 1,
      text: `paragraph


paragraph`,
    });
    await document.migrateVersion();
    expect(document.text).toBe(`paragraph

\\
\\
paragraph`);
  });

  test('should update task list formatting', async () => {
    const document = await buildDocument({
      version: 1,
      text: `[ ] list item`,
    });
    await document.migrateVersion();
    expect(document.text).toBe(`- [ ] list item`);
  });

  test('should update task list with multiple items', async () => {
    const document = await buildDocument({
      version: 1,
      text: `[ ] list item
[ ] list item 2`,
    });
    await document.migrateVersion();
    expect(document.text).toBe(`- [ ] list item
- [ ] list item 2`);
  });

  test('should update checked task list formatting', async () => {
    const document = await buildDocument({
      version: 1,
      text: `[x] list item`,
    });
    await document.migrateVersion();
    expect(document.text).toBe(`- [x] list item`);
  });

  test('should update nested task list formatting', async () => {
    const document = await buildDocument({
      version: 1,
      text: `[x] list item
  [ ] list item
    [X] list item`,
    });
    await document.migrateVersion();
    expect(document.text).toBe(`- [x] list item
  - [ ] list item
    - [X] list item`);
  });
});
