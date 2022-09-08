import { rootCollectionActions } from "./definitions/collections";
import { rootDeveloperActions } from "./definitions/developer";
import { rootDocumentActions } from "./definitions/documents";
import { rootNavigationActions } from "./definitions/navigation";
import { rootRevisionActions } from "./definitions/revisions";
import { rootSettingsActions } from "./definitions/settings";
import { rootTeamActions } from "./definitions/teams";
import { rootUserActions } from "./definitions/users";

export default [
  ...rootCollectionActions,
  ...rootDocumentActions,
  ...rootUserActions,
  ...rootNavigationActions,
  ...rootRevisionActions,
  ...rootSettingsActions,
  ...rootDeveloperActions,
  ...rootTeamActions,
];
