import { describe, expect, it } from "vitest";
import { Storage } from "./storage";

describe("Storage Utils", () => {
	it("should set and get items as JSON", () => {
		const key = "test-key";
		const value = { foo: "bar" };

		Storage.set(key, value);
		expect(Storage.get(key)).toEqual(value);
	});

	it("should return null for non-existent keys", () => {
		expect(Storage.get("not-found")).toBeNull();
	});

	it("should remove items", () => {
		Storage.set("remove-me", true);
		Storage.remove("remove-me");
		expect(Storage.get("remove-me")).toBeNull();
	});

	it("should clear all items", () => {
		Storage.set("key1", 1);
		Storage.set("key2", 2);
		Storage.clear();
		expect(Storage.get("key1")).toBeNull();
		expect(Storage.get("key2")).toBeNull();
	});
});
