import { useTranslation } from "react-i18next";
import { AppPage } from "~/components/AppPage";
import { useFields } from "~/hooks/useFields";
import { usePanel } from "~/hooks/usePanel";
import { useSubmit } from "~/hooks/useSubmit";
import Button from "~/components/Button";
import { Tab, Tabs } from "~/components/Tabs";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import ListItem from "~/components/List/Item";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { StatusChip } from "~/components/StatusChip";
import { useShop } from "~/stores/shop";
import { formatCurrency, formatDate } from "~/utils/format";
const TABS = [
  "Overview",
  "Bookings",
  "Services",
  "Reviews",
  "Settings",
] as const;
/**
 * Renders a rating as stars.
 *
 * Rounds down and marks the remainder with a half, so a 4.5 does not read as
 * a clean sweep.
 */
const stars = (rating: number) => {
  const filled = Math.floor(rating);
  const half = rating - filled >= 0.5 ? 1 : 0;
  return (
    "★".repeat(filled) +
    "½".repeat(half) +
    "☆".repeat(Math.max(0, 5 - filled - half))
  );
};
/**
 * The shop's side of the public shopfront.
 *
 * Everything a visitor sees at /p/<slug> is configured here: which services
 * are listed, what the reviews say, and whether the shopfront answers at all.
 *
 * @returns the rendered portal page.
 */
