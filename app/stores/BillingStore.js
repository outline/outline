// @flow
import { observable, action, computed, runInAction } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import { type Subscription } from 'shared/types';
import AuthStore from './AuthStore';

type AvailablePlans = 'free' | 'monthly' | 'yearly';
type State = 'fetching' | 'subscribing' | 'canceling';

class BillingStore {
  auth: AuthStore;
  @observable data: ?Subscription; // TODO annotate
  @observable selectedPlan: AvailablePlans = 'free';
  @observable stripeToken: ?string;
  @observable coupon: ?string;
  @observable state: ?State;

  @computed
  get isLoaded(): boolean {
    return !!this.data;
  }

  @computed
  get qualifiesForFree(): boolean {
    return this.data
      ? this.data.userCount <= parseInt(process.env.FREE_USER_LIMIT, 10)
      : false;
  }

  @computed
  get plan(): string {
    return this.selectedPlan === 'free'
      ? this.selectedPlan
      : `subscription-${this.selectedPlan}`;
  }

  @computed
  get allowCancel(): boolean {
    return this.data ? this.data.status === 'active' : false;
  }

  @computed
  get allowSubscription(): boolean {
    return this.data
      ? this.data.status === 'canceled' || this.data.plan === 'free'
      : false;
  }

  @computed
  get allowPaymentMethodChange(): boolean {
    return this.data ? this.data.status === 'active' : false;
  }

  @action
  selectPlan = (plan: AvailablePlans) => {
    this.selectedPlan = plan;
  };

  @action
  fetchSubsciptionStatus = async () => {
    try {
      const res = await client.post('/subscription.status');
      invariant(res && res.data, 'Data should be available');
      const { data } = res;

      runInAction('fetchSubsciptionStatus', () => {
        this.data = data;
      });
    } catch (e) {
      console.error('Something went wrong');
    }
  };

  @action
  subscribeToPlan = async (stripeToken: string) => {
    this.state = 'subscribing';

    try {
      const res = await client.post('/subscription.create', {
        plan: this.plan,
        coupon: this.coupon,
        stripeToken,
      });
      invariant(res && res.data, 'Data should be available');
      const { data } = res;

      runInAction('subscribeToPlan', () => {
        this.data = data;
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.state = null;
    this.auth.fetch();
  };

  @action
  cancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?'))
      return;
    this.state = 'canceling';

    try {
      const res = await client.post('/subscription.cancel');
      invariant(res && res.data, 'Data should be available');
      const { data } = res;

      runInAction('cancelSubscription', () => {
        this.data = data;
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.state = null;
    this.auth.fetch();
  };

  @action
  updatePlan = async (stripeToken: string) => {
    this.state = 'subscribing';

    try {
      const res = await client.post('/subscription.update', {
        stripeToken,
      });
      invariant(res && res.data, 'Data should be available');
      const { data } = res;

      runInAction('updatePlan', () => {
        this.data = data;
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.state = null;
    this.auth.fetch();
  };

  constructor(options: { auth: AuthStore }) {
    this.auth = options.auth;
  }
}

export default BillingStore;
