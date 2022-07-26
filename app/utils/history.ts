import { createBrowserHistory } from "history";
import env from "~/env";

const history = createBrowserHistory({
  basename: new URL(env.URL).pathname,
});

export default history;
