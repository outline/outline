import { buildUser } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import userInviter from "./userInviter";

setupTestDatabase();

describe("userInviter", () => {
  const ip = "127.0.0.1";

  it("should return sent invites", async () => {
    const user = await buildUser();
    const response = await userInviter({
      invites: [
        {
          role: "member",
          email: "test@example.com",
          name: "Test",
        },
      ],
      user,
      ip,
    });
    expect(response.sent.length).toEqual(1);
  });

  it("should filter empty invites", async () => {
    const user = await buildUser();
    const response = await userInviter({
      invites: [
        {
          role: "member",
          email: " ",
          name: "Test",
        },
      ],
      user,
      ip,
    });
    expect(response.sent.length).toEqual(0);
  });

  it("should filter obviously bunk emails", async () => {
    const user = await buildUser();
    const response = await userInviter({
      invites: [
        {
          role: "member",
          email: "notanemail",
          name: "Test",
        },
      ],
      user,
      ip,
    });
    expect(response.sent.length).toEqual(0);
  });

  it("should not send duplicates", async () => {
    const user = await buildUser();
    const response = await userInviter({
      invites: [
        {
          role: "member",
          email: "the@same.com",
          name: "Test",
        },
        {
          role: "member",
          email: "the@SAME.COM",
          name: "Test",
        },
      ],
      user,
      ip,
    });
    expect(response.sent.length).toEqual(1);
  });

  it("should not send invites to existing team members", async () => {
    const user = await buildUser();
    const response = await userInviter({
      invites: [
        {
          role: "member",
          email: user.email!,
          name: user.name,
        },
      ],
      user,
      ip,
    });
    expect(response.sent.length).toEqual(0);
  });
});
