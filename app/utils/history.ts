import { createBrowserHistory } from "history";
import env from "~/env";

const history = createBrowserHistory({
  // Serve the app under a sub-path when BASE_PATH is set (e.g. "/outline").
  basename: env.BASE_PATH || undefined,
});

export default history;
