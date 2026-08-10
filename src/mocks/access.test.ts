import { describe, expect, it } from "vitest";
import { canAccessRoute, hasRequiredRole, ROLE_HIERARCHY } from "./access";

describe("hasRequiredRole", () => {
  it("lets a role meet its own requirement", () => {
    expect(hasRequiredRole("manager", "manager")).toBe(true);
  });

  it("lets a senior role meet a junior requirement", () => {
    expect(hasRequiredRole("owner", "manager")).toBe(true);
    expect(hasRequiredRole("manager", "cashier")).toBe(true);
  });

  it("refuses a junior role a senior requirement", () => {
    expect(hasRequiredRole("cashier", "manager")).toBe(false);
    expect(hasRequiredRole("caretaker", "owner")).toBe(false);
  });

  it("refuses a role it has never heard of", () => {
    expect(hasRequiredRole("intruder", "caretaker")).toBe(false);
  });

  it("ranks every role the Staff type allows", () => {
    const staffRoles = ["owner", "manager", "groomer", "cashier", "caretaker"];
    staffRoles.forEach((role) => {
      expect(ROLE_HIERARCHY[role]).toBeGreaterThan(0);
    });
  });
});

describe("canAccessRoute", () => {
  it("keeps the books to managers and up", () => {
    expect(canAccessRoute("owner", "/accounting")).toBe(true);
    expect(canAccessRoute("manager", "/accounting")).toBe(true);
    expect(canAccessRoute("cashier", "/accounting")).toBe(false);
    expect(canAccessRoute("groomer", "/accounting")).toBe(false);
  });

  it("keeps the till to cashiers and up", () => {
    expect(canAccessRoute("manager", "/pos")).toBe(true);
    expect(canAccessRoute("cashier", "/pos")).toBe(true);
    expect(canAccessRoute("caretaker", "/pos")).toBe(false);
  });

  it("lets everyone at the shop see the day's work", () => {
    ["owner", "manager", "cashier", "groomer", "caretaker"].forEach((role) => {
      expect(canAccessRoute(role, "/dashboard")).toBe(true);
      expect(canAccessRoute(role, "/boardings")).toBe(true);
    });
  });

  it("guards a route's children the same as the route", () => {
    expect(canAccessRoute("cashier", "/staff/stf-1")).toBe(false);
    expect(canAccessRoute("manager", "/staff/stf-1")).toBe(true);
    expect(canAccessRoute("cashier", "/orders/ord-1")).toBe(true);
  });

  it("keeps the settings area to managers and up", () => {
    // Billing, the audit log and the printable templates all live under
    // /settings; none of them are a cashier's business.
    expect(canAccessRoute("owner", "/settings")).toBe(true);
    expect(canAccessRoute("manager", "/settings/billing")).toBe(true);
    expect(canAccessRoute("cashier", "/settings/activity")).toBe(false);
    expect(canAccessRoute("cashier", "/settings/billing")).toBe(false);
    expect(canAccessRoute("groomer", "/settings/receipts")).toBe(false);
  });

  it("lets anyone reach their own profile at the settings root", () => {
    // Outline puts a person's profile at /settings itself, not /settings/
    // profile, so the root cannot be the manager-only rule.
    ["cashier", "groomer", "caretaker"].forEach((role) => {
      expect(canAccessRoute(role, "/settings")).toBe(true);
    });
  });

  it("still lets anyone manage their own account", () => {
    // These live under /settings too, but they are the person's own profile,
    // not the shop's business.
    ["cashier", "groomer", "caretaker"].forEach((role) => {
      expect(canAccessRoute(role, "/settings/preferences")).toBe(true);
      expect(canAccessRoute(role, "/settings/notifications")).toBe(true);
      expect(canAccessRoute(role, "/settings/security")).toBe(true);
    });
  });

  it("lets the most specific rule win", () => {
    // /settings/preferences is more specific than /settings, so it decides.
    expect(canAccessRoute("cashier", "/settings/preferences")).toBe(true);
    expect(canAccessRoute("cashier", "/settings/billing")).toBe(false);
  });

  it("keeps supplier and warehouse records to managers", () => {
    // These are managed from inside /inventory, which everyone can open, so
    // they need a rule of their own or they inherit the open one.
    expect(canAccessRoute("manager", "/suppliers")).toBe(true);
    expect(canAccessRoute("groomer", "/suppliers")).toBe(false);
    expect(canAccessRoute("caretaker", "/warehouses")).toBe(false);
    expect(canAccessRoute("cashier", "/suppliers")).toBe(false);
  });

  it("allows a route nobody has restricted", () => {
    expect(canAccessRoute("caretaker", "/some/unlisted/page")).toBe(true);
  });

  it("refuses everything to a role it has never heard of", () => {
    expect(canAccessRoute("intruder", "/dashboard")).toBe(false);
  });

  it("does not let /staff rules leak onto a route that merely starts alike", () => {
    // "/staffing" is not under "/staff"; a naive prefix check would guard it.
    expect(canAccessRoute("cashier", "/staffing")).toBe(true);
  });
});
