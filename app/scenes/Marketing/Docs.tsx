import { Link, useParams } from "react-router-dom";
import { DOC_TOPICS, findTopic } from "./topics";
import { MarketingLayout } from "./MarketingLayout";

/**
 * Documentation: the index when no topic is named, otherwise the topic.
 *
 * @returns the rendered docs page.
 */
function Docs() {
  const { topic: slug } = useParams<{ topic?: string }>();
  const topic = slug ? findTopic(slug) : undefined;

  if (slug && !topic) {
    return (
      <MarketingLayout
        title="Not found"
        description="There's no documentation at that address."
      >
        <Link to="/docs" className="text-sm font-semibold text-indigo-600">
          Back to the docs
        </Link>
      </MarketingLayout>
    );
  }

  if (topic) {
    return (
      <MarketingLayout title={topic.title} description={topic.summary}>
        <div className="space-y-8">
          {topic.sections.map((section) => (
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

        <Link
          to="/docs"
          className="mt-12 inline-block text-sm font-semibold text-indigo-600"
        >
          All topics
        </Link>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout
      title="Documentation"
      description="How the shop, the boarding house and the books fit together."
    >
      <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {DOC_TOPICS.map((item) => (
          <li key={item.slug}>
            <Link
              to={`/docs/${item.slug}`}
              className="block rounded-lg border border-gray-200 p-5 hover:border-indigo-300"
            >
              <p className="text-sm font-semibold text-gray-900">
                {item.title}
              </p>
              <p className="mt-1 text-sm text-gray-600">{item.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </MarketingLayout>
  );
}

export default Docs;
