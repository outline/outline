import { AdminRequiredError } from "../errors";
import { User, Team } from "../models";
import policy from "./policy";

const { allow } = policy;
allow(
  User,
  "read",
  User,
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'actor' implicitly has an 'any' type.
  (actor, user) => user && user.teamId === actor.teamId
);
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'actor' implicitly has an 'any' type.
allow(User, "inviteUser", Team, (actor, team) => {
  if (!team || actor.teamId !== team.id) return false;
  if (actor.isAdmin) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
  throw new AdminRequiredError();
});
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'actor' implicitly has an 'any' type.
allow(User, "update", User, (actor, user) => {
  if (!user || user.teamId !== actor.teamId) return false;
  if (user.id === actor.id) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
  throw new AdminRequiredError();
});
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'actor' implicitly has an 'any' type.
allow(User, "delete", User, (actor, user) => {
  if (!user || user.teamId !== actor.teamId) return false;
  if (user.id === actor.id) return true;
  if (actor.isAdmin && !user.lastActiveAt) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
  throw new AdminRequiredError();
});
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'actor' implicitly has an 'any' type.
allow(User, ["activate", "suspend"], User, (actor, user) => {
  if (!user || user.teamId !== actor.teamId) return false;
  if (actor.isAdmin) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
  throw new AdminRequiredError();
});
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'actor' implicitly has an 'any' type.
allow(User, "readDetails", User, (actor, user) => {
  if (!user || user.teamId !== actor.teamId) return false;
  if (user === actor) return true;
  return actor.isAdmin;
});
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'actor' implicitly has an 'any' type.
allow(User, "promote", User, (actor, user) => {
  if (!user || user.teamId !== actor.teamId) return false;
  if (user.isAdmin || user.isSuspended) return false;
  if (actor.isAdmin) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
  throw new AdminRequiredError();
});
// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'actor' implicitly has an 'any' type.
allow(User, "demote", User, (actor, user) => {
  if (!user || user.teamId !== actor.teamId) return false;
  if (user.isSuspended) return false;
  if (actor.isAdmin) return true;
  // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
  throw new AdminRequiredError();
});
