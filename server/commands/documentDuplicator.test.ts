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

    // Optional but realistic
    await collection.addDocumentToStructure(parent);
    await collection.addDocumentToStructure(childA);
    await collection.addDocumentToStructure(childB);

    const oldParentUrlId = parent.urlId;
    const oldAUrlId = childA.urlId;
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

    const pText = (text: string) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    });

    // 1) parent -> childB (relative, with query+hash + plain text)
    await parent.update({
      content: pm(
        pLink(`/doc/child-b-${oldBUrlId}?x=1#h-b`),
        pText(`parent plain /doc/child-b-${oldBUrlId}#h-b2`)
      ),
    });

    // 2) childA -> parent (relative) + sibling childA -> childB (relative) + absolute link (must remain)
    await childA.update({
      content: pm(
        pLink(`/doc/parent-${oldParentUrlId}#h-top`),
        pText(`childA plain /doc/parent-${oldParentUrlId}?q=1#h-top2`),

        pLink(`/doc/child-b-${oldBUrlId}#h-sib`),
        pText(`sib plain /doc/child-b-${oldBUrlId}?z=9#h-sib2`),

        pLink(absoluteLink),
        pText(`external plain ${absoluteLink}`)
      ),
    });

    // 3) childB -> parent (relative, with query+hash + plain text)
    await childB.update({
      content: pm(
        pLink(`/doc/parent-${oldParentUrlId}?x=2#h-from-b`),
        pText(`childB plain /doc/parent-${oldParentUrlId}#h-from-b2`)
      ),
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

    // Collect all hrefs + text from PM JSON
    const collect = (pmJson: any) => {
      const hrefs: string[] = [];
      const texts: string[] = [];

      const walk = (n: any) => {
        if (!n) return;
        if (Array.isArray(n)) return n.forEach(walk);
        if (typeof n !== "object") return;

        if (n.marks) {
          for (const m of n.marks) {
            if (m.type === "link" && m.attrs?.href) hrefs.push(m.attrs.href);
          }
        }
        if (typeof n.text === "string") texts.push(n.text);
        if (n.content) walk(n.content);
      };

      walk(pmJson);
      return { hrefs, text: texts.join("\n") };
    };

    const cParent = collect(dupParent.content);
    const cA = collect(dupA.content);
    const cB = collect(dupB.content);

    // --- Assertions: remapped links ---

    // parent -> childB
    expect(cParent.hrefs).toContain(`/doc/child-b-${dupB.urlId}?x=1#h-b`);
    expect(cParent.text).toContain(`/doc/child-b-${dupB.urlId}#h-b2`);

    // childA -> parent
    expect(cA.hrefs).toContain(`/doc/parent-${dupParent.urlId}#h-top`);
    expect(cA.text).toContain(`/doc/parent-${dupParent.urlId}?q=1#h-top2`);

    // sibling: childA -> childB
    expect(cA.hrefs).toContain(`/doc/child-b-${dupB.urlId}#h-sib`);
    expect(cA.text).toContain(`/doc/child-b-${dupB.urlId}?z=9#h-sib2`);

    // childB -> parent
    expect(cB.hrefs).toContain(`/doc/parent-${dupParent.urlId}?x=2#h-from-b`);
    expect(cB.text).toContain(`/doc/parent-${dupParent.urlId}#h-from-b2`);

    // --- Absolute link must remain unchanged ---
    expect(cA.hrefs).toContain(absoluteLink);
    expect(cA.text).toContain(absoluteLink);

    // --- Negative checks: old relative links should be gone ---
    const all = [
      ...cParent.hrefs,
      cParent.text,
      ...cA.hrefs,
      cA.text,
      ...cB.hrefs,
      cB.text,
    ].join("\n");

    expect(all).not.toContain(`/doc/child-b-${oldBUrlId}`);
    expect(all).not.toContain(`/doc/parent-${oldParentUrlId}`);
    expect(all).not.toContain(oldAUrlId); // extra safety (shouldn’t appear at all)
  });
});