/* eslint-disable flowtype/require-valid-file-annotation */
import { flushdb } from '../test/support';
import { buildCollection, buildUser } from '../test/factories';
import { Document } from '../models';

beforeEach(flushdb);
beforeEach(jest.resetAllMocks);

describe('#save', () => {
  test('should save the document', async () => {
    const user = await buildUser();
    const collection = await buildCollection();
    const text = `
# Title
This is some text
`;
    let document = await Document.create({
      collectionId: collection.id,
      teamId: user.teamId,
      userId: user.id,
      lastModifiedById: user.id,
      createdById: user.id,
      title: 'Title',
      text,
    });
    expect(document.text).toBe(text);
  });

  test('should save hashtags in the document', async () => {
    const user = await buildUser();
    const collection = await buildCollection();
    const text = `
# Title
This is a #hashtag and so is #this
`;
    let document = await Document.create({
      collectionId: collection.id,
      teamId: user.teamId,
      userId: user.id,
      lastModifiedById: user.id,
      createdById: user.id,
      title: 'Title',
      text,
    });
    expect(document.tags[0].name).toBe('#hashtag');
    expect(document.tags[1].name).toBe('#this');
  });
});
