export const PROFILE_SECTION_KEYS = [
  "bio",
  "links",
  "sponsor",
  "components",
  "collections",
  "publicLists",
] as const;

export type ProfileSectionKey = (typeof PROFILE_SECTION_KEYS)[number];

export interface ProfileSectionVisibility {
  bio: boolean;
  links: boolean;
  sponsor: boolean;
  components: boolean;
  collections: boolean;
  publicLists: boolean;
}

export const DEFAULT_PROFILE_SECTION_VISIBILITY: ProfileSectionVisibility = {
  bio: true,
  links: true,
  sponsor: true,
  components: true,
  collections: true,
  publicLists: true,
};

export interface ProfileLinkContent {
  bio: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  xUrl: string | null;
  sponsorUrl: string | null;
  githubUsername: string | null;
  xUsername: string | null;
}

export function visibleProfileContent(
  value: ProfileLinkContent,
  sections: ProfileSectionVisibility,
): ProfileLinkContent {
  return {
    bio: sections.bio ? value.bio : null,
    websiteUrl: sections.links ? value.websiteUrl : null,
    githubUrl: sections.links ? value.githubUrl : null,
    xUrl: sections.links ? value.xUrl : null,
    sponsorUrl: sections.sponsor ? value.sponsorUrl : null,
    githubUsername: sections.links ? value.githubUsername : null,
    xUsername: sections.links ? value.xUsername : null,
  };
}

export function visibleProfileItems<T>(enabled: boolean, items: T[]): T[] {
  return enabled ? items : [];
}

export function sanitizeProfileSectionPatch(
  value: Partial<ProfileSectionVisibility>,
): Partial<ProfileSectionVisibility> {
  return Object.fromEntries(
    PROFILE_SECTION_KEYS.flatMap((key) =>
      typeof value[key] === "boolean" ? [[key, value[key]]] : [],
    ),
  ) as Partial<ProfileSectionVisibility>;
}

export function normalizeProfileSectionVisibility(
  value: Partial<ProfileSectionVisibility>,
  fallback: ProfileSectionVisibility = DEFAULT_PROFILE_SECTION_VISIBILITY,
): ProfileSectionVisibility {
  return {
    bio: typeof value.bio === "boolean" ? value.bio : fallback.bio,
    links: typeof value.links === "boolean" ? value.links : fallback.links,
    sponsor: typeof value.sponsor === "boolean" ? value.sponsor : fallback.sponsor,
    components: typeof value.components === "boolean" ? value.components : fallback.components,
    collections: typeof value.collections === "boolean" ? value.collections : fallback.collections,
    publicLists: typeof value.publicLists === "boolean" ? value.publicLists : fallback.publicLists,
  };
}
