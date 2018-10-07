/* eslint-disable flowtype/require-valid-file-annotation */
import { flushdb } from '../test/support';
import { buildDocument } from '../test/factories';

beforeEach(flushdb);
beforeEach(jest.resetAllMocks);

describe('#save', () => {
  test('should save the document', async () => {
    const text = `
# Title
This is some text
`;
    const document = await buildDocument({
      text,
    });
    expect(document.text).toBe(text);
  });

  test('should save hashtags in the document', async () => {
    const text = `
# Title
This is a #hashtag and so is #this
`;
    const document = await buildDocument({
      text,
    });
    expect(document.tags.length).toBe(2);
    expect(document.tags[0].name).toBe('#hashtag');
    expect(document.tags[1].name).toBe('#this');
  });

  test('should update hashtags in the document', async () => {
    const text = `
# Title
This is a #hashtag and so is #this
`;
    const document = await buildDocument({
      text,
    });

    document.text = "This is a #hashtag and it's the only one";
    await document.save();

    expect(document.tags.length).toBe(1);
    expect(document.tags[0].name).toBe('#hashtag');
  });
});
