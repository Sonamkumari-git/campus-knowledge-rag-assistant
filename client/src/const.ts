export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export type AuthIntent = "signIn" | "signUp";

// Google handles both sign-in and account creation. The intent is retained in
// the API for a stable button contract; Google shows account selection and
// creates the account automatically when the email is new.
export const startLogin = (_intent: AuthIntent = "signIn") => {
  window.location.href = "/api/oauth/google/start";
};
