import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import { Inner } from "~/components/Button";
import ButtonSmall from "~/components/ButtonSmall";
import Fade from "~/components/Fade";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import useActionContext from "~/hooks/useActionContext";
import { Action, Permission } from "~/types";

export function PermissionAction({
  permission,
  permissions,
  action,
  onChange,
}: {
  permission: CollectionPermission | DocumentPermission;
  permissions: Permission[];
  action: Action;
  onChange: (permission: CollectionPermission | DocumentPermission) => void;
}) {
  const { t } = useTranslation();
  const context = useActionContext();

  return (
    <Fade timing="150ms" key="invite">
      <Flex gap={4}>
        <InputPermissionSelect
          permissions={permissions}
          onChange={onChange}
          value={permission}
          labelHidden
          nude
        />
        <ButtonSmall action={action} context={context}>
          {t("Add")}
        </ButtonSmall>
      </Flex>
    </Fade>
  );
}

const InputPermissionSelect = styled(InputMemberPermissionSelect)`
  font-size: 13px;
  height: 26px;

  ${Inner} {
    line-height: 26px;
    min-height: 26px;
  }
`;
