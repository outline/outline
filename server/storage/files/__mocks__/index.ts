import { vi } from "vitest";

export default {
  upload: vi.fn().mockReturnValue("/endpoint/key"),

  getUploadUrl: vi.fn().mockReturnValue("http://mock/create"),

  getUrlForKey: vi.fn().mockReturnValue("http://mock/get"),

  getSignedUrl: vi.fn().mockReturnValue("http://s3mock"),

  getPresignedPost: vi.fn().mockReturnValue({}),

  getPresignedPut: vi
    .fn()
    .mockImplementation(
      (_key: string, _acl: string, contentLength: number) => ({
        url: "http://s3mock/presigned-put-url",
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(contentLength),
          "Content-Disposition": "attachment",
          "Cache-Control": "max-age=31557600",
        },
      })
    ),
};
