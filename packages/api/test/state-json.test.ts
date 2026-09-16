import { describe, expect, it } from "vitest";
import { isSupportedJsonPath, readJsonPath } from "../src/lib/state-json";

describe("JSON path own-property traversal", () => {
  it.each(["__proto__", "constructor", "prototype"])("rejects reserved segment %s at every depth", (key) => {
    for (const path of [`$.${key}`, `$.nested.${key}.name`, `$.items[0].${key}`, `$.${key}[0]`]) {
      expect(isSupportedJsonPath(path)).toBe(false);
      expect(readJsonPath(JSON.parse(`{"${key}":"value"}`), path)).toBeUndefined();
    }
  });

  it("reads ordinary own properties, arrays, and names with reserved prefixes", () => {
    const value = { items: [{ name: "ready" }], constructor_name: "allowed", prototype2: true };
    expect(readJsonPath(value, "$")).toBe(value);
    expect(readJsonPath(value, "$.items[0].name")).toBe("ready");
    expect(readJsonPath(value, "$.constructor_name")).toBe("allowed");
    expect(readJsonPath(value, "$.prototype2")).toBe(true);
    expect(readJsonPath({ toString: "own" }, "$.toString")).toBe("own");
    expect(readJsonPath(Object.assign(Object.create(null), { name: "own" }), "$.name")).toBe("own");
  });

  it("does not resolve inherited object properties", () => {
    expect(readJsonPath({}, "$.toString")).toBeUndefined();
    expect(readJsonPath(Object.create({ name: "inherited" }), "$.name")).toBeUndefined();
  });

  it("does not resolve inherited array indices", () => {
    const values = new Array(1);
    Object.setPrototypeOf(values, { 0: "inherited" });
    expect(readJsonPath(values, "$[0]")).toBeUndefined();
  });

  it.each(["name", "$..name", "$['name']", "$.items[-1]", "$.items[*]"])("rejects unsupported syntax %s", (path) => {
    expect(isSupportedJsonPath(path)).toBe(false);
    expect(readJsonPath({}, path)).toBeUndefined();
  });
});
