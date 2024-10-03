import { createBrowserHistory } from "history";
import env from "~/env";

const history = createBrowserHistory({
  basename: env.BASENAME || "",
});

export default history;
