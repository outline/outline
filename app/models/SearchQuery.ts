import BaseModel from "./BaseModel";

class SearchQuery extends BaseModel {
  id: string;

  query: string;
}

export default SearchQuery;
