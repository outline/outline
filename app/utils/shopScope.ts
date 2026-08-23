const BRANCH_KEY = "shop_branch";
const SESSION_ROLE_KEY = "shop_session_role";

/**
 * Returns the branch selected for the current shop view.
 *
 * @returns the selected branch name, or undefined for all branches.
 */
export function currentBranch(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return localStorage.getItem(BRANCH_KEY) ?? undefined;
}

/**
 * Stores the branch selected for the current shop view.
 *
 * @param branch the branch name, or undefined to show all branches.
 */
export function setCurrentBranch(branch: string | undefined): void {
  if (typeof window === "undefined") {
    return;
  }
  if (branch) {
    localStorage.setItem(BRANCH_KEY, branch);
    return;
  }
  localStorage.removeItem(BRANCH_KEY);
}

/**
 * Returns the role from the authenticated Pet Store session.
 *
 * @returns the role, or undefined before session hydration.
 */
export function currentRole(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return localStorage.getItem(SESSION_ROLE_KEY) ?? undefined;
}

/**
 * Stores the role returned by the Pet Store session.
 *
 * @param role the authenticated role, or undefined after logout.
 */
export function setCurrentRole(role: string | undefined): void {
  if (typeof window === "undefined") {
    return;
  }
  if (role) {
    localStorage.setItem(SESSION_ROLE_KEY, role);
    return;
  }
  localStorage.removeItem(SESSION_ROLE_KEY);
}
