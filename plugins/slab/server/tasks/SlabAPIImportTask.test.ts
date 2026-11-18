import { randomUUID } from "node:crypto";
import type { IntegrationService } from "@shared/types";
import { Import, ImportTask } from "@server/models";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { rewriteInternalLinks } from "@server/queues/tasks/MarkdownAPIImportTask";
import type { ZipTreeNode } from "@server/utils/ZipHelper";
import SlabAPIImportTask, {
  convertSlabFileLinks,
  isSlabFileUrl,
  slugFromPostUrl,
} from "./SlabAPIImportTask";

class TestSlabAPIImportTask extends SlabAPIImportTask {
  public resolve(nodes: ZipTreeNode[]): ZipTreeNode[] {
    return this.resolveCollectionRootNodes(nodes);
  }

  public extractsTitleFromHeading(): boolean {
    return this.shouldExtractTitleFromHeading();
  }

  public resolveLink(
    href: string,
    docMap: Record<string, string>,
    label = ""
  ): string | undefined {
    return this.resolveLinkedDocument(href, label, docMap);
  }

  public page(importTask: ImportTask<IntegrationService.Markdown>) {
    return this.processPage(importTask);
  }
}

const dir = (
  title: string,
  children: ZipTreeNode[] = [],
  pathInZip = title
): ZipTreeNode => ({
  name: title,
  title,
  pathInZip,
  children,
});

const file = (name: string, pathInZip = name): ZipTreeNode => ({
  name,
  title: name.replace(/\.[^.]+$/, ""),
  pathInZip,
  children: [],
});

const signedFileUrl =
  "https://slabstatic.com/prod/uploads/8807b6f8/posts/files/AbC123.pdf?jwt=eyJhbGciOiJSUzI1NiJ9.signed";

describe("SlabAPIImportTask#resolveCollectionRootNodes", () => {
  const task = new TestSlabAPIImportTask();

  it("unwraps a single root 'slab' directory into its children", () => {
    const eng = dir(
      "Engineering",
      [file("doc.md", "slab/Engineering/doc.md")],
      "slab/Engineering"
    );
    const product = dir(
      "Product",
      [file("spec.md", "slab/Product/spec.md")],
      "slab/Product"
    );
    const root = dir("slab", [eng, product], "slab");

    expect(task.resolve([root])).toEqual([eng, product]);
  });

  it("is case-insensitive on the wrapper directory name", () => {
    const child = dir("Team", [file("a.md", "Slab/Team/a.md")], "Slab/Team");
    const root = dir("Slab", [child], "Slab");

    expect(task.resolve([root])).toEqual([child]);
  });

  it("leaves multiple root directories untouched", () => {
    const a = dir("Engineering", [file("a.md", "Engineering/a.md")]);
    const b = dir("slab", [file("b.md", "slab/b.md")]);

    expect(task.resolve([a, b])).toEqual([a, b]);
  });

  it("leaves a single non-'slab' root directory untouched", () => {
    const a = dir("Engineering", [file("doc.md", "Engineering/doc.md")]);

    expect(task.resolve([a])).toEqual([a]);
  });

  it("does not unwrap an empty 'slab' directory", () => {
    const root = dir("slab", []);

    expect(task.resolve([root])).toEqual([root]);
  });

  it("does not derive the title from a document's leading heading", () => {
    expect(task.extractsTitleFromHeading()).toBe(false);
  });
});

