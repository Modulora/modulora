import { describe, expect, it } from "vitest";
import { resolvePierreCodeTheme } from "../src/lib/pierre-theme";
import { isPaidCatalogItem, type CatalogItem } from "../src/data/catalog";

describe("Pierre code theme resolution", () => {
  it("follows light and dark appearance", () => {
    expect(resolvePierreCodeTheme("light", "standard")).toBe("pierre-light");
    expect(resolvePierreCodeTheme("dark", "standard")).toBe("pierre-dark");
  });

  it("maps red-green and blue-yellow accessibility modes", () => {
    expect(resolvePierreCodeTheme("dark", "protanopia")).toBe("pierre-dark-protanopia-deuteranopia");
    expect(resolvePierreCodeTheme("light", "deuteranopia")).toBe("pierre-light-protanopia-deuteranopia");
    expect(resolvePierreCodeTheme("dark", "tritanopia")).toBe("pierre-dark-tritanopia");
  });
});

describe("catalog commerce label", () => {
  const open = { sourceModel: "open-source", marketplacePrice: null } as CatalogItem;

  it("labels paid collection members as paid without changing source model", () => {
    expect(isPaidCatalogItem({ ...open, inPaidCollection: true })).toBe(true);
    expect(open.sourceModel).toBe("open-source");
  });

  it("keeps independent open components free", () => {
    expect(isPaidCatalogItem(open)).toBe(false);
  });
});
