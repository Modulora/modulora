import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { schema } from "@modulora/db";

import { getCurrentUser } from "./session";
import { isOwnedProfileBackgroundImage, isProfileBackgroundOverlay, isProfileBackgroundOverlayOpacity, isProfileBackgroundPosition, validateProfileCustomizationInput } from "./profile-theme";

export interface ProfileCustomizationResult {
  ok: boolean;
  error?: string;
  ignored?: string[];
}

export const updateProfileCustomization = createServerFn({ method: "POST" })
  .validator((data: { font: string; themeCss: string; backgroundImage: string | null; backgroundOverlay: string; backgroundOverlayOpacity: number; backgroundPositionX: number; backgroundPositionY: number }) => ({
    font: String(data.font ?? "").trim(),
    themeCss: String(data.themeCss ?? ""),
    backgroundImage: data.backgroundImage ? String(data.backgroundImage).trim() : null,
    backgroundOverlay: String(data.backgroundOverlay ?? "dark"),
    backgroundOverlayOpacity: Number(data.backgroundOverlayOpacity),
    backgroundPositionX: Number(data.backgroundPositionX),
    backgroundPositionY: Number(data.backgroundPositionY),
  }))
  .handler(async ({ data }): Promise<ProfileCustomizationResult> => {
    const request = getRequest();
    if (!request) return { ok: false, error: "Request unavailable." };
    const user = await getCurrentUser(request);
    if (!user) return { ok: false, error: "Sign in first." };
    const validated = validateProfileCustomizationInput({ isPlus: user.isPlus, font: data.font, themeCss: data.themeCss });
    if (!validated.ok) return validated;
    if (data.backgroundImage && !isOwnedProfileBackgroundImage(data.backgroundImage, user.id)) {
      return { ok: false, error: "Upload the background image through Modulora first." };
    }
    if (!isProfileBackgroundOverlay(data.backgroundOverlay)) {
      return { ok: false, error: "Choose a supported background overlay." };
    }
    if (!isProfileBackgroundOverlayOpacity(data.backgroundOverlayOpacity)) {
      return { ok: false, error: "Background overlay strength must be between 0 and 80%." };
    }
    if (!isProfileBackgroundPosition(data.backgroundPositionX) || !isProfileBackgroundPosition(data.backgroundPositionY)) {
      return { ok: false, error: "Background framing must be between 0 and 100%." };
    }
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return { ok: false, error: "Database unavailable." };
    const database = drizzle(neon(databaseUrl), { schema });
    await database
      .update(schema.users)
      .set({
        profileFont: validated.font,
        profileThemeLight: validated.theme.light,
        profileThemeDark: validated.theme.dark,
        profileBackgroundImage: data.backgroundImage,
        profileBackgroundOverlay: data.backgroundOverlay,
        profileBackgroundOverlayOpacity: data.backgroundOverlayOpacity,
        profileBackgroundPositionX: data.backgroundPositionX,
        profileBackgroundPositionY: data.backgroundPositionY,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));
    return { ok: true, ignored: validated.theme.ignored };
  });