describe("slugFromPostUrl", () => {
  it("strips the post id from a slugged post link", () => {
    expect(
      slugFromPostUrl("https://questdb.slab.com/posts/how-to-release-w7rkjimy")
    ).toBe("how-to-release");
  });

  it("ignores a heading anchor", () => {
    expect(
      slugFromPostUrl("https://triumph.slab.com/posts/event-bus-65nk4duh#hjiec")
    ).toBe("event-bus");
  });

  it("decodes an encoded slug", () => {
    expect(
      slugFromPostUrl(
        "https://gravitee.slab.com/posts/%E2%9A%92%EF%B8%8F-better-software-yxtcvazk"
      )
    ).toBe("better-software");
  });

  it("uses the label for an id-only post link", () => {
    expect(
      slugFromPostUrl(
        "https://mlabs.slab.com/posts/j8zg8yst",
        "👋 Onboarding Guide"
      )
    ).toBe("onboarding-guide");
  });

  it("returns undefined for an id-only post link without a label", () => {
    expect(slugFromPostUrl("https://mlabs.slab.com/posts/j8zg8yst")).toBe(
      undefined
    );
  });

  it("returns undefined for other Slab URLs", () => {
    expect(slugFromPostUrl("https://team.slab.com/users/38346437")).toBe(
      undefined
    );
    expect(slugFromPostUrl("https://team.slab.com/topics/eng-abc12345")).toBe(
      undefined
    );
  });

  it("returns undefined for non-Slab URLs and relative paths", () => {
    expect(slugFromPostUrl("https://example.com/posts/foo-abc12345")).toBe(
      undefined
    );
    expect(slugFromPostUrl("./other.md")).toBe(undefined);
  });
});

describe("SlabAPIImportTask#resolveLinkedDocument", () => {
  const task = new TestSlabAPIImportTask();
  const docMap = {
    "Engineering/Project Overview Template.md": "doc-1",
    "Company/Onboarding/🙏 Getting a Laptop.md": "doc-2",
    "Product/[Sample] iOS App Project": "doc-3",
    "Product/Q3 Roadmap.md": "doc-4",
  };

  it("resolves a post link to the document with the matching title", () => {
    expect(
      task.resolveLink(
        "https://walkers.slab.com/posts/project-overview-template-w7rkjimy",
        docMap
      )
    ).toBe("doc-1");
  });

  it("ignores emoji and punctuation in titles", () => {
    expect(
      task.resolveLink(
        "https://walkers.slab.com/posts/getting-a-laptop-kyyl1mnw",
        docMap
      )
    ).toBe("doc-2");
    expect(
      task.resolveLink(
        "https://walkers.slab.com/posts/sample-ios-app-project-c54ocw3u",
        docMap
      )
    ).toBe("doc-3");
  });

  it("matches a slug that has a hyphen between letters and digits", () => {
    expect(
      task.resolveLink(
        "https://walkers.slab.com/posts/q-3-roadmap-0dxs2ysx",
        docMap
      )
    ).toBe("doc-4");
  });

  it("resolves an id-only mention link by its label", () => {
    expect(
      task.resolveLink(
        "https://walkers.slab.com/posts/0dxs2ysx",
        docMap,
        "Q3 Roadmap"
      )
    ).toBe("doc-4");
  });

  it("prefers an exact slug over a match without hyphens", () => {
    const map = { "Team/Oncall.md": "doc-a", "Team/On Call.md": "doc-b" };
    expect(
      task.resolveLink("https://walkers.slab.com/posts/oncall-abc12345", map)
    ).toBe("doc-a");
    expect(
      task.resolveLink("https://walkers.slab.com/posts/on-call-abc12345", map)
    ).toBe("doc-b");
  });

  it("does not resolve a slug that more than one document has", () => {
    const map = {
      "Engineering/Weekly Sync.md": "doc-a",
      "Product/Weekly Sync.md": "doc-b",
    };
    expect(
      task.resolveLink(
        "https://walkers.slab.com/posts/weekly-sync-abc12345",
        map
      )
    ).toBe(undefined);
  });

  it("returns undefined when no document matches", () => {
    expect(
      task.resolveLink(
        "https://walkers.slab.com/posts/secret-post-c54ocw3u",
        docMap
      )
    ).toBe(undefined);
  });

  it("rewrites the markdown link through the base resolver", () => {
    const out = rewriteInternalLinks(
      "see [Overview](https://walkers.slab.com/posts/project-overview-template-w7rkjimy)",
      "Company/What We Stand For.md",
      docMap,
      (href, label) => task.resolveLink(href, docMap, label)
    );
    expect(out).toBe("see [Overview](<<doc-1>>)");
  });
});