function Portal() {
  const { t } = useTranslation();
  const stats = useShop((state) => state.portalStats);
  const services = useShop((state) => state.portalServices);
  const reviews = useShop((state) => state.portalReviews);
  const portalBookings = useShop((state) => state.portalBookings);
  const createPortalService = useShop((state) => state.createPortalService);
  const setPortalServiceActive = useShop(
    (state) => state.setPortalServiceActive
  );
  const deletePortalService = useShop((state) => state.deletePortalService);
  const savePortalSettings = useShop((state) => state.savePortalSettings);
  const tabs = usePanel<(typeof TABS)[number]>("Overview");
  const tab = tabs.current ?? "Overview";
  const submission = useSubmit();
  const fields = useFields({
    serviceName: "",
    serviceCategory: "Grooming",
    serviceMinutes: "60",
    servicePrice: "",
    slug: "",
    name: "",
    tagline: "",
  });
  const summary = stats
    ? [
        { label: t("Reviews"), value: `${stats.reviews}` },
        {
          label: t("Average rating"),
          value: stats.reviews
            ? `${stats.averageRating} ${stars(stats.averageRating)}`
            : "—",
        },
        {
          label: t("Active services"),
          value: `${stats.activeServices} / ${stats.totalServices}`,
        },
        { label: t("Pets on file"), value: `${stats.pets}` },
        {
          label: t("Bookings via the portal"),
          value: `${stats.portalBookings}`,
        },
        {
          label: t("Public address"),
          value: stats.enabled ? `/p/${stats.slug}` : t("Switched off"),
        },
      ]
    : [];
  const handleAddService = () =>
    submission.run(async () => {
      if (!fields.get("serviceName").trim()) {
        return t("A service needs a name.");
      }
      await createPortalService({
        name: fields.get("serviceName").trim(),
        description: "",
        category: fields.get("serviceCategory").trim() || "Grooming",
        durationMinutes: Number(fields.get("serviceMinutes")) || 60,
        price: Number(fields.get("servicePrice")) || 0,
      });
      fields.set("serviceName", "");
      fields.set("servicePrice", "");
      return undefined;
    });
  const handleSaveSettings = () =>
    submission.run(async () => {
      // Blank fields are left out rather than sent empty, so saving one
      // thing does not clear the rest.
      const result = await savePortalSettings({
        name: fields.get("name").trim() || undefined,
        tagline: fields.get("tagline").trim() || undefined,
        slug: fields.get("slug").trim() || undefined,
      });
      return result?.saved
        ? t("Saved.")
        : t("A web address can only use letters, numbers and dashes.");
    });
  const handleTogglePortal = () =>
    submission.run(async () => {
      const result = await savePortalSettings({
        portalEnabled: !(stats?.enabled ?? true),
      });
      return result?.saved
        ? stats?.enabled
          ? t("The shopfront is now closed to visitors.")
          : t("The shopfront is open.")
        : t("That could not be saved.");
    });
  return (
    <AppPage
      title={t("Portal")}
      description={t("What the public sees, and who can reach it.")}
    >
      <Tabs>
        {TABS.map((option) => (
          <Tab
            key={option}
            active={tab === option}
            onClick={() => tabs.open(option)}
          >
            {t(option)}
          </Tab>
        ))}
      </Tabs>

      {submission.notice ? (
        <Text as="p" type="secondary" data-testid="portal-notice">
          {submission.notice}
        </Text>
      ) : null}

      {tab === "Overview" ? (
        <>
          <Subheading>{t("How the shopfront is doing")}</Subheading>
          {summary.map((row) => (
            <ListItem
              key={row.label}
              title={row.label}
              actions={<Text weight="bold">{row.value}</Text>}
              border
            />
          ))}
          {!stats ? <Empty>{t("Loading…")}</Empty> : null}
        </>
      ) : null}

      {tab === "Bookings" ? (
        <>
          <Subheading>
            {t("Booked from the shopfront")} · {portalBookings.length}
          </Subheading>
          {portalBookings.map((booking) => (
            <ListItem
              key={booking.id}
              title={
                <>
                  {booking.petName}{" "}
                  <Text as="span" type="tertiary">
                    {booking.customerName}
                  </Text>
                </>
              }
              subtitle={
                <>
                  {formatDate(booking.scheduledAt)} · {booking.customerPhone}
                </>
              }
              actions={<StatusChip status={booking.status} />}
              border
            />
          ))}
          {portalBookings.length === 0 ? (
            <Empty>{t("No one has booked through the shopfront yet.")}</Empty>
          ) : null}
        </>
      ) : null}

      {tab === "Services" ? (
        <>
          <Subheading>{t("Listed services")}</Subheading>
          {services.map((service) => (
            <ListItem
              key={service.id}
              title={service.name}
              subtitle={
                <>
                  {service.category} · {service.durationMinutes} {t("minutes")}{" "}
                  · {formatCurrency(service.price)}
                  {service.description ? ` · ${service.description}` : ""}
                </>
              }
              actions={
                <Flex align="center" gap={8}>
                  <StatusChip
                    status={service.isActive ? "active" : "inactive"}
                  />
                  <Button
                    neutral
                    borderOnHover
                    onClick={() =>
                      void setPortalServiceActive(service.id, !service.isActive)
                    }
                  >
                    {service.isActive ? t("Hide") : t("List")}
                  </Button>
                  <Button
                    neutral
                    borderOnHover
                    onClick={() => void deletePortalService(service.id)}
                  >
                    {t("Remove")}
                  </Button>
                </Flex>
              }
              border
            />
          ))}
          {services.length === 0 ? (
            <Empty>{t("Nothing is listed yet.")}</Empty>
          ) : null}

          <Subheading>{t("Add a service")}</Subheading>
          <Flex gap={8} wrap align="flex-end">
            <Input
              label={t("Name")}
              value={fields.get("serviceName")}
              onChange={(event) =>
                fields.set("serviceName", event.target.value)
              }
            />
            <Input
              label={t("Category")}
              value={fields.get("serviceCategory")}
              onChange={(event) =>
                fields.set("serviceCategory", event.target.value)
              }
              short
            />
            <Input
              label={t("Minutes")}
              value={fields.get("serviceMinutes")}
              onChange={(event) =>
                fields.set("serviceMinutes", event.target.value)
              }
              short
            />
            <Input
              label={t("Price")}
              value={fields.get("servicePrice")}
              onChange={(event) =>
                fields.set("servicePrice", event.target.value)
              }
              short
            />
            <Button onClick={handleAddService}>{t("Add")}</Button>
          </Flex>
        </>
      ) : null}

      {tab === "Reviews" ? (
        <>
          <Subheading>
            {t("What customers said")} · {reviews.length}
          </Subheading>
          {reviews.map((review) => (
            <ListItem
              key={review.id}
              title={
                <>
                  {review.customerName}{" "}
                  <Text as="span" type="tertiary">
                    {stars(review.rating)}
                  </Text>
                </>
              }
              subtitle={
                <>
                  {formatDate(review.createdAt)} · {review.body}
                </>
              }
              border
            />
          ))}
          {reviews.length === 0 ? <Empty>{t("No reviews yet.")}</Empty> : null}
        </>
      ) : null}

      {tab === "Settings" ? (
        <>
          <Subheading>{t("The shopfront")}</Subheading>
          <ListItem
            title={t("Visible to the public")}
            subtitle={
              stats?.enabled
                ? t("Anyone with the address can book.")
                : t("The address returns nothing.")
            }
            actions={
              <Flex align="center" gap={8}>
                <StatusChip status={stats?.enabled ? "active" : "inactive"} />
                <Button neutral borderOnHover onClick={handleTogglePortal}>
                  {stats?.enabled ? t("Close it") : t("Open it")}
                </Button>
              </Flex>
            }
            border
          />

          <Subheading>{t("Address and wording")}</Subheading>
          <Flex gap={8} wrap align="flex-end">
            <Input
              label={t("Web address")}
              value={fields.get("slug")}
              placeholder={stats?.slug}
              onChange={(event) => fields.set("slug", event.target.value)}
              short
            />
            <Input
              label={t("Name")}
              value={fields.get("name")}
              onChange={(event) => fields.set("name", event.target.value)}
            />
            <Input
              label={t("Tagline")}
              value={fields.get("tagline")}
              onChange={(event) => fields.set("tagline", event.target.value)}
            />
            <Button onClick={handleSaveSettings}>{t("Save")}</Button>
          </Flex>
        </>
      ) : null}
    </AppPage>
  );
}
export default Portal;
