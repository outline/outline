import { buildUser } from "../test/factories";
import { flushdb } from "../test/support";
import userInviter from "./userInviter";

beforeEach(() => flushdb());
describe("userInviter", () => {
  const ip = "127.0.0.1";
  it("should return sent invites", async () => {
    const user = await buildUser();
    const response = await userInviter({
      invites: [
        // @ts-expect-error ts-migrate(2741) FIXME: Property 'role' is missing in type '{ email: strin... Remove this comment to see the full error message
        {
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
        // @ts-expect-error ts-migrate(2741) FIXME: Property 'role' is missing in type '{ email: strin... Remove this comment to see the full error message
        {
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
        // @ts-expect-error ts-migrate(2741) FIXME: Property 'role' is missing in type '{ email: strin... Remove this comment to see the full error message
        {
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
        // @ts-expect-error ts-migrate(2741) FIXME: Property 'role' is missing in type '{ email: strin... Remove this comment to see the full error message
        {
          email: "the@same.com",
          name: "Test",
        },
        // @ts-expect-error ts-migrate(2741) FIXME: Property 'role' is missing in type '{ email: strin... Remove this comment to see the full error message
        {
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
        // @ts-expect-error ts-migrate(2741) FIXME: Property 'role' is missing in type '{ email: any; ... Remove this comment to see the full error message
        {
          email: user.email,
          name: user.name,
        },
      ],
      user,
      ip,
    });
    expect(response.sent.length).toEqual(0);
  });
});
