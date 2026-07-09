import { randomUUID } from "node:crypto";
import { PropertyType } from "@shared/types";
import { Document } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import presentDocument from "./document";

it("presents document properties", async () => {
  const team = await buildTeam();
  const user = await buildUser({ teamId: team.id });
  const propertyId = randomUUID();
  const collection = await buildCollection({
    teamId: team.id,
    userId: user.id,
    dataSchema: [{ id: propertyId, name: "Status", type: PropertyType.Text }],
  });
  const document = await buildDocument({
    teamId: team.id,
    userId: user.id,
    collectionId: collection.id,
  });
  document.setProperty(propertyId, "In progress");
  await document.save();

  const reloaded = await Document.findByPk(document.id, {
    rejectOnEmpty: true,
  });
  const presented = await presentDocument(undefined, reloaded);
  expect(presented.properties).toEqual({ [propertyId]: "In progress" });
});

it("presents empty properties by default", async () => {
  const document = await buildDocument();
  const reloaded = await Document.findByPk(document.id, {
    rejectOnEmpty: true,
  });
  const presented = await presentDocument(undefined, reloaded);
  expect(presented.properties).toEqual({});
});

it("does not present properties publicly", async () => {
  const document = await buildDocument();
  const presented = await presentDocument(undefined, document, {
    isPublic: true,
  });
  expect(presented.properties).toBeUndefined();
});
