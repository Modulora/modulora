import { describe, expect, it } from "vitest";

import {
  DEFAULT_PROFILE_SECTION_VISIBILITY,
  normalizeProfileSectionVisibility,
  PROFILE_SECTION_KEYS,
  sanitizeProfileSectionPatch,
  visibleProfileContent,
  visibleProfileItems,
} from "../src/lib/profile-sections";

describe("profile section visibility", () => {
  it("defaults every public section to visible for existing profiles", () => {
    expect(PROFILE_SECTION_KEYS).toHaveLength(6);
    expect(DEFAULT_PROFILE_SECTION_VISIBILITY).toEqual({
      bio: true,
      links: true,
      sponsor: true,
      components: true,
      collections: true,
      publicLists: true,
    });
  });

  it("preserves explicit hidden sections without changing unrelated defaults", () => {
    expect(normalizeProfileSectionVisibility({ bio: false, publicLists: false })).toEqual({
      bio: false,
      links: true,
      sponsor: true,
      components: true,
      collections: true,
      publicLists: false,
    });
  });

  it("preserves omitted patch keys for the authenticated handler to merge", () => {
    const hidden = normalizeProfileSectionVisibility({
      bio: false,
      links: false,
      sponsor: false,
      components: false,
      collections: false,
      publicLists: false,
    });
    const patch = sanitizeProfileSectionPatch({ bio: true });
    expect(normalizeProfileSectionVisibility(patch, hidden)).toEqual({
      bio: true,
      links: false,
      sponsor: false,
      components: false,
      collections: false,
      publicLists: false,
    });
  });

  it("rejects non-boolean transport values instead of treating strings as enabled", () => {
    expect(sanitizeProfileSectionPatch({ links: "false" as unknown as boolean })).toEqual({});
  });

  it("removes hidden profile content from the public response", () => {
    const sections = normalizeProfileSectionVisibility({ bio: false, links: false, sponsor: false });
    expect(visibleProfileContent({
      bio: "Private bio",
      websiteUrl: "https://example.com",
      githubUrl: "https://github.com/example",
      xUrl: "https://x.com/example",
      sponsorUrl: "https://github.com/sponsors/example",
      githubUsername: "example",
      xUsername: "example",
    }, sections)).toEqual({
      bio: null,
      websiteUrl: null,
      githubUrl: null,
      xUrl: null,
      sponsorUrl: null,
      githubUsername: null,
      xUsername: null,
    });
  });

  it("omits the component payload when its section is hidden", () => {
    expect(visibleProfileItems(false, [{ name: "hidden-component" }])).toEqual([]);
    expect(visibleProfileItems(true, [{ name: "shown-component" }])).toEqual([{ name: "shown-component" }]);
  });
});
