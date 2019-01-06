// @flow
import * as React from 'react';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import Grid from 'styled-components-grid';
import { Helmet } from 'react-helmet';
import Header from './components/Header';
import Content from './components/Content';
import Button from './components/Button';
import Notice from '../../shared/components/Notice';

export default function Pricing() {
  return (
    <Grid>
      <Helmet>
        <title>Pricing</title>
      </Helmet>
      <Header background="#00adff">
        <h1>Our Pricing</h1>
        <p>Our pricing is simple. You’ll only pay for what you use.</p>
      </Header>
      <Content>
        <Grid>
          <Plan
            size={{ desktop: 1 / 2 }}
            itemScope
            itemType="http://schema.org/Product"
          >
            <div>
              <Name itemprop="name">Free</Name>
              <Price>
                <span itemprop="priceCurrency" content="USD">
                  $
                </span>
                <span itemprop="price">0</span>
              </Price>
            </div>
            <div itemprop="description">
              <h4>Top features:</h4>
              <ul>
                <li>Upto 5 team members</li>
                <li>Unlimited documents</li>
                <li>All integrations</li>
                <li>API access</li>
              </ul>
            </div>
          </Plan>
          <Plan
            size={{ desktop: 1 / 2 }}
            itemScope
            itemType="http://schema.org/Product"
          >
            <div>
              <Name itemprop="name">Standard</Name>
              <Price>
                <span itemprop="priceCurrency" content="USD">
                  $
                </span>
                <span itemprop="price">5</span>{' '}
                <Period>per seat per month</Period>
              </Price>
            </div>
            <div itemprop="description">
              <h4>Top features:</h4>
              <ul>
                <li>Unlimited team members</li>
                <li>Unlimited documents</li>
                <li>Unlimited version history</li>
                <li>Email support</li>
              </ul>
            </div>
            <Notice>
              Note: Outline is currently in Beta. This plan is currently free
              until public release in Q1 2019.
            </Notice>
          </Plan>
        </Grid>
      </Content>
      <Content>
        <h2>Self Hosted</h2>
        <p>Host your own instance on-premise or in the cloud</p>
        <Grid>
          <Plan
            size={{ desktop: 1 / 2 }}
            itemScope
            itemType="http://schema.org/Product"
          >
            <div>
              <Name itemprop="name">Open Source</Name>
              <Price>
                <span itemprop="priceCurrency" content="USD">
                  $
                </span>
                <span itemprop="price">0</span>
              </Price>
            </div>
            <p itemprop="description">
              Outline’s codebase is open source. If you wish to run the service
              on your own infrastructure you can do so.
            </p>
            <p>
              <Button>GitHub</Button>
            </p>
          </Plan>
          <Plan
            size={{ desktop: 1 / 2 }}
            itemScope
            itemType="http://schema.org/Product"
          >
            <div>
              <Name itemprop="name">Enterprise</Name>
              <Price>
                <span itemprop="priceCurrency" content="USD">
                  $
                </span>
                <span itemprop="price">199</span> <Period>per month</Period>
              </Price>
            </div>

            <p itemprop="description">
              Run Outline on your own infrastructure. Get dedicated support with
              setup, maintainence, and product issues.
            </p>
            <p>
              <Button>Contact Us</Button>
            </p>
          </Plan>
        </Grid>
      </Content>
    </Grid>
  );
}

const Plan = styled(Grid.Unit)`
  padding: 2em 0;
  position: relative;

  &:before {
    display: none;
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.theme.smoke};
    transform: skewX(2deg);
    z-index: -1;
    margin: 0 2em;

    ${breakpoint('tablet')`
      display: block;
    `};
  }

  ${breakpoint('tablet')`
    padding: 2em 6em;
  `};

  ul {
    padding: 0;
    list-style: none;

    li {
      &:before {
        content: '✓';
        margin-right: 6px;
        font-weight: 600;
        color: ${props => props.theme.primary};
      }
    }
  }
`;

const Name = styled.h3`
  text-align: center;
`;

const Price = styled.h2`
  text-align: center;
  font-size: 2.5em;
  min-height: 90px;
  margin-top: 0;

  span {
    font-size: 1em;
  }
`;

const Period = styled.p`
  font-size: 13px;
  color: ${props => props.theme.slateDark};
`;
