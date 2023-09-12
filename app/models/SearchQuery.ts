import { client } from "~/utils/ApiClient";
import Model from "./base/Model";

class SearchQuery extends Model {
  id: string;

  query: string;

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
