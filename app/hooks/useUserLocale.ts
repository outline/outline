import useCurrentUser from "./useCurrentUser";

/**
 * Returns the user's locale, or undefined if the user is not logged in.
 *
 * @returns The user's locale, or undefined if the user is not logged in
 */
export default function useUserLocale() {
  const user = useCurrentUser({ rejectOnEmpty: false });
  return user?.language;
}
