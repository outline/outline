import { observer } from "mobx-react";
import { DocumentIcon, PlusIcon } from "outline-icons";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import Flex from "@shared/components/Flex";
import Icon from "@shared/components/Icon";
import { s } from "@shared/styles";
import type Template from "~/models/Template";
import Button from "~/components/Button";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import TemplateMenu from "~/menus/TemplateMenu";
import history from "~/utils/history";
import { newTemplatePath } from "~/utils/routeHelpers";

type Props = {
  /** The template to display and manage nested templates for. */
  template: Template;
};

/**
 * Lists the templates nested under the given template and allows creating
 * new ones. Rendered below the editor on the template settings screen.
 */
export const NestedTemplates = observer(function NestedTemplates_({
  template,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { templates } = useStores();
  const can = usePolicy(template);

  useEffect(() => {
    void templates.fetchChildTemplates(template.id);
  }, [templates, template.id]);

  const childTemplates = template.childTemplates;

  if (!can.update && !childTemplates.length) {
    return null;
  }

  return (
    <Section column>
      <Subheading>{t("Nested templates")}</Subheading>
      <Text as="p" type="secondary">
        {t(
          "Documents created from this template will include a matching nested document for each template listed here."
        )}
      </Text>
      {childTemplates.map((childTemplate) => (
        <ChildRow key={childTemplate.id} align="center" gap={4}>
          {childTemplate.icon ? (
            <Icon
              value={childTemplate.icon}
              initial={childTemplate.initial}
              color={childTemplate.color || undefined}
              size={24}
            />
          ) : (
            <DocumentIcon size={24} color={theme.textSecondary} />
          )}
          <ChildLink to={childTemplate.path}>
            {childTemplate.titleWithDefault}
          </ChildLink>
          <TemplateMenu
            template={childTemplate}
            onEdit={() => history.push(childTemplate.path)}
          />
        </ChildRow>
      ))}
      {can.update && (
        <Flex>
          <Button
            type="button"
            icon={<PlusIcon />}
            onClick={() =>
              history.push(
                newTemplatePath(template.collectionId ?? undefined, {
                  parentDocumentId: template.id,
                })
              )
            }
            neutral
          >
            {t("New nested template")}…
          </Button>
        </Flex>
      )}
    </Section>
  );
});

const Section = styled(Flex)`
  margin-top: 60px;
`;

const ChildRow = styled(Flex)`
  padding: 8px 0;
  border-bottom: 1px solid ${s("divider")};

  &:last-of-type {
    border-bottom: 0;
    margin-bottom: 12px;
  }
`;

const ChildLink = styled(Link)`
  flex-grow: 1;
  color: ${s("text")};
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;
