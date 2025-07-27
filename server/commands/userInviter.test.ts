import { faker } from "@faker-js/faker";
import { UserRole } from "@shared/types";
import { buildUser } from "@server/test/factories";
import userInviter from "./userInviter";
import { withAPIContext } from "@server/test/support";

describe("userInviter", () => {
  it("should return sent invites", async () => {
    const user = await buildUser();
    const response = await withAPIContext(user, (ctx) =>
      userInviter(ctx, {
        invites: [
          {
            role: UserRole.Member,
            email: faker.internet.email(),
            name: "Test",
          },
        ],
      })
    );
    expect(response.sent.length).toEqual(1);
  });

  it("should filter empty invites", async () => {
    const user = await buildUser();
    const response = await withAPIContext(user, (ctx) =>
      userInviter(ctx, {
        invites: [
          {
            role: UserRole.Member,
            email: " ",
            name: "Test",
          },
        ],
      })
    );
    expect(response.sent.length).toEqual(0);
  });

  it("should filter obviously bunk emails", async () => {
    const user = await buildUser();
    const response = await withAPIContext(user, (ctx) =>
      userInviter(ctx, {
        invites: [
          {
            role: UserRole.Member,
            email: "notanemail",
            name: "Test",
          },
        ],
      })
    );
    expect(response.sent.length).toEqual(0);
  });

  it("should not send duplicates", async () => {
    const user = await buildUser();
    const response = await withAPIContext(user, (ctx) =>
      userInviter(ctx, {
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
      })
    );
    expect(response.sent.length).toEqual(1);
  });

  it("should not send invites to existing team members", async () => {
    const email = faker.internet.email().toLowerCase();
    const user = await buildUser({ email });
    const response = await withAPIContext(user, (ctx) =>
      userInviter(ctx, {
        invites: [
          {
            role: UserRole.Member,
            email,
            name: user.name,
          },
        ],
      })
    );
    expect(response.sent.length).toEqual(0);
  });
});
