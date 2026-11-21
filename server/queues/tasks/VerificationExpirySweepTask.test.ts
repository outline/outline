import { subDays, subHours } from "date-fns";
import { Event } from "@server/models";
import { buildDocument, buildTeam, buildUser } from "@server/test/factories";
import VerificationExpirySweepTask from "./VerificationExpirySweepTask";

const props = {
  limit: 10000,
  partition: {
    partitionIndex: 0,
    partitionCount: 1,
  },
};

vi.setConfig({ testTimeout: 30000 });

describe("VerificationExpirySweepTask", () => {
  let task: VerificationExpirySweepTask;

  beforeEach(() => {
    task = new VerificationExpirySweepTask();
  });

  const countEvents = (documentId: string) =>
    Event.count({
      where: {
        name: "documents.verification_expired",
        documentId,
      },
    });

  it("emits an event for a document whose verification expired in the window", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: user.id,
      verifiedAt: subDays(new Date(), 30),
      verifiedById: user.id,
      verificationExpiresAt: subHours(new Date(), 12),
    });

    await task.perform(props);

    expect(await countEvents(document.id)).toBe(1);
    const event = await Event.findOne({
      where: {
        name: "documents.verification_expired",
        documentId: document.id,
      },
    });
    expect(event?.data?.expiresAt).toEqual(
      document.verificationExpiresAt?.toISOString()
    );
    expect(event?.teamId).toEqual(team.id);
  });

  it("does not emit for documents outside the window", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const longExpired = await buildDocument({
      teamId: team.id,
      userId: user.id,
      verifiedAt: subDays(new Date(), 60),
      verifiedById: user.id,
      verificationExpiresAt: subDays(new Date(), 10),
    });
    const notYetExpired = await buildDocument({
      teamId: team.id,
      userId: user.id,
      verifiedAt: new Date(),
      verifiedById: user.id,
      verificationExpiresAt: subDays(new Date(), -10),
    });

    await task.perform(props);

    expect(await countEvents(longExpired.id)).toBe(0);
    expect(await countEvents(notYetExpired.id)).toBe(0);
  });

  it("does not emit for archived or deleted documents", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const archived = await buildDocument({
      teamId: team.id,
      userId: user.id,
      verifiedAt: subDays(new Date(), 30),
      verifiedById: user.id,
      verificationExpiresAt: subHours(new Date(), 12),
      archivedAt: new Date(),
    });
    const deleted = await buildDocument({
      teamId: team.id,
      userId: user.id,
      verifiedAt: subDays(new Date(), 30),
      verifiedById: user.id,
      verificationExpiresAt: subHours(new Date(), 12),
      deletedAt: new Date(),
    });

    await task.perform(props);

    expect(await countEvents(archived.id)).toBe(0);
    expect(await countEvents(deleted.id)).toBe(0);
  });

  it("is idempotent across repeated runs", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: user.id,
      verifiedAt: subDays(new Date(), 30),
      verifiedById: user.id,
      verificationExpiresAt: subHours(new Date(), 12),
    });

    await task.perform(props);
    await task.perform(props);

    expect(await countEvents(document.id)).toBe(1);
  });

  it("emits again when a re-verification produced a new deadline", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: user.id,
      verifiedAt: subDays(new Date(), 30),
      verifiedById: user.id,
      verificationExpiresAt: subHours(new Date(), 30),
    });

    await task.perform(props);
    expect(await countEvents(document.id)).toBe(1);

    // simulate a re-verification whose new deadline has also lapsed
    await document.update({
      verifiedAt: subHours(new Date(), 20),
      verificationExpiresAt: subHours(new Date(), 2),
    });

    await task.perform(props);
    expect(await countEvents(document.id)).toBe(2);
  });
});