describe("SlabAPIImportTask#processPage", () => {
  it("converts post links and id-only mention links to mentions, and file links to attachments", async () => {
    const targetId = randomUUID();
    const importTask = new ImportTask<IntegrationService.Markdown>({
      input: [
        {
          externalId: randomUUID(),
          title: "Handbook",
          path: "slab/Company/Handbook.md",
          markdownText: [
            "See [Laptops](https://walkers.slab.com/posts/getting-a-laptop-kyyl1mnw)",
            "and [🙏 Getting a Laptop](https://walkers.slab.com/posts/kyyl1mnw).",
            "",
            `[Budget.xlsx](${signedFileUrl})`,
          ].join("\n"),
          attachmentMap: [],
        },
      ],
    });
    importTask.import = new Import<IntegrationService.Markdown>({
      scratch: {
        storageKey: "slab.zip",
        docMap: { "slab/Company/Onboarding/🙏 Getting a Laptop.md": targetId },
      },
    });

    const { taskOutput } = await new TestSlabAPIImportTask().page(importTask);
    const doc = ProsemirrorHelper.toProsemirror(taskOutput[0].content);
    const mentions = ProsemirrorHelper.parseMentions(doc);

    expect(mentions).toEqual([
      expect.objectContaining({ modelId: targetId, label: "Laptops" }),
      expect.objectContaining({
        modelId: targetId,
        label: "🙏 Getting a Laptop",
      }),
    ]);
    expect(ProsemirrorHelper.getAttachments(doc).map((n) => n.attrs)).toEqual([
      expect.objectContaining({ href: signedFileUrl, title: "Budget.xlsx" }),
    ]);
  });
});

describe("isSlabFileUrl", () => {
  it("detects Slab static hosts", () => {
    expect(isSlabFileUrl(signedFileUrl)).toBe(true);
    expect(
      isSlabFileUrl(
        "https://static.slab.com/prod/uploads/8807b6f8/posts/images/a.jpeg"
      )
    ).toBe(true);
  });

  it("detects signed files on a team subdomain", () => {
    expect(
      isSlabFileUrl("https://walkers.slab.com/files/report.pdf?jwt=abc")
    ).toBe(true);
  });

  it("rejects post, user and external links", () => {
    expect(isSlabFileUrl("https://walkers.slab.com/posts/foo-abc12345")).toBe(
      false
    );
    expect(isSlabFileUrl("https://walkers.slab.com/users/38346437")).toBe(
      false
    );
    expect(isSlabFileUrl("https://example.com/report.pdf")).toBe(false);
    expect(isSlabFileUrl("./attachments/report.pdf")).toBe(false);
  });
});

