// @flow
import BaseModel from "./BaseModel";

class AuthenticationProvider extends BaseModel {
  id: string;
  name: string;
  createdAt: string;
  providerId: string;
  isEnabled: boolean;
  isConnected: boolean;
}

export default AuthenticationProvider;
