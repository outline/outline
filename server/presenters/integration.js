// @flow
import { Integration } from '../models';

function present(ctx: Object, integration: Integration) {
  return integration.toJSON();
}

export default present;
