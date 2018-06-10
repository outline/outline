// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { StripeProvider } from 'react-stripe-elements';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';

import Button from 'components/Button';
import BillingStore from 'stores/BillingStore';
import CenteredContent from 'components/CenteredContent';
import LoadingPlaceholder from 'components/LoadingPlaceholder';
import PageTitle from 'components/PageTitle';
import StripeForm from './components/StripeForm';

type Props = {
  billing: BillingStore,
};

@observer
class Billing extends React.Component<Props> {
  @observable stripe: ?Object = null;

  componentDidMount() {
    const { billing } = this.props;
    const { STRIPE_PUBLIC_KEY } = process.env;

    // Billing
    billing.fetchSubsciptionStatus();

    // Stripe
    if (window.Stripe) {
      this.stripe = window.Stripe(STRIPE_PUBLIC_KEY);
    } else {
      const element = document.querySelector('#stripe-js');
      if (!element) return;

      element.addEventListener('load', () => {
        this.stripe = window.Stripe(STRIPE_PUBLIC_KEY);
      });
    }
  }

  render() {
    const { billing } = this.props;

    return (
      <StripeProvider stripe={this.stripe}>
        <CenteredContent>
          <PageTitle title="Billing" />
          <h1>Billing</h1>

          {billing.data ? (
            <React.Fragment>
              <p>
                Your team currently has{' '}
                <strong>
                  {billing.data.userCount} active user{billing.data
                    .userCount !== 1 && 's'}
                </strong>.
              </p>
              {billing.data.plan === 'free' ? (
                <p>
                  You're on Outline`s free plan. Once have more than{' '}
                  {billing.data.freeUserLimit} users, you're asked to upgrade to
                  a paid plan.
                </p>
              ) : (
                <p>
                  Active plan: {billing.data.planName}
                  <br />
                  Plan status: {billing.data.status}
                  <br />
                  {billing.allowCancel && (
                    <Button onClick={billing.cancelSubscription} light>
                      Cancel Subscription
                    </Button>
                  )}
                </p>
              )}

              {billing.allowSubscription && (
                <div>
                  <Plan
                    type="yearly"
                    selected={billing.selectedPlan === 'yearly'}
                    onSelect={billing.selectPlan}
                  />
                  <Plan
                    type="monthly"
                    selected={billing.selectedPlan === 'monthly'}
                    onSelect={billing.selectPlan}
                  />
                  <StripeForm onSuccess={billing.subscribeToPlan} />
                </div>
              )}

              {billing.allowPaymentMethodChange && (
                <div>
                  update billing method:
                  <StripeForm onSuccess={billing.updatePlan} />
                </div>
              )}
            </React.Fragment>
          ) : (
            <LoadingPlaceholder />
          )}
        </CenteredContent>
      </StripeProvider>
    );
  }
}

// Split these out

const Plan = (props: {
  type: 'yearly' | 'monthly',
  selected: boolean,
  onSelect: ('yearly' | 'monthly') => void,
}) => {
  return (
    <PlanContainer
      onClick={() => props.onSelect(props.type)}
      selected={props.selected}
    >
      {props.type}
    </PlanContainer>
  );
};

const PlanContainer = styled(Flex)`
  border: 1px solid
    ${({ selected, theme }) => (selected ? theme.black : 'transparent')};
`;

export default inject('billing')(Billing);
