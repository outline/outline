import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import type { CollectionPermission, DocumentPermission } from "@shared/types";
import { Inner } from "~/components/Button";
import ButtonSmall from "~/components/ButtonSmall";
import Fade from "~/components/Fade";
import InputMemberPermissionSelect from "~/components/InputMemberPermissionSelect";
import type { Action, Permission } from "~/types";

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

  return (
    <Fade timing="150ms" key="invite">
      <Flex gap={4}>
        <InputPermissionSelect
          permissions={permissions}
          onChange={onChange}
          value={permission}
        />
        <ButtonSmall action={action}>{t("Add")}</ButtonSmall>
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
