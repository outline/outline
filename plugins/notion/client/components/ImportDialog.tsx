import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import {
  CollectionPermission,
  ImportData,
  IntegrationService,
} from "@shared/types";
import Button from "~/components/Button";
import { Emoji } from "~/components/Emoji";
import Flex from "~/components/Flex";
import InputSelectPermission from "~/components/InputSelectPermission";
import Text from "~/components/Text";
import useRequest from "~/hooks/useRequest";
import { EmptySelectValue } from "~/types";
import { client } from "~/utils/ApiClient";
import { Page } from "plugins/notion/shared/types";

type PageWithPermission = Page & {
  permission?: CollectionPermission;
};

type Props = {
  integrationId: string;
  onSubmit: () => void;
};

export function ImportDialog({ integrationId, onSubmit }: Props) {
  const { t } = useTranslation();
  const [pagesWithPermission, setPagesWithPermission] =
    React.useState<PageWithPermission[]>();

  const loadRootPages = React.useCallback(async () => {
    const res = await client.post("/notion.search", {
      integrationId,
    });
    return res.data;
  }, [integrationId]);

  const {
    data: pages,
    error,
    loading,
  } = useRequest<Page[]>(loadRootPages, true);

  const handlePermissionChange = React.useCallback(
    (id: string, permission?: CollectionPermission) => {
      setPagesWithPermission((prev) =>
        prev?.map((page) => {
          if (page.id === id) {
            page.permission = permission;
          }
          return page;
        })
      );
    },
    []
  );

  const handleStartImport = React.useCallback(async () => {
    const data: ImportData = {
      collection: pagesWithPermission!.map((page) => ({
        externalId: page.id,
        permission: page.permission,
      })),
    };

    try {
      await client.post("/imports.create", {
        integrationId,
        service: IntegrationService.Notion,
        data,
      });

      toast.success(
        t("Your import is being processed, you can safely leave this page")
      );

      onSubmit();
    } catch (err) {
      toast.error(err.message);
    }
  }, [pagesWithPermission, onSubmit]);

  React.useEffect(() => {
    if (pages?.length) {
      setPagesWithPermission(pages);
    } else {
      setPagesWithPermission([]);
    }
  }, [pages]);

  if (error) {
    toast.error("Error while fetching page info from Notion");
    return <div>Error: {error}</div>;
  }

  if (loading || !pagesWithPermission) {
    return <div>Loading data</div>;
  }

  if (pagesWithPermission.length === 0) {
    return <div>No pages available for import</div>;
  }

  return (
    <Flex column gap={8}>
      <div>
        {pagesWithPermission.map((page) => (
          <PageItem
            key={page.id}
            page={page}
            onPermissionChange={handlePermissionChange}
          />
        ))}
      </div>
      <Flex justify="flex-end">
        <Button onClick={handleStartImport}>{t("Start import")}</Button>
      </Flex>
    </Flex>
  );
}

function PageItem({
  page,
  onPermissionChange,
}: {
  page: PageWithPermission;
  onPermissionChange: (id: string, permission?: CollectionPermission) => void;
}) {
  const handlePermissionChange = React.useCallback(
    (value: CollectionPermission | typeof EmptySelectValue) =>
      onPermissionChange(
        page.id,
        value === EmptySelectValue ? undefined : value
      ),
    [onPermissionChange]
  );

  return (
    <Row align="center" justify="space-between" gap={4}>
      <Column $width="75%" $border>
        <Flex gap={6} align="center">
          {page.emoji && <Emoji>{page.emoji}</Emoji>}
          <Text size="small">{page.name}</Text>
        </Flex>
      </Column>
      <Column>
        <InputSelectPermission
          onChange={handlePermissionChange}
          value={page.permission}
          labelHidden
          nude
          style={{ margin: 0 }}
        />
      </Column>
    </Row>
  );
}

const Row = styled(Flex)`
  border: 1px solid ${s("divider")};
  border-collapse: collapse;
  margin-bottom: auto;
`;

const Column = styled.div<{ $width?: string; $border?: boolean }>`
  width: ${({ $width }) => $width || "auto"};
  padding: 4px 6px;
  border-right: 1px solid
    ${({ $border }) => ($border ? s("divider") : "transparent")};
`;
