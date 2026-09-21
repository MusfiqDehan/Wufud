import { omitEmpty } from "./omit-empty";

describe("omitEmpty", () => {
  it("keeps false, 0, empty string and items arrays", () => {
    expect(omitEmpty({ a: false, b: 0, c: "", items: [] })).toEqual({ a: false, b: 0, c: "", items: [] });
  });

  it("keeps empty role_slugs for access/me payloads", () => {
    expect(omitEmpty({ role_slugs: [], user_id: "1" })).toEqual({ role_slugs: [], user_id: "1" });
  });

  it("drops null and empty objects", () => {
    expect(omitEmpty({ a: null, b: {} })).toEqual({});
  });

  it("preserves receipt data shared between sibling fields", () => {
    const items = [{ name: "Bag", quantity: 1 }];
    const receipt = { total: "100.00", items };
    const result = omitEmpty({ sale: { items, receipt }, receipt });
    expect(result.receipt).toEqual(receipt);
    expect(result.sale.receipt.items).toEqual(items);
  });

  it("does not recurse circular graphs", () => {
    const a: { name: string; other?: unknown } = { name: "a" };
    const b: { name: string; other?: unknown } = { name: "b" };
    a.other = b;
    b.other = a;
    expect(omitEmpty(a).name).toBe("a");
  });
});
