/** One section of a documentation topic. */
export interface DocSection {
  heading: string;
  body: string;
}
/** A documentation topic. */
export interface DocTopic {
  slug: string;
  title: string;
  summary: string;
  sections: DocSection[];
}
/**
 * The documentation, as content rather than one route file per topic.
 *
 * The reference app gives each topic its own route; here they share a single
 * `/docs/:topic` route because the pages differ only in their prose, and a
 * dozen near-identical files would drift apart the moment one is edited.
 */
export const DOC_TOPICS: DocTopic[] = [
  {
    slug: "dashboard",
    title: "Dashboard",
    summary: "What the numbers on the front page mean.",
    sections: [
      {
        heading: "Revenue today",
        body: "The total of every order marked paid in the last 24 hours, from the till and from finished grooming alike. It moves the moment a sale is taken.",
      },
      {
        heading: "Occupancy",
        body: "Spaces in use across every branch, worked out from the boardings that overlap today rather than a stored count, so it cannot drift from the reservations.",
      },
      {
        heading: "Needs attention",
        body: "Products at or below their reorder level, plus invoices still unpaid. Both are links to the work rather than just a count.",
      },
    ],
  },
  {
    slug: "pos",
    title: "Point of sale",
    summary: "Ringing up a sale.",
    sections: [
      {
        heading: "Taking a sale",
        body: "Search by name or SKU, or filter by category, then tap a product to add it to the ticket. A line cannot exceed what is on the shelf, and anything out of stock cannot be added at all.",
      },
      {
        heading: "What a sale changes",
        body: "Charging the ticket writes a paid order, decrements stock for each line, and updates the dashboard. Nothing is recorded twice, so the figures cannot disagree.",
      },
    ],
  },
  {
    slug: "boarding",
    title: "Boarding",
    summary: "Reservations, check-in and rooms.",
    sections: [
      {
        heading: "The day's work",
        body: "Reservations are grouped by where the stay has got to — arriving, staying, departed — which is the order the front desk works through them.",
      },
      {
        heading: "Rooms",
        body: "Occupancy is derived from the reservations that overlap today. A room with a guest in it cannot be removed; the app refuses and says why rather than doing nothing.",
      },
    ],
  },
  {
    slug: "products",
    title: "Products and inventory",
    summary: "Stock, batches, movements and purchase orders.",
    sections: [
      {
        heading: "Stock levels",
        body: "Each product carries a reorder level. Anything at or below it is flagged on the catalogue and counted on the dashboard.",
      },
      {
        heading: "Receiving",
        body: "Receiving a purchase order books the stock in and writes an `in` movement against it, so the ledger explains every change in the count.",
      },
      {
        heading: "Batches",
        body: "Batches carry a lot number and an expiry. Expired and soon-to-expire stock is called out at the top of the page.",
      },
    ],
  },
  {
    slug: "accounting",
    title: "Accounting",
    summary: "One journal, and everything derived from it.",
    sections: [
      {
        heading: "Double entry",
        body: "Recording an expense posts a balanced entry: the expense account is debited and whatever paid for it is credited. The page header states whether the journal balances.",
      },
      {
        heading: "Reports",
        body: "The trial balance and the profit figure are summed back out of the journal rather than stored, so they cannot disagree with the entries behind them.",
      },
    ],
  },
  {
    slug: "staff",
    title: "Staff and branches",
    summary: "Your team and where they work.",
    sections: [
      {
        heading: "Staff",
        body: "Everyone belongs to a branch and carries a commission rate. Someone can be put on leave and brought back without losing their record.",
      },
      {
        heading: "Branches",
        body: "Each branch owns its rooms. Rooms can be added, retyped and resized, and capacity feeds straight into the occupancy figures.",
      },
    ],
  },
  {
    slug: "loyalty",
    title: "Loyalty",
    summary: "Points, tiers and redemption.",
    sections: [
      {
        heading: "Earning",
        body: "Points are earned on boarding and grooming. A point is worth a rupiah when redeemed, which is why balances are shown with their cash value.",
      },
      {
        heading: "Redeeming",
        body: "Redeeming more than a customer holds is refused rather than allowed to go negative.",
      },
    ],
  },
  {
    slug: "whatsapp",
    title: "WhatsApp",
    summary: "Templates and sending.",
    sections: [
      {
        heading: "Templates",
        body: "Templates are approved before they can be used, the same rule the provider applies. An unapproved template is refused with the reason rather than appearing to send.",
      },
    ],
  },
  {
    slug: "auth",
    title: "Accounts and access",
    summary: "Signing in.",
    sections: [
      {
        heading: "Signing in",
        body: "An account belongs to a business. Signing in opens a session; signing out closes it, and the app is genuinely signed out in between.",
      },
      {
        heading: "Public pages",
        body: "Your booking page and shopfront stay reachable without an account, so customers never meet a sign-in wall.",
      },
    ],
  },
];
/**
 * Finds a topic by its slug.
 *
 * @param slug the topic slug from the url.
 * @returns the topic, or undefined.
 */
export function findTopic(slug: string): DocTopic | undefined {
  return DOC_TOPICS.find((topic) => topic.slug === slug);
}
