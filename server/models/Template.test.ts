import { EmptyResultError } from "sequelize";
import { buildTemplate } from "@server/test/factories";
import Template from "./Template";

describe("#findByPk", () => {
  it("should return template by id and urlId", async () => {
    const template = await buildTemplate();

    const byId = await Template.findByPk(template.id, { rejectOnEmpty: true });
    expect(byId.id).toBe(template.id);

    const byUrlId = await Template.findByPk(template.urlId, {
      rejectOnEmpty: true,
    });
    expect(byUrlId.id).toBe(template.id);
  });

  it("should return null when the id is malformed", async () => {
    const response = await Template.findByPk("not a valid id");
    expect(response).toBeNull();
  });

  it("should throw when rejectOnEmpty is set and the id is malformed", async () => {
    await expect(
      Template.findByPk("not a valid id", { rejectOnEmpty: true })
    ).rejects.toThrow(EmptyResultError);
  });

  it("should throw when rejectOnEmpty is set and the id is not a string", async () => {
    await expect(
      Template.findByPk(123, { rejectOnEmpty: true })
    ).rejects.toThrow(EmptyResultError);
  });

  it("should throw the passed error when rejectOnEmpty is an error", async () => {
    const error = new Error("does not exist");

    await expect(
      Template.findByPk("0e8280ea-7b4c-40e5-98ba-ec8a2f00f5e8", {
        rejectOnEmpty: error,
      })
    ).rejects.toThrow(error);

    await expect(
      Template.findByPk("not a valid id", { rejectOnEmpty: error })
    ).rejects.toThrow(error);
  });
});
