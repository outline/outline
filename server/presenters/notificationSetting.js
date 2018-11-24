// @flow
import type { Context } from 'koa';
import { NotificationSetting } from '../models';

function present(ctx: Context, setting: NotificationSetting) {
  return {
    id: setting.id,
    event: setting.event,
    email: setting.email,
  };
}

export default present;
