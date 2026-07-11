/**
 * Better Auth browser client. Talks to the /api/auth handler.
 * baseURL is inferred from window.location in the browser.
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signOut, signUp, useSession } = authClient;
