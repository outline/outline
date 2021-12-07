import { rootCollectionActions } from "./definitions/collections";
import { rootDebugActions } from "./definitions/debug";
import { rootDocumentActions } from "./definitions/documents";
import { rootNavigationActions } from "./definitions/navigation";
import { rootSettingsActions } from "./definitions/settings";
import { rootUserActions } from "./definitions/users";

export default [
  ...rootCollectionActions,
  ...rootDocumentActions,
  ...rootUserActions,
  ...rootNavigationActions,
  ...rootSettingsActions,
  ...rootDebugActions,
];
