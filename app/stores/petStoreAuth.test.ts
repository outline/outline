import { describe, expect, it } from "vitest";
import { UserRole } from "@shared/types";
import { mapPetStoreRole, mapPetStoreLanguage } from "./petStoreAuth";

describe("Pet Store auth hydration", () => {
  it("maps owner and manager roles to Outline administrators", () => {
    expect(mapPetStoreRole("owner")).toBe(UserRole.Admin);
    expect(mapPetStoreRole("manager")).toBe(UserRole.Admin);
  });

  it("maps operational roles to Outline members", () => {
    expect(mapPetStoreRole("kasir")).toBe(UserRole.Member);
    expect(mapPetStoreRole("staff_daycare")).toBe(UserRole.Member);
  });

  it("uses a supported locale and falls back to English", () => {
    expect(mapPetStoreLanguage("id_ID")).toBe("id_ID");
    expect(mapPetStoreLanguage("unknown")).toBe("en_US");
  });
});
