import { assertAgencySlug, normalizeAgencySlug, RESERVED_SLUGS } from "./agency-slug";

describe("agency slug", () => {
  it("normalizes names into subdomain-safe slugs", () => {
    expect(normalizeAgencySlug(" Nur Travels ")).toBe("nur-travels");
    expect(normalizeAgencySlug("A!!B")).toBe("a-b");
  });

  it("rejects reserved and short values", () => {
    expect(() => assertAgencySlug("ab")).toThrow();
    expect(() => assertAgencySlug("www")).toThrow();
    expect(RESERVED_SLUGS.has("admin")).toBe(true);
    expect(() => assertAgencySlug("nur-travels")).not.toThrow();
  });
});
