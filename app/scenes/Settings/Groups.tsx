import { observer } from "mobx-react";
import { PlusIcon, GroupIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import GroupNew from "scenes/GroupNew";
import { Action } from "components/Actions";
import Button from "components/Button";
import Empty from "components/Empty";
import GroupListItem from "components/GroupListItem";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import Modal from "components/Modal";
import PaginatedList from "components/PaginatedList";
import Scene from "components/Scene";
import Subheading from "components/Subheading";
import useBoolean from "hooks/useBoolean";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";
import GroupMenu from "menus/GroupMenu";

function Groups() {
  const { t } = useTranslation();
  const { policies, groups } = useStores();
  const team = useCurrentTeam();
  const can = policies.abilities(team.id);
  const [
    newGroupModalOpen,
    handleNewGroupModalOpen,
    handleNewGroupModalClose,
  ] = useBoolean();
  return (
    <Scene
      title={t("Groups")}
      icon={<GroupIcon color="currentColor" />}
      actions={
        <>
          {can.createGroup && (
            <Action>
              <Button
                type="button"
                onClick={handleNewGroupModalOpen}
                icon={<PlusIcon />}
              >
                // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not
                assignable to type 'HTMLColle... Remove this comment to see the
                full error message
                {`${t("New group")}…`}
              </Button>
            </Action>
          )}
        </>
      }
    >
      <Heading>{t("Groups")}</Heading>
      <HelpText>
        <Trans>
          Groups can be used to organize and manage the people on your team.
        </Trans>
      </HelpText>
      <Subheading>{t("All groups")}</Subheading>
      <PaginatedList
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ items: any; empty: Element; fetch: any; re... Remove this comment to see the full error message
        items={groups.orderedData}
        empty={<Empty>{t("No groups have been created yet")}</Empty>}
        fetch={groups.fetchPage}
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'item' implicitly has an 'any' type.
        renderItem={(item) => (
          // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
          <GroupListItem
            key={item.id}
            group={item}
            renderActions={({ openMembersModal }) => (
              <GroupMenu group={item} onMembers={openMembersModal} />
            )}
            showFacepile
          />
        )}
      />

      <Modal
        title={t("Create a group")}
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean | (() => void)' is not assignable to... Remove this comment to see the full error message
        onRequestClose={handleNewGroupModalClose}
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean | (() => void)' is not assignable to... Remove this comment to see the full error message
        isOpen={newGroupModalOpen}
      >
        <GroupNew onSubmit={handleNewGroupModalClose} />
      </Modal>
    </Scene>
  );
}

export default observer(Groups);
