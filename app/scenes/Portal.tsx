import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppPage } from "~/components/AppPage";
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
  const boardings = useShop((state) => state.boardings);
  const createPortalService = useShop((state) => state.createPortalService);
  const setPortalServiceActive = useShop(
    (state) => state.setPortalServiceActive
  );
  const deletePortalService = useShop((state) => state.deletePortalService);
  const savePortalSettings = useShop((state) => state.savePortalSettings);

  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [notice, setNotice] = useState<string | undefined>();

  const [serviceName, setServiceName] = useState("");
  const [serviceCategory, setServiceCategory] = useState("Grooming");
  const [serviceMinutes, setServiceMinutes] = useState("60");
  const [servicePrice, setServicePrice] = useState("");

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");

  const portalBookings = boardings.filter(
    (boarding) => boarding.customerId === "public"
  );

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

  const handleAddService = async () => {
    if (!serviceName.trim()) {
      setNotice(t("A service needs a name."));
      return;
    }
    setNotice(undefined);
    await createPortalService({
      name: serviceName.trim(),
      description: "",
      category: serviceCategory.trim() || "Grooming",
      durationMinutes: Number(serviceMinutes) || 60,
      price: Number(servicePrice) || 0,
    });
    setServiceName("");
    setServicePrice("");
  };

  const handleSaveSettings = async () => {
    setNotice(undefined);
    // Blank fields are left out rather than sent empty, so saving one thing
    // does not clear the rest.
    const result = await savePortalSettings({
      name: name.trim() || undefined,
      tagline: tagline.trim() || undefined,
      slug: slug.trim() || undefined,
    });
    setNotice(
      result?.saved
        ? t("Saved.")
        : t("A web address can only use letters, numbers and dashes.")
    );
  };

  const handleTogglePortal = async () => {
    setNotice(undefined);
    const result = await savePortalSettings({
      portalEnabled: !(stats?.enabled ?? true),
    });
    setNotice(
      result?.saved
        ? stats?.enabled
          ? t("The shopfront is now closed to visitors.")
          : t("The shopfront is open.")
        : t("That could not be saved.")
    );
  };

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
            onClick={() => setTab(option)}
          >
            {t(option)}
          </Tab>
        ))}
      </Tabs>

      {notice ? (
        <Text as="p" type="secondary" data-testid="portal-notice">
          {notice}
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
          {portalBookings.map((boarding) => (
            <ListItem
              key={boarding.id}
              title={
                <>
                  {boarding.petName}{" "}
                  <Text as="span" type="tertiary">
                    {boarding.customerName}
                  </Text>
                </>
              }
              subtitle={
                <>
                  {boarding.code} · {boarding.roomName} ·{" "}
                  {formatDate(boarding.checkIn)}–{formatDate(boarding.checkOut)}
                </>
              }
              actions={<StatusChip status={boarding.status} />}
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
              value={serviceName}
              onChange={(event) => setServiceName(event.target.value)}
            />
            <Input
              label={t("Category")}
              value={serviceCategory}
              onChange={(event) => setServiceCategory(event.target.value)}
              short
            />
            <Input
              label={t("Minutes")}
              value={serviceMinutes}
              onChange={(event) => setServiceMinutes(event.target.value)}
              short
            />
            <Input
              label={t("Price")}
              value={servicePrice}
              onChange={(event) => setServicePrice(event.target.value)}
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
              value={slug}
              placeholder={stats?.slug}
              onChange={(event) => setSlug(event.target.value)}
              short
            />
            <Input
              label={t("Name")}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              label={t("Tagline")}
              value={tagline}
              onChange={(event) => setTagline(event.target.value)}
            />
            <Button onClick={handleSaveSettings}>{t("Save")}</Button>
          </Flex>
        </>
      ) : null}
    </AppPage>
  );
}

export default Portal;
