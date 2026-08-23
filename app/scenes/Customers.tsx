import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { SchemaForm } from "~/components/SchemaForm";
import { CustomerDocType } from "~/utils/doctypes";
import { useShop } from "~/stores/shop";
import { AppPage } from "~/components/AppPage";
import { usePanel } from "~/hooks/usePanel";
import { useSubmit } from "~/hooks/useSubmit";
import { Card, CardGrid, PlainList } from "~/components/Surface";
const Head = styled.div`
  padding: 24px;
  border-bottom: 1px solid ${s("divider")};
`;
const Body = styled.div`
  padding: 16px 24px;
`;
const Points = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  color: ${s("accent")};
  background: ${s("backgroundTertiary")};
`;
/**
 * Customer directory, with the pets registered against each owner.
 *
 * @returns the rendered customers page.
 */
function Customers() {
  const { t } = useTranslation();
  const history = useHistory();
  const customers = useShop((state) => state.customers);
  const saveCustomer = useShop((state) => state.saveCustomer);
  const deleteCustomer = useShop((state) => state.deleteCustomer);
  const panels = usePanel();
  const submission = useSubmit();
  const handleSave = (values: Record<string, string>) =>
    submission.run(async () => {
      const pets = values.petName?.trim()
        ? [
            {
              id: "",
              name: values.petName.trim(),
              species: values.petSpecies?.trim() || "Dog",
              breed: values.petBreed?.trim() || "Mixed",
            },
          ]
        : [];
      const result = await saveCustomer({
        name: values.name ?? "",
        email: values.email ?? "",
        phone: values.phone ?? "",
        pets,
      });
      if (result?.saved) {
        panels.close();
        return;
      }
      return t("A customer needs a name.");
    });
  const handleDelete = (id: string, name: string) =>
    submission.run(async () => {
      const result = await deleteCustomer(id);
      return result?.removed
        ? undefined
        : t("{{name}} has history with us, so their record was kept.", {
            name,
          });
    });
  return (
    <AppPage
      title={t("Customers")}
      description={t("Owners, their pets and loyalty standing.")}
      actions={
        <Button onClick={() => panels.open("add")}>{t("New customer")}</Button>
      }
    >
      {submission.notice ? (
        <Text as="p" type="secondary" data-testid="customers-notice">
          {submission.notice}
        </Text>
      ) : null}

      {panels.isOpen("add") ? (
        <>
          <Subheading>{t("New customer")}</Subheading>
          <SchemaForm
            doctype={CustomerDocType}
            submitLabel={t("Add customer")}
            onSubmit={(values) => void handleSave(values)}
            onCancel={panels.close}
          />
        </>
      ) : null}

      <CardGrid role="list">
        {customers.map((customer) => (
          <Card as="li" key={customer.id}>
            <Head>
              <Flex align="center" gap={12}>
                <Text as="h3" weight="bold" size="small">
                  {customer.name}
                </Text>
                <Points>{customer.loyaltyPoints} pts</Points>
              </Flex>
              <Text as="p" type="tertiary" size="small">
                {customer.email}
              </Text>
              <Text as="p" type="tertiary" size="small">
                {customer.phone}
              </Text>
            </Head>
            <Body>
              <Text type="secondary" size="xsmall" weight="bold">
                {t("Pets")}
              </Text>
              <PlainList>
                {customer.pets.map((pet) => (
                  <li key={pet.id}>
                    <Text size="small" weight="bold">
                      {pet.name}
                    </Text>{" "}
                    <Text size="small" type="secondary">
                      · {pet.species} · {pet.breed}
                    </Text>
                  </li>
                ))}
              </PlainList>
              <Flex gap={8} style={{ marginTop: 16 }}>
                <Button
                  neutral
                  borderOnHover
                  onClick={() => history.push(`/customers/${customer.id}`)}
                >
                  {t("Open")}
                </Button>
                <Button
                  neutral
                  borderOnHover
                  onClick={() => void handleDelete(customer.id, customer.name)}
                >
                  {t("Remove")}
                </Button>
              </Flex>
            </Body>
          </Card>
        ))}
      </CardGrid>
      {customers.length === 0 ? <Empty>{t("No customers yet.")}</Empty> : null}
    </AppPage>
  );
}
export default Customers;
