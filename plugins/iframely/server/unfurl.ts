import Iframely from "./iframely";

export const unfurl = async (url: string) => Iframely.get(url);
