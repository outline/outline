import type { onChangePayload } from "@hocuspocus/server";
import { subMinutes } from "date-fns";
import { DatabaseError } from "sequelize";
import { User, View } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { ViewsExtension } from "./ViewsExtension";

describe("ViewsExtension", () => {
  const change = async (user: User, documentId: string, socketId: string) => {
    const extension = new ViewsExtension();
    await extension.onChange({
      documentName: `document.${documentId}`,
      context: { user },
      socketId,
    } as onChangePayload);
  };

  it("should write lastActiveAt when it is older than five minutes", async () => {
    const old = subMinutes(new Date(), 10);
    const user = await buildUser({ lastActiveAt: old });
    const document = await buildDocument({ teamId: user.teamId });

    await change(user, document.id, "socket-1");

    const reloaded = await User.findByPk(user.id, { rejectOnEmpty: true });
    expect(reloaded.lastActiveAt!.getTime()).toBeGreaterThan(old.getTime());
  });

  it("should not write lastActiveAt within five minutes", async () => {
    const recent = subMinutes(new Date(), 2);
    const user = await buildUser({ lastActiveAt: recent });
    const document = await buildDocument({ teamId: user.teamId });

    await change(user, document.id, "socket-1");

    const reloaded = await User.findByPk(user.id, { rejectOnEmpty: true });
    expect(reloaded.lastActiveAt).toEqual(recent);
  });

  it("should not throw when the database is read-only", async () => {
    const user = await buildUser();
    const document = await buildDocument({ teamId: user.teamId });
    const spy = vi.spyOn(View, "touch").mockRejectedValue(
      new DatabaseError(
        Object.assign(new Error("read-only transaction"), {
          sql: "",
          code: "25006",
        })
      )
    );

    await expect(
      change(user, document.id, "socket-1")
    ).resolves.toBeUndefined();
    spy.mockRestore();
  });
});
