// @flow
import { View, User } from '../models';
import { presentUser } from '../presenters';

async function present(ctx: Object, view: View) {
  let data = {
    count: view.count,
    user: undefined,
  };
  const user = await ctx.cache.get(
    view.userId,
    async () => await User.findById(view.userId)
  );
  data.user = await presentUser(ctx, user);
  return data;
}

export default present;
