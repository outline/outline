import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Attachment } from "@server/models";
import FileStorage from "@server/storage/files";
import { AttachmentPreset } from "@shared/types";
import { createContext } from "@server/context";
import { buildTeam, buildUser } from "@server/test/factories";
import attachmentCreator from "./attachmentCreator";

describe("attachmentCreator", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the existing attachment without re-uploading when the id was already used", async () => {
    const user = await buildUser();
    const id = randomUUID();
    const store = vi.spyOn(FileStorage, "store").mockResolvedValue(undefined);

    const first = await attachmentCreator({
      id,
      name: "image.png",
      type: "image/png",
      buffer: Buffer.from("one"),
      preset: AttachmentPreset.DocumentAttachment,
      user,
      ctx: createContext({ user }),
    });

    const second = await attachmentCreator({
      id,
      name: "image.png",
      type: "image/png",
      buffer: Buffer.from("one"),
      preset: AttachmentPreset.DocumentAttachment,
      user,
      ctx: createContext({ user }),
    });

    expect(first?.id).toBe(id);
    expect(second?.id).toBe(id);
    expect(second?.key).toBe(first?.key);
    expect(store).toHaveBeenCalledTimes(1);
    expect(await Attachment.count({ where: { id } })).toBe(1);
  });

  it("derives the storage key from the supplied id so a retry reuses it", async () => {
    const user = await buildUser();
    const id = randomUUID();
    vi.spyOn(FileStorage, "store").mockResolvedValue(undefined);

    const attachment = await attachmentCreator({
      id,
      name: "image.png",
      type: "image/png",
      buffer: Buffer.from("one"),
      preset: AttachmentPreset.DocumentAttachment,
      user,
      ctx: createContext({ user }),
    });

    expect(attachment?.key).toContain(id);
  });

  it("does not resolve an id belonging to another team", async () => {
    const otherTeam = await buildTeam();
    const otherUser = await buildUser({ teamId: otherTeam.id });
    const user = await buildUser();
    const id = randomUUID();
    vi.spyOn(FileStorage, "store").mockResolvedValue(undefined);

    await attachmentCreator({
      id,
      name: "secret.png",
      type: "image/png",
      buffer: Buffer.from("one"),
      preset: AttachmentPreset.DocumentAttachment,
      user: otherUser,
      ctx: createContext({ user: otherUser }),
    });

    await expect(
      attachmentCreator({
        id,
        name: "image.png",
        type: "image/png",
        buffer: Buffer.from("two"),
        preset: AttachmentPreset.DocumentAttachment,
        user,
        ctx: createContext({ user }),
      })
    ).rejects.toThrow();

    const attachment = await Attachment.findByPk(id);
    expect(attachment?.teamId).toBe(otherTeam.id);
  });
});
