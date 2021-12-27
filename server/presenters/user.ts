import { User } from "@server/models";

type Options = {
  includeDetails?: boolean;
};
type UserPresentation = {
  id: string;
  name: string;
  avatarUrl: string | null | undefined;
  email?: string;
  color: string;
  isAdmin: boolean;
  isSuspended: boolean;
  isViewer: boolean;
  language: string;
};

export default (
  user: User,
  options: Options = {}
): UserPresentation | null | undefined => {
  const userData = {};
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type '{}'.
  userData.id = user.id;
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'createdAt' does not exist on type '{}'.
  userData.createdAt = user.createdAt;
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'name' does not exist on type '{}'.
  userData.name = user.name;
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'color' does not exist on type '{}'.
  userData.color = user.color;
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'isAdmin' does not exist on type '{}'.
  userData.isAdmin = user.isAdmin;
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'isViewer' does not exist on type '{}'.
  userData.isViewer = user.isViewer;
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'isSuspended' does not exist on type '{}'... Remove this comment to see the full error message
  userData.isSuspended = user.isSuspended;
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'avatarUrl' does not exist on type '{}'.
  userData.avatarUrl = user.avatarUrl;
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'lastActiveAt' does not exist on type '{}... Remove this comment to see the full error message
  userData.lastActiveAt = user.lastActiveAt;

  if (options.includeDetails) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'email' does not exist on type '{}'.
    userData.email = user.email;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'language' does not exist on type '{}'.
    userData.language =
      user.language || process.env.DEFAULT_LANGUAGE || "en_US";
  }

  // @ts-expect-error ts-migrate(2740) FIXME: Type '{}' is missing the following properties from... Remove this comment to see the full error message
  return userData;
};
