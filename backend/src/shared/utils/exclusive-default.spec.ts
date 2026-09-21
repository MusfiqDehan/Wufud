import { applyExclusiveDefault, ensureDefaultExists } from "./exclusive-default";

describe("exclusive default", () => {
  it("keeps only one default when selecting a target", () => {
    const rows = [
      { id: "a", isDefault: true },
      { id: "b", isDefault: false },
    ];
    expect(applyExclusiveDefault(rows, "b")).toEqual([
      { id: "a", isDefault: false },
      { id: "b", isDefault: true },
    ]);
  });

  it("makes a sole row the default", () => {
    expect(ensureDefaultExists([{ id: "a", isDefault: false }])).toEqual([{ id: "a", isDefault: true }]);
  });

  it("promotes the first row when none is default", () => {
    const rows = [
      { id: "a", isDefault: false },
      { id: "b", isDefault: false },
    ];
    expect(ensureDefaultExists(rows)[0].isDefault).toBe(true);
    expect(ensureDefaultExists(rows)[1].isDefault).toBe(false);
  });

  it("collapses multiple defaults to the first flagged row", () => {
    const rows = [
      { id: "a", isDefault: true },
      { id: "b", isDefault: true },
    ];
    const next = ensureDefaultExists(rows);
    expect(next.filter((r) => r.isDefault)).toHaveLength(1);
    expect(next[0].isDefault).toBe(true);
  });
});
