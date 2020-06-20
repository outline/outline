// @flow
import * as React from "react";
import Grid from "styled-components-grid";
import styled from "styled-components";
import PageTitle from "../components/PageTitle";
import Header from "../components/Header";
import Content from "../components/Content";

export default function Developers() {
  return (
    <Grid>
      <PageTitle title="Developers" />
      <Header background="#AA34F0">
        <h1>Developers</h1>
        <p>Outline is built on an open, best-in-class, API</p>
      </Header>
      <Content>
        <Grid>
          <Grid.Unit
            size={{ tablet: 1 / 4 }}
            visible={{ mobile: false, tablet: true }}
          >
            <nav>
              <h2>Introduction</h2>
              <List>
                <li>
                  <MenuItem href="#requests">Making requests</MenuItem>
                </li>
                <li>
                  <MenuItem href="#authentication">Authentication</MenuItem>
                </li>
                <li>
                  <MenuItem href="#errors">Errors</MenuItem>
                </li>
              </List>
              <h2>API</h2>
              <List>
                <li>
                  <MenuItem href="/developers/api">Reference</MenuItem>
                </li>
              </List>
            </nav>
          </Grid.Unit>
          <Grid.Unit size={{ tablet: 3 / 4 }}>
            <p>
              As developers, it’s our mission to make the API as great as
              possible. While Outline is still in public beta, we might make
              small adjustments, including breaking changes to the API.
            </p>

            <h2 id="requests">Making requests</h2>
            <p>
              Outline’s API follows simple RPC style conventions where each API
              endpoint is a method on{" "}
              <Code>https://www.getoutline.com/api/&lt;METHOD&gt;</Code>. Both{" "}
              <Code>GET</Code> and <Code>POST</Code> methods are supported but
              it’s recommended that you make all calls using <Code>POST</Code>.
              Only HTTPS is supported in production.
            </p>

            <p>
              For <Code>GET</Code> requests query string parameters are expected
              (e.g.
              <Code>/api/document.info?id=...&token=...</Code>). When making{" "}
              <Code>POST</Code> requests, request parameters are parsed
              depending on <Code>Content-Type</Code> header. To make a call
              using JSON payload, one must pass{" "}
              <Code>Content-Type: application/json</Code> header:
            </p>

            <p>
              <strong>Example POST request:</strong>
            </p>
            <Pre>
              <Code>
                {`curl https://www.getoutline.com/api/documents.info
  -X POST
  -H 'authorization: Bearer API_KEY'
  -H 'content-type: application/json'
  -H 'accept: application/json'
  -d '{"id": "outline-api-NTpezNwhUP"}'
`}
              </Code>
            </Pre>

            <p>
              <strong>Example GET request:</strong>
            </p>
            <Pre>
              <Code>
                {`curl https://www.getoutline.com/api/documents.info?id=outline-api-NTpezNwhUP&token=API_KEY
`}
              </Code>
            </Pre>

            <h2 id="authentication">Authentication</h2>

            <p>
              To access private API endpoints, you must provide a valid API key.
              You can create new API keys in your{" "}
              <a href={`${process.env.URL}/settings`}>account settings</a>. Be
              careful when handling your keys as they give access to all of your
              documents.
            </p>

            <p>
              To authenticate with Outline API, you can supply the API key as a
              header (<Code>Authorization: Bearer YOUR_API_KEY</Code>) or as
              part of the payload using <Code>token</Code> parameter. If you’re
              making <Code>GET</Code> requests, header based authentication is
              recommended so that your keys don’t leak into logs.
            </p>

            <p>
              Some API endpoints allow unauhenticated requests for public
              resources and they can be called without an API key.
            </p>

            <h2 id="errors">Errors</h2>

            <p>
              All successful API requests will be returned with <Code>200</Code>{" "}
              status code and <Code>ok: true</Code> in the response payload. If
              there’s an error while making the request, appropriate status code
              is returned with the <Code>error</Code> message:
            </p>

            <Pre>
              <Code>
                {`{
  "ok": false,
  "error: "Not Found"
}
`}
              </Code>
            </Pre>
          </Grid.Unit>
        </Grid>
      </Content>
    </Grid>
  );
}

const Pre = styled.pre`
  padding: 0.5em 1em;
  background: #f9fbfc;
  border-radius: 4px;
  border: 1px solid #e8ebed;
  overflow: auto;
`;

const Code = styled.code`
  font-size: 15px;
`;

const MenuItem = styled.a`
  display: flex;
  align-items: center;
  font-size: 16px;
  color: ${props => props.theme.text};
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;
