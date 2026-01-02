import type { Integration } from "@server/models";
import type { IntegrationType } from "@shared/types";

export async function uninstall(
  _integration: Integration<IntegrationType.Embed>
) {
  // TODO: Implement Figma uninstall
}
