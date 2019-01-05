// @flow
import * as React from 'react';
import { Helmet } from 'react-helmet';
import styled from 'styled-components';
import Grid from 'styled-components-grid';
import breakpoint from 'styled-components-breakpoint';
import AuthErrors from './components/AuthErrors';
import Hero from './components/Hero';
import HeroText from './components/HeroText';
import Centered from './components/Centered';
import SigninButtons from './components/SigninButtons';
import Flex from '../../shared/components/Flex';

type Props = {
  notice?: 'google-hd' | 'auth-error' | 'hd-not-allowed',
  lastSignedIn: string,
  googleSigninEnabled: boolean,
  slackSigninEnabled: boolean,
};

function Home(props: Props) {

  return (
    <span>
      <Helmet>
        <title>大事记 - 团队 wiki & 知识管理 - Powered by Authing.cn</title>
      </Helmet>
      <Grid>
        <Hero id="signin">
              <Grid reverse={{ mobile: true, tablet: false, desktop: false }}>
                <Grid.Unit size={{ tablet: 2 / 3 }}>
                  <h1>贵团队的专属知识库</h1>
                  <HeroText>
                    团队 wiki、文档、会议笔记、工作日志、脑暴记录等，远不止于此...
                  </HeroText>
                </Grid.Unit>
                <Grid.Unit size={{ tablet: 1 / 3 }}>
                  <div id="authing-login-form-wrapper"></div>
                </Grid.Unit>
              </Grid>
          <AuthErrors notice={props.notice} />
        </Hero>
        <Mask>
          <Features>
            <Centered>
              <Grid reverse={{ mobile: true, tablet: false, desktop: false }}>
                <Grid.Unit size={{ tablet: 1 / 3 }}>
                  <Feature>
                    <h2 style={{color: '#fff'}}>增进沟通</h2>
                    <p style={{color: '#fff'}}>
                      使用大事记可以非常容易的将贵团队的信息集中存储并具有可编程能力。不用反复查找文件夹、打开页面和发起聊天，团队中的每个人都可以通过其他人的文档来了解对方的想法。
                    </p>
                  </Feature>
                  <Feature>
                    <h2 style={{color: '#fff'}}>安全 &amp; 稳定</h2>
                    <p style={{color: '#fff'}}>
                      大事记提供了一个安全稳定的存储环境，所有内容都以 Markdown 形式存储。
                    </p>
                  </Feature>
                </Grid.Unit>
                <Feature size={{ tablet: 2 / 3 }}>
                  <Screenshot
                    srcSet="screenshot.png, screenshot@2x.png 2x"
                    src="/screenshot@2x.png"
                    alt="Outline Screenshot"
                  />
                </Feature>
              </Grid>
            </Centered>
          </Features>
        </Mask>
        <Centered id="features">
          <Grid>
            <Feature size={{ desktop: 1 / 3 }}>
              <h2>闪电一般快⚡️</h2>
              <p>
                大事记很快，非常快，我们花费了很大精力对速度进行了优化。无论是文档加载，还是搜索，抑或是体验交互，都做到了毫秒级的响应。
              </p>
            </Feature>
            <Feature size={{ desktop: 1 / 3 }} />
            <Feature size={{ desktop: 1 / 3 }}>
              <h2>支持 Markdown</h2>
              <p>
                所有的文档都以 Markdown 形式存储，导入导出都毫无压力。我们还提供了大量快捷键方便你更快的编写 Markdown。
              </p>
            </Feature>
          </Grid>
        </Centered>
        <Footer>
          <Centered>
            <Grid>
              <Grid.Unit size={{ desktop: 3 }}>
                <h2 style={{color: '#fff', textAlign: 'center'}}>创建账户</h2>
                <p style={{color: '#fff', textAlign: 'center'}}>
                  创建一个账户和你的团队一起使用，完全免费。
                </p>
              </Grid.Unit>
              <Grid.Unit size={{ desktop: 3 }}>
                <Flex justify="center" align="center">
                  <Button href={`/#signin`}>
                    <Spacer>立即注册</Spacer>
                  </Button>
                </Flex>
              </Grid.Unit>
            </Grid>
          </Centered>
        </Footer>
      </Grid>
    </span>
  );
}

const Screenshot = styled.img`
  width: 100%;
  box-shadow: 0 0 80px 0 rgba(124, 124, 124, 0.5),
    0 0 10px 0 rgba(237, 237, 237, 0.5);
  border-radius: 5px;

  ${breakpoint('desktop')`
    margin-top: -120px;
    margin-left: 120px;
    width: 135%;
  `};
`;

const Mask = styled.div`
  width: 100%;
  overflow: hidden;
  padding: 8em 0;
`;

const Features = styled.div`
  background: #00adff;
  padding: 0 2em;
  width: 100%;
`;

const Feature = styled(Grid.Unit)`
  padding: 2em 0;

  p {
    font-weight: 500;
    opacity: 0.8;
  }

  h2 {
    display: flex;
    font-size: 1.8em;
    align-items: center;
    margin-top: 0;
  }

  a {
    color: ${props => props.theme.black};
    text-decoration: underline;
    text-transform: uppercase;
    font-weight: 500;
    font-size: 14px;
  }

  ${breakpoint('tablet')`
    padding: 4em 0;
  `};
`;

const Footer = styled.div`
  background: #aa34f0;
  text-align: left;
  width: 100%;
  padding: 4em 2em;

  h2 {
    font-size: 1.8em;
    margin-top: 0;
  }

  p {
    margin-bottom: 0;
  }

  ${breakpoint('tablet')`
    margin: 2em 0;
    padding: 6em 4em;
  `};
`;

const Spacer = styled.span`
  padding-left: 0px;
`;

const Button = styled.a`
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  color: ${props => props.theme.white};
  background: ${props => props.theme.black};
  border-radius: 4px;
  font-weight: 600;
  height: 56px;
  margin-top: 22px;
`;

export default Home;
