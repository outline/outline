/**
 * Rank of each staff role; higher outranks lower.
 *
 * The names are the ones `Staff["role"]` already uses, so a staff record is
 * the only place a person's role has to be recorded.
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  owner: 4,
  manager: 3,
  cashier: 2,
  groomer: 1,
  caretaker: 1,
};

/**
 * The lowest role that may open each route.
 *
 * A route not listed here is open to anyone signed in. Child routes inherit
 * their parent's requirement unless a more specific rule says otherwise, so
 * `/settings` can be kept to managers while a person's own profile under it
 * stays open to everyone.
 */
export const MIN_ROLE_FOR_ROUTE: Record<string, string> = {
  "/accounting": "manager",
  "/branches": "manager",
  "/invoices": "manager",
  "/loyalty": "manager",
  "/portal": "manager",
  "/products": "manager",
  "/purchase-orders": "manager",
  "/staff": "manager",
  // Managed from inside /inventory, which everyone can open, so they need a
  // rule of their own.
  "/suppliers": "manager",
  "/warehouses": "manager",
  "/whatsapp": "manager",
  "/orders": "cashier",
  "/returns": "cashier",
  "/pos": "cashier",
  // Only the shop's own settings pages are named. The rest of /settings is
  // Outline's – a person's profile lives at /settings itself – and guarding
  // the root would lock everyone out of their own account.
  "/settings/activity": "manager",
  "/settings/billing": "manager",
  "/settings/documents": "manager",
  "/settings/receipts": "manager",
};

/**
 * Whether a role satisfies a requirement.
 *
 * @param role the role held.
 * @param required the role needed.
 * @returns true when the role is at least the requirement.
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
 * Whether a role may open a route.
 *
 * @param role the role held.
 * @param path the route being opened.
 * @returns true when the role is allowed.
 */
export function canAccessRoute(role: string, path: string): boolean {
  if (ROLE_HIERARCHY[role] === undefined) {
    return false;
  }

  // Match on whole path segments so "/staffing" is not caught by "/staff",
  // and let the longest match decide so a specific rule beats a blanket one.
  const required = Object.entries(MIN_ROLE_FOR_ROUTE)
    .filter(([route]) => path === route || path.startsWith(`${route}/`))
    .sort(([a], [b]) => b.length - a.length)[0]?.[1];

  return required ? hasRequiredRole(role, required) : true;
}
