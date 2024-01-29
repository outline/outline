import CanCan from "cancan";

const cancan = new CanCan();

export const _can = cancan.can;

export const _authorize = cancan.authorize;

export const _cannot = cancan.cannot;

export const _abilities = cancan.abilities;

export const allow = cancan.allow;
