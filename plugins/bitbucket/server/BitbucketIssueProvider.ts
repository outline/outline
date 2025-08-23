import { MentionType, UnfurlResourceType } from "@shared/types";
import { User } from "@server/models";
import { Bitbucket } from "./bitbucket";

export class BitbucketIssueProvider {
  async search(_query: string, _user: User) {
    // For Bitbucket with app password, we'll return empty results as the search
    // would require more complex implementation with repository access
    // This can be enhanced later to search across accessible repositories
    return [];
  }

  async getMentionUrl(url: string, user: User) {
    const resource = Bitbucket.parseUrl(url);
    if (!resource) {
      return null;
    }

    try {
      const unfurl = await Bitbucket.unfurl(url, user);
      if (!unfurl) {
        return null;
      }

      return {
        id: resource.id,
        type:
          resource.type === UnfurlResourceType.Issue
            ? MentionType.Issue
            : MentionType.PullRequest,
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
