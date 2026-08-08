/**
 * Tailwind UI – avatars: circular avatars with top notification.
 *
 * @returns the rendered component.
 */
export function AvatarsCircularAvatarsWithTopNotification() {
  return (
    <>
      <span className="relative inline-block">
        <img
          className="h-6 w-6 rounded-full"
          src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
          alt=""
        />
        <span className="absolute right-0 top-0 block h-1.5 w-1.5 rounded-full bg-gray-300 ring-2 ring-white" />
      </span>

      <span className="relative inline-block">
        <img
          className="h-8 w-8 rounded-full"
          src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
          alt=""
        />
        <span className="absolute right-0 top-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
      </span>

      <span className="relative inline-block">
        <img
          className="h-10 w-10 rounded-full"
          src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
          alt=""
        />
        <span className="absolute right-0 top-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />
      </span>

      <span className="relative inline-block">
        <img
          className="h-12 w-12 rounded-full"
          src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
          alt=""
        />
        <span className="absolute right-0 top-0 block h-3 w-3 rounded-full bg-gray-300 ring-2 ring-white" />
      </span>

      <span className="relative inline-block">
        <img
          className="h-14 w-14 rounded-full"
          src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
          alt=""
        />
        <span className="absolute right-0 top-0 block h-3.5 w-3.5 rounded-full bg-red-400 ring-2 ring-white" />
      </span>

      <span className="relative inline-block">
        <img
          className="h-16 w-16 rounded-full"
          src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
          alt=""
        />
        <span className="absolute right-0 top-0 block h-4 w-4 rounded-full bg-green-400 ring-2 ring-white" />
      </span>
    </>
  );
}
