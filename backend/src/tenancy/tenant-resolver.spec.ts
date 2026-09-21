function slugFromHost(host: string): string | null {
  const parts = host.split(".");
  if (host.endsWith("wufud.localhost") && parts[0] && parts[0] !== "wufud") {
    return parts[0];
  }
  if (parts.length >= 3 && parts[1] === "wufud") {
    return parts[0];
  }
  return null;
}

describe("slugFromHost", () => {
  it("extracts demo from demo.wufud.localhost", () => {
    expect(slugFromHost("demo.wufud.localhost")).toBe("demo");
  });

  it("treats wufud.localhost as platform", () => {
    expect(slugFromHost("wufud.localhost")).toBe(null);
  });
});
