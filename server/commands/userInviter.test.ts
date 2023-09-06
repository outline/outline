import { faker } from "@faker-js/faker";
import { UserRole } from "@shared/types";
import { buildUser } from "@server/test/factories";
import userInviter from "./userInviter";

describe("userInviter", () => {
  const ip = "127.0.0.1";

  it("should return sent invites", async () => {
    const user = await buildUser();
    const response = await userInviter({
      invites: [
        {
          role: UserRole.Member,
          email: faker.internet.email(),
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
          role: UserRole.Member,
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
          role: UserRole.Member,
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
          role: UserRole.Member,
          email: "the@same.com",
          name: "Test",
        },
        {
          role: UserRole.Member,
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
    const email = faker.internet.email().toLowerCase();
    const user = await buildUser({ email });
    const response = await userInviter({
      invites: [
        {
          role: UserRole.Member,
          email,
          name: user.name,
        },
      ],
      user,
      ip,
    });
    expect(response.sent.length).toEqual(0);
  });
});
