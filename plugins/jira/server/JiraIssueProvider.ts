import { MentionType } from "@shared/types";
import { User } from "@server/models";
import { Jira } from "./jira";

export class JiraIssueProvider {
  async search(_query: string, _user: User) {
    // For Jira with app token, we'll return empty results as the search
    // would require more complex implementation with project access
    // This can be enhanced later to search across accessible projects
    return [];
  }

  async getMentionUrl(url: string, user: User) {
    const resource = Jira.parseUrl(url);
    if (!resource) {
      return null;
    }

    try {
      const unfurl = await Jira.unfurl(url, user);
      if (!unfurl) {
        return null;
      }

      return {
        id: resource.issueKey,
        type: MentionType.JiraIssue,
        title: unfurl.title,
        url: unfurl.url,
        state: unfurl.state,
        author: unfurl.author,
      };
    } catch (_error) {
      return null;
    }
  }
}
