import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

const baseURL = import.meta.env.VITE_API_URL ?? "";

export const authClient = createAuthClient({
  baseURL,
  plugins: [magicLinkClient()],
});

export const { useSession, signIn, signUp, signOut } = authClient;
