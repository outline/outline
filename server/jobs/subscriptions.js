// @flow
import Queue from 'bull';
import { Team } from '../models';
import * as Stripe from '../stripe';

export const subscriptionsQueue = new Queue(
  'subscriptions',
  process.env.REDIS_URL
);

subscriptionsQueue.process(async function(job) {
  const team = await Team.findById(job.data.teamId);

  if (job.data.type === 'updateSubscription') {
    await Stripe.updateSubscription({ team });
  }
});
