import CanCan from "cancan";

const cancan = new CanCan();

// this should not be needed but is a workaround for this TypeScript issue:
// https://github.com/microsoft/TypeScript/issues/36931
export const authorize: typeof cancan.authorize = cancan.authorize;

export const can = cancan.can;

export const cannot = cancan.cannot;

export const abilities = cancan.abilities;

export const allow = cancan.allow;
