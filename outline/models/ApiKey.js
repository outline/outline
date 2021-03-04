// @flow
import BaseModel from "./BaseModel";

class ApiKey extends BaseModel {
  id: string;
  name: string;
  secret: string;
}

export default ApiKey;
