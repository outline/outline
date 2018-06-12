// @flow
import Stripe from 'stripe';
import { User, Team } from './models';
import { presentSubscription } from './presenters';

export const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

type Plan = 'free' | 'subscription-yearly' | 'subscription-monthly';

export const linkToStripe = async (options: { user: User, team: Team }) => {
  const { user, team } = options;
  if (team.stripeCustomerId) return;

  const stripeCustomer = await stripe.customers.create({
    description: team.name,
    email: stripe.email,
    metadata: {
      teamId: team.id,
      teamName: team.name,
      adminId: user.id,
      adminName: user.name,
    },
  });
  await team.update({
    stripeCustomerId: stripeCustomer.id,
  });
};

export const createSubscription = async (options: {
  user: User,
  team: Team,
  plan: Plan,
  stripeToken: string,
  coupon?: string,
}) => {
  const { team, plan, coupon, stripeToken } = options;

  // Update payment card on the customer
  await stripe.customers.update(team.stripeCustomerId, { source: stripeToken });

  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: team.stripeCustomerId,
    coupon: coupon,
    items: [
      {
        plan: plan,
        quantity: team.userCount,
      },
    ],
  });

  await team.update({
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: subscription.status,
  });

  // create event to track

  return presentSubscription(team, subscription);
};

export const subscriptionStatus = async (options: { team: Team }) => {
  const { team } = options;
  if (!team.stripeSubscriptionId) return presentSubscription(team);
  const subscription = await stripe.subscriptions.retrieve(
    team.stripeSubscriptionId
  );
  return presentSubscription(team, subscription);
};

export const cancelSubscription = async (options: { team: Team }) => {
  const { team } = options;
  if (!team.stripeSubscriptionId)
    throw new Error('Team is not registered with Stripe');
  const subscription = await stripe.subscriptions.del(
    team.stripeSubscriptionId
  );

  await team.update({
    stripeSubscriptionStatus: subscription.status,
  });

  return presentSubscription(team, subscription);
};

export const updateSubscription = async (options: {
  team: Team,
  stripeToken?: string,
}) => {
  const { team, stripeToken } = options;
  if (!team.stripeSubscriptionId)
    throw new Error('Team is not registered with Stripe');
  const subscription = await stripe.subscriptions.retrieve(
    team.stripeSubscriptionId
  );
  const subscriptionItem = subscription.items.data[0];

  // User count and plan
  if (subscriptionItem.quantity !== team.userCount) {
    await stripe.subscriptionItems.update(subscriptionItem.id, {
      quantity: team.userCount,
    });
  }

  // Payment method token
  if (stripeToken) {
    await stripe.subscriptions.update(subscription.id, { source: stripeToken });
  }

  const updatedSubscription = await stripe.subscriptions.retrieve(
    team.stripeSubscriptionId
  );
  await team.update({
    stripeSubscriptionStatus: updatedSubscription.status,
  });
  return presentSubscription(team, updatedSubscription);
};
