import { buildAttachment } from "@server/test/factories";
import Attachment from "./Attachment";

describe("#findByKey", () => {
  it("should return the correct attachment given a key", async () => {
    const attachment = await buildAttachment();
    const found = await Attachment.findByKey(attachment.key);
    expect(found?.id).toBe(attachment.id);
  });
});
