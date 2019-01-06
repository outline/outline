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
      <Hero style={{marginBottom: 44, marginTop: -55}}>
        <Grid reverse={{ mobile: true, tablet: false, desktop: false }}>
            <Grid.Unit size={{ tablet: 1 / 3 }}>
              <div id="authing-login-form-wrapper-invite"></div>
            </Grid.Unit>
            <Grid.Unit size={{ tablet: 2 / 3 }} style={{textAlign: 'right'}}>
              <h1>{team.name}</h1>
              <p>
                <strong>文化基因</strong> 邀请你加入大事记，与团队共享知识库
                <p>请通过左侧登录框使用微信扫码登录。</p>
              </p>
            </Grid.Unit>
        </Grid>
      </Hero>
    </Grid>
  );
}
