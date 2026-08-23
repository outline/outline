import { rootNotebookActions } from "./definitions/notebooks";
import { rootDeveloperActions } from "./definitions/developer";
import { rootNoteActions } from "./definitions/documents";
import { rootNavigationActions } from "./definitions/navigation";
import { rootNotificationActions } from "./definitions/notifications";
import { rootRevisionActions } from "./definitions/revisions";
import { rootSettingsActions } from "./definitions/settings";
import { rootTeamActions } from "./definitions/teams";
import { rootUserActions } from "./definitions/users";
export default [
  ...rootNotebookActions,
  ...rootNoteActions,
  ...rootUserActions,
  ...rootNavigationActions,
  ...rootNotificationActions,
  ...rootRevisionActions,
  ...rootSettingsActions,
  ...rootDeveloperActions,
  ...rootTeamActions,
];
