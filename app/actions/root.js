// @flow
import { rootCollectionActions } from "./definitions/collections";
import { rootDocumentActions } from "./definitions/documents";
import { rootNavigationActions } from "./definitions/navigation";
import { rootSettingsActions } from "./definitions/settings";

export default [
  ...rootCollectionActions,
  ...rootDocumentActions,
  ...rootNavigationActions,
  ...rootSettingsActions,
];
