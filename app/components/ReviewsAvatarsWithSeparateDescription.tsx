import { StarIcon } from "@heroicons/react/20/solid";
import { classNames } from "./classNames";

const reviews = [
  {
    id: 1,
    title: "This is the best white t-shirt out there",
    rating: 5,
    content: `
      <p>I've searched my entire life for a t-shirt that reflects every color in the visible spectrum. Scientists said it couldn't be done, but when I look at this shirt, I see white light bouncing right back into my eyes. Incredible!</p>
    `,
    author: "Mark Edwards",
    avatarSrc:
      "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixqx=oilqXxSqey&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    id: 2,
    title: "Adds the perfect variety to my wardrobe",
    rating: 4,
    content: `
      <p>I used to be one of those unbearable minimalists who only wore the same black v-necks every day. Now, I have expanded my wardrobe with three new crewneck options! Leaving off one star only because I wish the heather gray was more gray.</p>
    `,
    author: "Blake Reid",
    avatarSrc:
      "https://images.unsplash.com/photo-1520785643438-5bf77931f493?ixlib=rb-=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=80",
  },
  {
    id: 3,
    title: "All good things come in 6-Packs",
    rating: 5,
    content: `
      <p>Tasty beverages, strong abs that will never be seen due to aforementioned tasty beverages, and these Basic Tees!</p>
    `,
    author: "Ben Russel",
    avatarSrc:
      "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
];

/**
 * Tailwind UI – reviews: avatars with separate description.
 *
 * @returns the rendered component.
 */
export function ReviewsAvatarsWithSeparateDescription() {
  return (
    <div className="bg-white">
      <div>
        <h2 id="reviews-heading" className="sr-only">
          Reviews
        </h2>

        <div className="space-y-10">
          {reviews.map((review) => (
            <div key={review.id} className="flex flex-col sm:flex-row">
              <div className="order-2 mt-6 sm:ml-16 sm:mt-0">
                <h3 className="text-sm font-medium text-gray-900">
                  {review.title}
                </h3>
                <p className="sr-only">{review.rating} out of 5 stars</p>

                <div
                  className="mt-3 space-y-6 text-sm text-gray-600"
                  dangerouslySetInnerHTML={{ __html: review.content }}
                />
              </div>

              <div className="order-1 flex items-center sm:flex-col sm:items-start">
                <img
                  src={review.avatarSrc}
                  alt={`${review.author}.`}
                  className="h-12 w-12 rounded-full"
                />

                <div className="ml-4 sm:ml-0 sm:mt-4">
                  <p className="text-sm font-medium text-gray-900">
                    {review.author}
                  </p>
                  <div className="mt-2 flex items-center">
                    {[0, 1, 2, 3, 4].map((rating) => (
                      <StarIcon
                        key={rating}
                        className={classNames(
                          review.rating > rating
                            ? "text-gray-900"
                            : "text-gray-200",
                          "h-5 w-5 shrink-0"
                        )}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
