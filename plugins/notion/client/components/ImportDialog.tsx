import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { ImportInput } from "@shared/schema";
import { s } from "@shared/styles";
import { CollectionPermission, IntegrationService } from "@shared/types";
import Button from "~/components/Button";
import { Emoji } from "~/components/Emoji";
import Flex from "~/components/Flex";
import InputSelectPermission from "~/components/InputSelectPermission";
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
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
  const { imports } = useStores();
  const [submitting, setSubmitting, resetSubmitting] = useBoolean();
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
    setSubmitting();

    const input: ImportInput<IntegrationService.Notion> =
      pagesWithPermission!.map((page) => ({
        type: page.type,
        externalId: page.id,
        externalName: page.name,
        permission: page.permission,
      }));

    try {
      await imports.create(
        { service: IntegrationService.Notion },
        { integrationId, input }
      );

      toast.success(
        t("Your import is being processed, you can safely leave this page")
      );

      onSubmit();
    } catch (err) {
      toast.error(err.message);
      resetSubmitting();
    }
  }, [name, pagesWithPermission, onSubmit]);

  React.useEffect(() => {
    if (pages?.length) {
      setPagesWithPermission(pages);
    } else {
      setPagesWithPermission([]);
    }
  }, [pages]);

  if (error) {
    toast.error(t("Error fetching page info from Notion"));
    return <div>Error: {error}</div>;
  }

  if (loading || !pagesWithPermission) {
    return <div>Loading data</div>;
  }

  if (pagesWithPermission.length === 0) {
    return <div>No pages available for import</div>;
  }

  return (
    <Flex column gap={12}>
      <Pages>
        <Row>
          <Column justify="center" align="center" $border>
            <Text size="small" weight="bold">
              {t("Page")}
            </Text>
          </Column>
          <Column justify="center" align="center">
            <Text size="small" weight="bold">
              {t("Permission")}
            </Text>
          </Column>
        </Row>

        {pagesWithPermission.map((page) => (
          <PageItem
            key={page.id}
            page={page}
            onPermissionChange={handlePermissionChange}
          />
        ))}
      </Pages>
      <Flex justify="flex-end">
        <Button onClick={handleStartImport} disabled={submitting}>
          {t("Start import")}
        </Button>
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
    <Row>
      <Column gap={6} align="center" $border>
        {page.emoji && <Emoji>{page.emoji}</Emoji>}
        <Text size="small">{page.name}</Text>
      </Column>
      <Column justify="end">
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

const Column = styled(Flex)<{ $border?: boolean }>`
  padding: 4px 8px;
  border-right: 1px solid
    ${({ $border }) => ($border ? s("divider") : "transparent")};
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 4px;
`;

const Pages = styled.div`
  border: 1px solid ${s("divider")};

  ${Row}:not(:last-child) {
    border-bottom: 1px solid ${s("divider")};
  }
`;
