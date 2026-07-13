/**
 * Better Auth browser client. Talks to the /api/auth handler.
 * baseURL is inferred from window.location in the browser.
 */
import { createAuthClient } from "better-auth/react";
import { deviceAuthorizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [deviceAuthorizationClient()],
});

export const { signIn, signOut, signUp, useSession, linkSocial, changePassword } =
  authClient;