describe("convertSlabFileLinks", () => {
  it("replaces a paragraph holding only a file link with an attachment", () => {
    const doc = ProsemirrorHelper.toProsemirror(
      `Intro\n\n[Quarterly report.pdf](${signedFileUrl})\n\nOutro`
    );
    const out = convertSlabFileLinks(doc).toJSON();

    expect(out.content).toHaveLength(3);
    expect(out.content[1]).toMatchObject({
      type: "attachment",
      attrs: { href: signedFileUrl, title: "Quarterly report.pdf", size: 0 },
    });
  });

  it("keeps surrounding text unlinked and appends the attachment", () => {
    const doc = ProsemirrorHelper.toProsemirror(
      `See the [report](${signedFileUrl}) for details.`
    );
    const out = convertSlabFileLinks(doc);

    expect(out.childCount).toBe(2);
    expect(out.child(0).type.name).toBe("paragraph");
    expect(out.child(0).textContent).toBe("See the report for details.");
    expect(
      out.rangeHasMark(0, out.child(0).nodeSize, doc.type.schema.marks.link)
    ).toBe(false);
    expect(out.child(1).toJSON()).toMatchObject({
      type: "attachment",
      attrs: { href: signedFileUrl, title: "report.pdf" },
    });
  });

  it("adds the file extension when the link text has none", () => {
    const doc = ProsemirrorHelper.toProsemirror(
      `[Org chart](${signedFileUrl})`
    );
    const out = convertSlabFileLinks(doc).toJSON();

    expect(out.content[0]).toMatchObject({
      type: "attachment",
      attrs: { title: "Org chart.pdf" },
    });
  });

  it("gives one attachment for a link split by formatting", () => {
    const doc = ProsemirrorHelper.toProsemirror(
      `[**Quarterly** report](${signedFileUrl})`
    );
    const out = convertSlabFileLinks(doc).toJSON();

    expect(out.content).toHaveLength(1);
    expect(out.content[0]).toMatchObject({
      type: "attachment",
      attrs: { title: "Quarterly report.pdf" },
    });
  });

  it("keeps a toggle's leading paragraph when it is only a file link", () => {
    const { schema } = ProsemirrorHelper.toProsemirror("").type;
    const fileLink = (text: string) =>
      schema.text(text, [schema.marks.link.create({ href: signedFileUrl })]);
    const toggle = schema.nodes.container_toggle.create(undefined, [
      schema.nodes.paragraph.create(undefined, fileLink("Spec.pdf")),
      schema.nodes.paragraph.create(undefined, fileLink("Body.pdf")),
    ]);
    const doc = schema.nodes.doc.create(undefined, toggle);
    const out = convertSlabFileLinks(doc);

    expect(() => out.check()).not.toThrow();
    const content = out.child(0).toJSON().content;
    expect(content.map((n: { type: string }) => n.type)).toEqual([
      "paragraph",
      "attachment",
      "paragraph",
      "attachment",
    ]);
    expect(out.child(0).child(0).textContent).toBe("Spec.pdf");
    expect(out.rangeHasMark(0, out.nodeSize - 2, schema.marks.link)).toBe(
      false
    );
  });

  it("converts a file link in a heading and keeps the heading text", () => {
    const doc = ProsemirrorHelper.toProsemirror(
      `## Download [Report](${signedFileUrl})`
    );
    const out = convertSlabFileLinks(doc);

    expect(out.child(0).type.name).toBe("heading");
    expect(out.child(0).textContent).toBe("Download Report");
    expect(out.child(1).toJSON()).toMatchObject({
      type: "attachment",
      attrs: { href: signedFileUrl, title: "Report.pdf" },
    });
  });

  it("names a bare URL link after the file", () => {
    const doc = ProsemirrorHelper.toProsemirror(
      `[${signedFileUrl}](${signedFileUrl})`
    );
    const out = convertSlabFileLinks(doc).toJSON();

    expect(out.content[0]).toMatchObject({
      type: "attachment",
      attrs: { title: "AbC123.pdf" },
    });
  });

  it("converts file links nested inside list items", () => {
    const doc = ProsemirrorHelper.toProsemirror(
      `- [Sheet.xlsx](${signedFileUrl})\n- plain item`
    );
    const out = convertSlabFileLinks(doc).toJSON();

    expect(out.content[0].content[0].content[0]).toMatchObject({
      type: "attachment",
      attrs: { title: "Sheet.xlsx" },
    });
    expect(out.content[0].content[1].content[0].type).toBe("paragraph");
  });

  it("leaves other links and images untouched", () => {
    const markdown = `[Site](https://example.com) and [Post](https://walkers.slab.com/posts/foo-abc12345)\n\n![](https://slabstatic.com/prod/uploads/x/posts/images/a.png)`;
    const doc = ProsemirrorHelper.toProsemirror(markdown);

    expect(convertSlabFileLinks(doc).toJSON()).toEqual(doc.toJSON());
  });
});
