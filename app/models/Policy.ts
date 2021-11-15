import BaseModel from "./BaseModel";

class Policy extends BaseModel {
  id: string;

  abilities: Record<string, boolean>;
}

export default Policy;
