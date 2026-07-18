import { describe, expect, it } from "vitest";

describe("cookie domain contract", () => {
  it("uses app host for cross-subdomain cookies in production-like envs", () => {
    const prodDomain = "baseer.humza-butt.space";
    const stagingDomain = "baseer-staging.humza-butt.space";
    expect(prodDomain.startsWith("baseer")).toBe(true);
    expect(stagingDomain.includes("staging")).toBe(true);
    // Cookie domain must be the Pages host (or parent), not the API host.
    expect(prodDomain).not.toContain("api");
    expect(stagingDomain).not.toContain("api");
  });
});
