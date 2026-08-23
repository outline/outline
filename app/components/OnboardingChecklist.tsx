import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { useShop } from "~/stores/shop";
/**
 * What is still to be set up.
 *
 * Every step is worked out from the records themselves, so it cannot claim
 * something is done that is not – and the whole list disappears once the shop
 * is set up rather than sitting there ticked forever.
 *
 * @returns the rendered checklist, or nothing when there is nothing left.
 */
export function OnboardingChecklist() {
  const { t } = useTranslation();
  const history = useHistory();
  const steps = useShop((state) => state.onboarding);
  const outstanding = steps.filter((step) => !step.done);
  if (outstanding.length === 0) {
    return null;
  }
  return (
    <>
      <Subheading>
        {t("Still to set up")} · {outstanding.length} {t("of")} {steps.length}
      </Subheading>
      {outstanding.map((step) => (
        <ListItem
          key={step.id}
          title={t(step.title)}
          actions={
            <Button
              neutral
              borderOnHover
              onClick={() => history.push(step.path)}
            >
              {t("Set it up")}
            </Button>
          }
          border
        />
      ))}
      <Flex style={{ paddingTop: 8 }}>
        <Text type="tertiary" size="small">
          {t("These tick themselves off as the records appear.")}
        </Text>
      </Flex>
    </>
  );
}
