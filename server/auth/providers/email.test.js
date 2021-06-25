// @flow
import TestServer from "fetch-test-server";
import app from "../../app";
import mailer from "../../mailer";
import { buildUser, buildGuestUser } from "../../test/factories";
import { flushdb } from "../../test/support";

const server = new TestServer(app.callback());

jest.mock("../../mailer");

beforeEach(async () => {
  await flushdb();

  // $FlowFixMe – does not understand Jest mocks
  mailer.signin.mockReset();
});
afterAll(() => server.close());

describe("email", () => {
  it("should require email param", async () => {
    const res = await server.post("/auth/email", {
      body: {},
    });
    const body = await res.json();

    expect(res.status).toEqual(400);
    expect(body.error).toEqual("validation_error");
    expect(body.ok).toEqual(false);
  });

  it("should respond with redirect location when user is SSO enabled", async () => {
    const user = await buildUser();

    const res = await server.post("/auth/email", {
      body: { email: user.email },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.redirect).toMatch("slack");
    expect(mailer.signin).not.toHaveBeenCalled();
  });

  it("should respond with success when user is not SSO enabled", async () => {
    const user = await buildGuestUser();

    const res = await server.post("/auth/email", {
      body: { email: user.email },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
    expect(mailer.signin).toHaveBeenCalled();
  });

  it("should respond with success regardless of whether successful to prevent crawling email logins", async () => {
    const res = await server.post("/auth/email", {
      body: { email: "user@example.com" },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
    expect(mailer.signin).not.toHaveBeenCalled();
  });
});
