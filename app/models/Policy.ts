import Model from "./base/Model";

class Policy extends Model {
  id: string;

  abilities: Record<string, boolean>;
}

export default Policy;
