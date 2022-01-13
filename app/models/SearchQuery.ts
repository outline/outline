import { client } from "~/utils/ApiClient";
import BaseModel from "./BaseModel";

class SearchQuery extends BaseModel {
  id: string;

  query: string;

  createdAt: string;

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
