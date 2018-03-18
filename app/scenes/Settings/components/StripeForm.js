// @flow
import React from 'react';
import { Elements, CardElement, injectStripe } from 'react-stripe-elements';
import styled from 'styled-components';
import invariant from 'invariant';

import Button from 'components/Button';
import { color } from 'shared/styles/constants';

class StripeForm extends React.Component {
  props: {
    onSuccess: string => Promise<void>,
  };

  render() {
    return (
      <Elements>
        <CardInputForm onSuccess={this.props.onSuccess} />
      </Elements>
    );
  }
}

@injectStripe
class CardInputForm extends React.Component {
  props: {
    onSuccess: string => Promise<void>,
    stripe?: {
      createToken: () => void,
    },
  };

  handleSubmit = async ev => {
    ev.preventDefault();
    invariant(this.props.stripe, 'Stripe must exist');

    try {
      const res = await this.props.stripe.createToken();
      invariant(res, 'res is available');
      const { token, error } = res;

      if (token) {
        this.props.onSuccess(token.id);
      } else {
        alert(error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <StyledCardElement
          style={{
            base: {
              color: color.text,
              fontSize: '18px',
              fontFamily: 'monospace',
              '::placeholder': {
                color: color.slate,
              },
            },
          }}
        />
        <Button type="submit">Subscribe</Button>
      </form>
    );
  }
}

const StyledCardElement = styled(CardElement)`
  padding: 8px 12px;
  border-width: 1px;
  border-style: solid;
  border-color: ${props => color.slateLight};
  border-radius: 4px;
`;

export default StripeForm;
