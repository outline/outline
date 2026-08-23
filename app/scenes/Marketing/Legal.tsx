import { MarketingLayout } from "./MarketingLayout";
/** The two legal documents, which differ only in their content. */
const CONTENT = {
  privacy: {
    title: "Privacy",
    description: "What we hold about you and your customers, and why.",
    sections: [
      {
        heading: "What we hold",
        body: "Your account details, your business's records — customers, pets, bookings, sales — and the messages you send through the app.",
      },
      {
        heading: "Your customers' data",
        body: "Records you enter about your customers belong to you. We process them to run the service and do not sell them or use them to advertise.",
      },
      {
        heading: "Keeping it",
        body: "Records are kept while your account is open. Close it and we delete them within 30 days, except where we are required to keep financial records for longer.",
      },
      {
        heading: "Getting it back",
        body: "You can export your data at any time, and ask us to delete it.",
      },
    ],
  },
  terms: {
    title: "Terms",
    description: "The agreement between you and us.",
    sections: [
      {
        heading: "The service",
        body: "We provide the software for managing your shop, boarding and books. You are responsible for the accuracy of what you enter and for how you use it with your customers.",
      },
      {
        heading: "Payment",
        body: "Paid plans are billed monthly in advance. You can change plan at any time; a change takes effect on the next renewal.",
      },
      {
        heading: "Ending it",
        body: "You can stop using the service whenever you like and export your data first. We may suspend an account that is used unlawfully.",
      },
      {
        heading: "Liability",
        body: "The service is provided as it is. We are not liable for lost profits or for records you have not kept a copy of.",
      },
    ],
  },
} as const;
interface Props {
  /** Which document to render. */
  note: keyof typeof CONTENT;
}
/**
 * A legal note.
 *
 * Privacy and terms share a component because they are the same page with
 * different prose.
 *
 * @returns the rendered legal page.
 */
export function Legal({ note }: Props) {
  const content = CONTENT[note];
  return (
    <MarketingLayout title={content.title} description={content.description}>
      <div className="space-y-8">
        {content.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold text-gray-900">
              {section.heading}
            </h2>
            <p className="mt-2 text-base leading-7 text-gray-600">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <p className="mt-12 text-sm text-gray-500">
        Last updated {new Date().getFullYear()}. Questions go to our contact
        page.
      </p>
    </MarketingLayout>
  );
}
/** Privacy policy. */
export function Privacy() {
  return <Legal note="privacy" />;
}
/** Terms of service. */
export function Terms() {
  return <Legal note="terms" />;
}
export default Legal;
