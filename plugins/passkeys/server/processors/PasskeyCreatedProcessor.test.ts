import { taskQueue } from "@server/queues";
import { buildUser } from "@server/test/factories";
import { UserPasskey } from "@server/models";
import { PasskeyCreatedProcessor } from "./PasskeyCreatedProcessor";

const ip = "127.0.0.1";
const uniqueId = () =>
  `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

describe("PasskeyCreatedProcessor", () => {
  describe("passkeys.create", () => {
    it("should schedule an email when a passkey is created", async () => {
      const user = await buildUser();
      const userPasskey = await UserPasskey.create({
        userId: user.id,
        credentialId: uniqueId(),
        credentialPublicKey: Buffer.from("test-public-key"),
        counter: 0,
        transports: ["internal"],
        name: "Chrome on macOS (Biometric)",
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      });

      const spy = jest.spyOn(taskQueue(), "add");

      const processor = new PasskeyCreatedProcessor();
      await processor.perform({
        name: "passkeys.create",
        modelId: userPasskey.id,
        userId: user.id,
        teamId: user.teamId,
        actorId: user.id,
        ip,
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "EmailTask",
          props: expect.objectContaining({
            templateName: "PasskeyCreatedEmail",
            props: expect.objectContaining({
              to: user.email,
              userId: user.id,
              passkeyId: userPasskey.id,
              passkeyName: userPasskey.name,
            }),
          }),
        }),
        expect.anything()
      );

      spy.mockRestore();
    });

    it("should handle passkey with different names", async () => {
      const user = await buildUser();
      const userPasskey = await UserPasskey.create({
        userId: user.id,
        credentialId: uniqueId(),
        credentialPublicKey: Buffer.from("test-public-key"),
        counter: 0,
        transports: ["usb"],
        name: "Security Key (USB)",
        userAgent: null,
      });

      const spy = jest.spyOn(taskQueue(), "add");

      const processor = new PasskeyCreatedProcessor();
      await processor.perform({
        name: "passkeys.create",
        modelId: userPasskey.id,
        userId: user.id,
        teamId: user.teamId,
        actorId: user.id,
        ip,
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "EmailTask",
          props: expect.objectContaining({
            templateName: "PasskeyCreatedEmail",
            props: expect.objectContaining({
              to: user.email,
              passkeyName: "Security Key (USB)",
            }),
          }),
        }),
        expect.anything()
      );

      spy.mockRestore();
    });

    it("should not send email if passkey is not found", async () => {
      const user = await buildUser();
      const spy = jest.spyOn(taskQueue(), "add");

      const processor = new PasskeyCreatedProcessor();
      await processor.perform({
        name: "passkeys.create",
        modelId: "00000000-0000-0000-0000-000000000000",
        userId: user.id,
        teamId: user.teamId,
        actorId: user.id,
        ip,
      });

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("should not send email if user is not found", async () => {
      const user = await buildUser();
      const userPasskey = await UserPasskey.create({
        userId: user.id,
        credentialId: uniqueId(),
        credentialPublicKey: Buffer.from("test-public-key"),
        counter: 0,
        transports: ["internal"],
        name: "Test Passkey",
        userAgent: "Test Agent",
      });

      const spy = jest.spyOn(taskQueue(), "add");

      const processor = new PasskeyCreatedProcessor();
      await processor.perform({
        name: "passkeys.create",
        modelId: userPasskey.id,
        userId: "10000000-0000-4000-8000-000000000001",
        teamId: user.teamId,
        actorId: user.id,
        ip,
      });

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
