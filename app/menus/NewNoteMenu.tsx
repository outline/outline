import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Button from "~/components/Button";
import Tooltip from "~/components/Tooltip";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import { preloadEditor } from "~/routes/scenes";
import { newNotePath } from "~/utils/routeHelpers";
function NewNoteMenu() {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  if (!can.createNote) {
    return null;
  }
  return (
    <Tooltip content={t("New note")} shortcut="n" placement="bottom">
      <Button
        as={Link}
        to={newNotePath()}
        icon={<PlusIcon />}
        onPointerEnter={preloadEditor}
        onFocus={preloadEditor}
      >
        {t("New note")}
      </Button>
    </Tooltip>
  );
}
export default observer(NewNoteMenu);
