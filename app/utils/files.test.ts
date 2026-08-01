import env from "@shared/env";
import { client } from "./ApiClient";
import { attachmentsToSignedUrls, extname } from "./files";

vi.mock("./ApiClient");

describe("#extname", () => {
  test("should extract file extension from string", () => {
    expect(extname("one.doc")).toBe(".doc");
    expect(extname("one.test.ts")).toBe(".ts");
    expect(extname(".DS_Store")).toBe("");
    expect(extname("directory/one.pdf")).toBe(".pdf");
    expect(extname("../relative/one.doc")).toBe(".doc");
    expect(extname(".hidden/directory/one.txt")).toBe(".txt");
  });
});

describe("#attachmentsToSignedUrls", () => {
  const id = "5f0a1d0e-9b1d-4c4e-8a4d-1a9e4c0d3b2a";

  beforeEach(() => {
    env.URL = "https://app.example.com";
    vi.mocked(client.post).mockReset();
  });

  test("should not call the api when there are no attachments", async () => {
    expect(await attachmentsToSignedUrls("# Title\n\nno images")).toBe(
      "# Title\n\nno images"
    );
    expect(client.post).not.toHaveBeenCalled();
  });

  test("should replace both relative and absolute attachment urls", async () => {
    vi.mocked(client.post).mockResolvedValue({
      data: { [id]: "https://s3.example.com/signed" },
    });

    const text = `![one](/api/attachments.redirect?id=${id})\n![two](${env.URL}/api/attachments.redirect?id=${id})`;

    expect(await attachmentsToSignedUrls(text)).toBe(
      "![one](https://s3.example.com/signed)\n![two](https://s3.example.com/signed)"
    );
    expect(client.post).toHaveBeenCalledWith("/attachments.signUrls", {
      ids: [id],
      expiresIn: undefined,
    });
  });

  test("should leave urls untouched when the attachment is not returned", async () => {
    vi.mocked(client.post).mockResolvedValue({ data: {} });

    const text = `![one](/api/attachments.redirect?id=${id})`;
    expect(await attachmentsToSignedUrls(text)).toBe(text);
  });
});
