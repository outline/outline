/** Rank of each Pet Store staff role. */
export const ROLE_HIERARCHY: Record<string, number> = {
  owner: 4,
  manager: 3,
  cashier: 2,
  groomer: 1,
  caretaker: 1,
};

/** Minimum role required by Pet Store routes. */
export const MIN_ROLE_FOR_ROUTE: Record<string, string> = {
  "/accounting": "manager",
  "/branches": "manager",
  "/invoices": "manager",
  "/loyalty": "manager",
  "/portal": "manager",
  "/products": "manager",
  "/purchase-orders": "manager",
  "/staff": "manager",
  "/suppliers": "manager",
  "/warehouses": "manager",
  "/whatsapp": "manager",
  "/orders": "cashier",
  "/returns": "cashier",
  "/pos": "cashier",
  "/settings/activity": "manager",
  "/settings/billing": "manager",
  "/settings/documents": "manager",
  "/settings/receipts": "manager",
};

/**
 * Checks whether a role satisfies the minimum role requirement.
 *
 * @param role the role held.
 * @param required the role required.
 * @returns true when the role is at least as privileged as required.
 */
export function hasRequiredRole(role: string, required: string): boolean {
  const held = ROLE_HIERARCHY[role];
  const needed = ROLE_HIERARCHY[required];
  if (held === undefined || needed === undefined) {
    return false;
  }
  return held >= needed;
}

/**
 * Checks whether a Pet Store role may open a route.
 *
 * @param role the role held.
 * @param path the route being opened.
 * @returns true when the role may access the route.
 */
export function canAccessRoute(role: string, path: string): boolean {
  if (ROLE_HIERARCHY[role] === undefined) {
    return false;
  }
  const required = Object.entries(MIN_ROLE_FOR_ROUTE)
    .filter(([route]) => path === route || path.startsWith(`${route}/`))
    .sort(([left], [right]) => right.length - left.length)[0]?.[1];
  return required ? hasRequiredRole(role, required) : true;
}
