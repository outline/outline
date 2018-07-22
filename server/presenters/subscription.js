// @flow
import { Team } from '../models';
import type { Subscription } from '../../shared/types';

function present(team: Team, subscription?: Object): Subscription {
  const shared = {
    userCount: team.userCount,
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
  }

  return {
    ...shared,
    plan: 'free',
  };
}

export default present;
