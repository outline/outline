// @flow
import { Team } from '../models';
import { FREE_USER_LIMIT } from '../../shared/environment';
import { type Subscription } from '../../shared/types';

export const presentSubscription = (
  team: Team,
  subscription?: Object
): Subscription => {
  const shared = {
    userCount: team.userCount,
    freeUserLimit: FREE_USER_LIMIT,
  };

  if (team.stripeSubscriptionId && subscription) {
    const { status, plan } = subscription;
    return {
      ...shared,
      status,
      plan: plan.id.replace('subscription-', ''),
      planName: plan.nickname,
      unitAmount: plan.amount,
      periodAmount: plan.amount * subscription.quantity,
    };
  } else {
    return {
      ...shared,
      plan: 'free',
    };
  }
};
