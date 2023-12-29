import { client } from "~/utils/ApiClient";
import Model from "./base/Model";

class SearchQuery extends Model {
  static modelName = "Search";

  /**
   * The query string, automatically truncated to 255 characters.
   */
  query: string;

  /**
   * Where the query originated.
   */
  source: "api" | "app" | "slack";

  delete = async () => {
    this.isSaving = true;

    try {
      await client.post(`/searches.delete`, {
        query: this.query,
      });

      this.store.data.forEach((searchQuery: SearchQuery) => {
        if (searchQuery.query === this.query) {
          this.store.remove(searchQuery.id);
        }
      });
    } finally {
      this.isSaving = false;
    }
  };
}

export default SearchQuery;
