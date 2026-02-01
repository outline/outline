import { createContext } from "@server/context";
import { sequelize } from "@server/storage/database";
import {
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import documentDuplicator from "./documentDuplicator";

describe("documentDuplicator", () => {
  it("should duplicate existing document", async () => {
    const user = await buildUser();
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const response = await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        document: original,
        collection: original.collection,
      })
    );

    expect(response).toHaveLength(1);
    expect(response[0].title).toEqual(original.title);
    expect(response[0].text).toEqual(original.text);
    expect(response[0].icon).toEqual(original.icon);
    expect(response[0].color).toEqual(original.color);
    expect(response[0].publishedAt).toBeInstanceOf(Date);
  });

  it("should duplicate document with title override", async () => {
    const user = await buildUser();
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      icon: "👋",
    });

    const response = await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        document: original,
        collection: original.collection,
        title: "New title",
      })
    );

    expect(response).toHaveLength(1);
    expect(response[0].title).toEqual("New title");
    expect(response[0].text).toEqual(original.text);
    expect(response[0].icon).toEqual(original.icon);
    expect(response[0].color).toEqual(original.color);
    expect(response[0].publishedAt).toBeInstanceOf(Date);
  });

  it("should duplicate child documents, in the correct order with recursive=true", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });

    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      icon: "👋",
      title: "doc 1",
      collectionId: collection.id,
    });

    const child1 = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      parentDocumentId: original.id,
      title: "doc 1.1",
    });

    const child2 = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      parentDocumentId: original.id,
      title: "doc 1.2",
    });

    const child3 = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      parentDocumentId: original.id,
      title: "doc 1.3",
    });

    await collection.addDocumentToStructure(original);
    await collection.addDocumentToStructure(child1);
    await collection.addDocumentToStructure(child2);
    await collection.addDocumentToStructure(child3);

    await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        title: "duplicate",
        document: original,
        collection: original.collection,
        recursive: true,
      })
    );

    await collection.reload();
    const duplicate = collection.documentStructure![0];
    const childTitles = duplicate.children!.map((child) => child.title);

    expect(duplicate.title).toEqual("duplicate");
    expect(childTitles.length).toBe(3);
    expect(childTitles[0]).toBe(child1.title);
    expect(childTitles[1]).toBe(child2.title);
    expect(childTitles[2]).toBe(child3.title);
  });

  it("should duplicate existing document as draft", async () => {
    const user = await buildUser();
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const response = await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        document: original,
        collection: original.collection,
        publish: false,
      })
    );

    expect(response).toHaveLength(1);
    expect(response[0].title).toEqual(original.title);
    expect(response[0].text).toEqual(original.text);
    expect(response[0].icon).toEqual(original.icon);
    expect(response[0].color).toEqual(original.color);
    expect(response[0].publishedAt).toBeNull();
  });

  it("should set originalDocumentId in sourceMetadata when duplicating", async () => {
    const user = await buildUser();
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      sourceMetadata: { fileName: "test.md", externalId: "ext123" },
    });

    const response = await sequelize.transaction((transaction) =>
      documentDuplicator(createContext({ user, transaction }), {
        document: original,
        collection: original.collection,
      })
    );

    expect(response).toHaveLength(1);
    expect(response[0].sourceMetadata).toEqual({
      fileName: "test.md",
      externalId: "ext123",
      originalDocumentId: original.id,
    });
  });

  it("should set originalDocumentId for child documents when duplicating recursively", async () => {
    const user = await buildUser();
    const original = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const childDocument = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      parentDocumentId: original.id,
      collection: original.collection,
      sourceMetadata: { fileName: "child.md" },
    });

    const response = await sequelize.transaction((transaction) =>
      documentDuplicator(createContext({ user, transaction }), {
        document: original,
        collection: original.collection,
        recursive: true,
      })
    );

    expect(response).toHaveLength(2);

    // Check parent document
    const duplicatedParent = response.find((doc) => !doc.parentDocumentId);
    expect(duplicatedParent?.sourceMetadata?.originalDocumentId).toEqual(
      original.id
    );

    // Check child document
    const duplicatedChild = response.find((doc) => doc.parentDocumentId);
    expect(duplicatedChild?.sourceMetadata?.originalDocumentId).toEqual(
      childDocument.id
    );
    expect(duplicatedChild?.sourceMetadata?.fileName).toEqual("child.md");
  });

  it("should remap internal relative links within duplicated tree (parent↔child, sibling↔sibling) and keep absolute links unchanged", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });

    // Tree:
    // parent
    // ├── childA
    // └── childB
    const parent = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      title: "Parent",
      collectionId: collection.id,
    });

    const childA = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      title: "Child A",
      parentDocumentId: parent.id,
      collectionId: collection.id,
    });

    const childB = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      title: "Child B",
      parentDocumentId: parent.id,
      collectionId: collection.id,
    });

    await collection.addDocumentToStructure(parent);
    await collection.addDocumentToStructure(childA);
    await collection.addDocumentToStructure(childB);

    const oldParentUrlId = parent.urlId;
    const oldBUrlId = childB.urlId;

    const absoluteLink = "https://example.com/some/page?x=1#anchor";

    const pm = (...paragraphs: any[]) => ({
      type: "doc",
      content: paragraphs,
    });

    const pLink = (href: string) => ({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "link",
          marks: [{ type: "link", attrs: { href } }],
        },
      ],
    });

    // parent -> childB + absolute link (absolute must remain unchanged)
    await parent.update({
      content: pm(
        pLink(`/doc/child-b-${oldBUrlId}?x=1#h-b`),
        pLink(absoluteLink)
      ),
    });

    // childA -> parent + sibling childA -> childB + absolute link
    await childA.update({
      content: pm(
        pLink(`/doc/parent-${oldParentUrlId}#h-top`),
        pLink(`/doc/child-b-${oldBUrlId}#h-sib`),
        pLink(absoluteLink)
      ),
    });

    // childB: no child->parent scenario (not needed)
    await childB.update({
      content: pm(pLink(absoluteLink)),
    });

    const duplicated = await withAPIContext(user, (ctx) =>
      documentDuplicator(ctx, {
        document: parent,
        collection: parent.collection,
        recursive: true,
      })
    );

    const dupParent = duplicated.find(
      (d) => d.sourceMetadata?.originalDocumentId === parent.id
    )!;
    const dupA = duplicated.find(
      (d) => d.sourceMetadata?.originalDocumentId === childA.id
    )!;
    const dupB = duplicated.find(
      (d) => d.sourceMetadata?.originalDocumentId === childB.id
    )!;

    const collectHrefs = (pmJson: any) => {
      const hrefs: string[] = [];

      const walk = (n: any) => {
        if (!n) {
          return;
        }

        if (Array.isArray(n)) {
          n.forEach(walk);
          return;
        }

        if (typeof n !== "object") {
          return;
        }

        if (n.marks) {
          for (const m of n.marks) {
            if (m.type === "link" && m.attrs?.href) {
              hrefs.push(m.attrs.href);
            }
          }
        }

        if (n.content) {
          walk(n.content);
        }
      };

      walk(pmJson);
      return hrefs;
    };

    const parentHrefs = collectHrefs(dupParent.content);
    const aHrefs = collectHrefs(dupA.content);

    // parent -> childB remapped
    expect(parentHrefs).toContain(`/doc/child-b-${dupB.urlId}?x=1#h-b`);

    // childA -> parent remapped
    expect(aHrefs).toContain(`/doc/parent-${dupParent.urlId}#h-top`);

    // sibling: childA -> childB remapped
    expect(aHrefs).toContain(`/doc/child-b-${dupB.urlId}#h-sib`);

    // absolute link unchanged (parent + child)
    expect(parentHrefs).toContain(absoluteLink);
    expect(aHrefs).toContain(absoluteLink);

    // old relative links should be gone FROM HREFS
    const allHrefs = [...parentHrefs, ...aHrefs].join("\n");
    expect(allHrefs).not.toContain(`/doc/child-b-${oldBUrlId}`);
    expect(allHrefs).not.toContain(`/doc/parent-${oldParentUrlId}`);
  });
});