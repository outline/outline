// @flow
import * as React from 'react';
import Grid from 'styled-components-grid';
import { Helmet } from 'react-helmet';
import Hero from './components/Hero';

export default function Pricing(props) {
  const { team } = props;
  return (
    <Grid>
      <Helmet>
        <title>加入大事记</title>
      </Helmet>
      <Hero>
        <Grid reverse={{ mobile: true, tablet: false, desktop: false }}>
            <Grid.Unit size={{ tablet: 2 / 3 }}>
                <h1>{team.name}</h1>
                <p>
                    加入大事记，与团队共享知识库
                    <p>请通过右侧登录框选择使用 Github 登录或使用微信扫码登录。</p>
                </p>
            </Grid.Unit>
            <Grid.Unit size={{ tablet: 1 / 3 }}>
                <div id="authing-login-form-wrapper-invite"></div>
            </Grid.Unit>
        </Grid>
      </Hero>
    </Grid>
  );
}
