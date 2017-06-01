// @flow
import View from '../models/View';

function present(ctx: Object, view: View) {
  return {
    count: view.count,
  };
}

export default present;
