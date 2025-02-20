import { buildTeam, buildCollection } from "@server/test/factories";

describe("Team", () => {
  describe("collectionIds", () => {
    it("should return non-private collection ids", async () => {
      const team = await buildTeam();
      const collection = await buildCollection({
        teamId: team.id,
      });
      // build a collection in another team
      await buildCollection();
      // build a private collection
      await buildCollection({
        teamId: team.id,
        permission: null,
      });
      const response = await team.collectionIds();
      expect(response.length).toEqual(1);
      expect(response[0]).toEqual(collection.id);
    });
  });

  describe("previousSubdomains", () => {
    it("should list the previous subdomains", async () => {
      const team = await buildTeam({
        subdomain: "example",
      });
      const subdomain = "updated";

      await team.update({ subdomain });
      expect(team.subdomain).toEqual(subdomain);
      expect(team.previousSubdomains?.length).toEqual(1);
      expect(team.previousSubdomains?.[0]).toEqual("example");

      const subdomain2 = "another";
      await team.update({ subdomain: subdomain2 });
      expect(team.subdomain).toEqual(subdomain2);
      expect(team.previousSubdomains?.length).toEqual(2);
      expect(team.previousSubdomains?.[0]).toEqual("example");
      expect(team.previousSubdomains?.[1]).toEqual(subdomain);
    });
  });
});
