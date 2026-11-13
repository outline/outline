import { subMinutes } from "date-fns";
import { buildAttachment } from "@server/test/factories";
import Attachment from "./Attachment";

describe("#Attachment", () => {
  describe("updateAccessedAt", () => {
    it("should set lastAccessedAt when it is empty", async () => {
      const attachment = await buildAttachment();
      await attachment.updateAccessedAt();

      const reloaded = await Attachment.findByPk(attachment.id, {
        rejectOnEmpty: true,
      });
      expect(reloaded.lastAccessedAt).toBeTruthy();
    });

    it("should not write when accessed within the last five minutes", async () => {
      const recent = subMinutes(new Date(), 1);
      const attachment = await buildAttachment({ lastAccessedAt: recent });
      await attachment.updateAccessedAt();

      const reloaded = await Attachment.findByPk(attachment.id, {
        rejectOnEmpty: true,
      });
      expect(reloaded.lastAccessedAt).toEqual(recent);
    });

    it("should write when last accessed more than five minutes ago", async () => {
      const old = subMinutes(new Date(), 10);
      const attachment = await buildAttachment({ lastAccessedAt: old });
      await attachment.updateAccessedAt();

      const reloaded = await Attachment.findByPk(attachment.id, {
        rejectOnEmpty: true,
      });
      expect(reloaded.lastAccessedAt!.getTime()).toBeGreaterThan(old.getTime());
    });
  });
});
