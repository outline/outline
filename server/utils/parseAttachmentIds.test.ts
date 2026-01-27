import { expect } from "@jest/globals";
import { randomUUID } from "node:crypto";
import env from "@server/env";
import parseAttachmentIds from "./parseAttachmentIds";

it("should return an empty array with no matches", () => {
  expect(parseAttachmentIds(`some random text`).length).toBe(0);
});

it("should not return orphaned UUID's", () => {
  const uuid = randomUUID();
  expect(
    parseAttachmentIds(`some random text with a uuid ${uuid}

![caption](/images/${uuid}.png)`).length
  ).toBe(0);
});

it("should parse attachment ID from markdown", () => {
  const uuid = randomUUID();
  const results = parseAttachmentIds(
    `![caption text](/api/attachments.redirect?id=${uuid})`
  );
  expect(results.length).toBe(1);
  expect(results[0]).toBe(uuid);
});

it("should parse attachment ID from markdown with additional query params", () => {
  const uuid = randomUUID();
  const results = parseAttachmentIds(
    `![caption text](/api/attachments.redirect?id=${uuid}&size=2)`
  );
  expect(results.length).toBe(1);
  expect(results[0]).toBe(uuid);
});

it("should parse attachment ID from markdown with fully qualified url", () => {
  const uuid = randomUUID();
  const results = parseAttachmentIds(
    `![caption text](${env.URL}/api/attachments.redirect?id=${uuid})`
  );
  expect(results.length).toBe(1);
  expect(results[0]).toBe(uuid);
});

it("should parse attachment ID from markdown with title", () => {
  const uuid = randomUUID();
  const results = parseAttachmentIds(
    `![caption text](/api/attachments.redirect?id=${uuid} "align-left")`
  );
  expect(results.length).toBe(1);
  expect(results[0]).toBe(uuid);
});

it("should parse multiple attachment IDs from markdown", () => {
  const uuid = randomUUID();
  const uuid2 = randomUUID();
  const results =
    parseAttachmentIds(`![caption text](/api/attachments.redirect?id=${uuid})

some text

![another caption](/api/attachments.redirect?id=${uuid2})`);
  expect(results.length).toBe(2);
  expect(results[0]).toBe(uuid);
  expect(results[1]).toBe(uuid2);
});

it("should parse attachment ID from html", () => {
  const uuid = randomUUID();
  const results = parseAttachmentIds(
    `<img src="/api/attachments.redirect?id=${uuid}" />`
  );
  expect(results.length).toBe(1);
  expect(results[0]).toBe(uuid);
});

it("should parse attachment ID from html with fully qualified url", () => {
  const uuid = randomUUID();
  const results = parseAttachmentIds(
    `<img src="${env.URL}/api/attachments.redirect?id=${uuid}" />`
  );
  expect(results.length).toBe(1);
  expect(results[0]).toBe(uuid);
});
