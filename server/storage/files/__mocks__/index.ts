import { vi } from "vitest";

export default {
  upload: vi.fn().mockReturnValue("/endpoint/key"),

  getUploadUrl: vi.fn().mockReturnValue("http://mock/create"),

  getUrlForKey: vi.fn().mockReturnValue("http://mock/get"),

  getSignedUrl: vi.fn().mockReturnValue("http://s3mock"),

  getPresignedPost: vi.fn().mockReturnValue({}),
};
