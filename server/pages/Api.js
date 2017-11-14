// @flow
import React from 'react';
import Grid from 'styled-components-grid';
import { Helmet } from 'react-helmet';
import Flex from '../../shared/components/Flex';

export default function Pricing() {
  return (
    <Grid>
      <Helmet>
        <title>Developer API</title>
      </Helmet>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1>Outline API</h1>
        <p>
          First thing we build for Outline was its API. It's the heart and sole of the service and
          as developers, it's our mission to make the API as rich and easy to use as possible.
        </p>
        <p>
          <i>
            While Outline is still in public beta, we might make small adjustments, including
            breaking changes to the API.
          </i>
        </p>
        <h2>Making requests</h2>
        <p>
          Outline's API follows simple RPC style conventions where each API endpoint is a method on{' '}
          <code>https://www.getoutline.com/api/&lt;METHOD&gt;</code>. Both <code>GET</code> and{' '}
          <code>POST</code> methods are supported but it's recommeded that you make all call using{' '}
          <code>POST</code>. Only HTTPS is supported in production.
        </p>

        <p>
          For <code>GET</code> requests query string parameters are expected (e.g.
          <code>/api/document.info?id=...&token=...</code>). When making <code>POST</code> requests,
          request parameters are parsed depending on <code>Content-Type</code> header. To make a
          call using JSON payload, one must pass <code>Content-Type: application/json</code> header:
        </p>

        <p>
          <strong>Example POST request:</strong>
        </p>
        <pre>
          <code>
            {`
curl https://www.getoutline.com/api/documents.info
  -X POST
  -H 'authorization: Bearer API_KEY'
  -H 'content-type: application/json'
  -H 'accept: application/json'
  -d '{"id": "outline-api-NTpezNwhUP"}'
`}
          </code>
        </pre>

        <p>
          <strong>Example GET request:</strong>
        </p>
        <pre>
          <code>
            {`
curl https://www.getoutline.com/api/documents.info?id=outline-api-NTpezNwhUP&token=API_KEY
`}
          </code>
        </pre>

        <h2>Authentication</h2>

        <p>
          To access private API endpoints, you must provide a valid API key. You can create new API
          keys in your <a href={`${process.env.URL}/settings`}>account settings</a>. Be careful when
          handling your keys as they give access to all of your documents.
        </p>

        <p>
          To authenticate with Outline API, you can supply the API key as a header (<code>
            Authorization: Bearer YOUR_API_KEY
          </code>) or as part of the payload using <code>token</code> parameter. If you're making{' '}
          <code>GET</code> requests, header based authentication is recommended so that your keys
          don't leak into logs.
        </p>

        <p>
          Some API endpoints allow unauhenticated requests for public resources and they can be
          called without an API key.
        </p>

        <h2>Errors</h2>

        <p>
          All successful API requests will be returned with <code>200</code> status code and{' '}
          <code>ok: true</code> in the response payload. If there's an error while making the
          request, appropriate status code is returned with the <code>error</code> message:
        </p>

        <pre>
          <code>
            {`
{
  "ok": false,
  "error: "Not Found"
}
`}
          </code>
        </pre>

        <h2>Methods</h2>

        <Method method="user.info" label="Get current user">
          <Description>
            This method returns the information for currently logged in user.
          </Description>
          <Arguments>
            <Argument id="id" description="Collection id" required />
          </Arguments>
        </Method>

        <Method method="user.s3Upload" label="Get S3 upload credentials">
          <Description>
            You can upload small files and images as part of your documents. All files are stored
            using Amazon S3. Instead of uploading files to Outline, you need to upload them directly
            to S3 with special credentials which can be obtained through this endpoint.
          </Description>
          <Arguments>
            <Argument id="filename" description="Filename of the uploaded file" required />
            <Argument id="kind" description="Mimetype of the document" required />
            <Argument id="size" description="Filesize of the document" required />
          </Arguments>
        </Method>

        <Method method="collections.list" label="List your document collections">
          <Description>List all your document collections.</Description>
          <Arguments pagination />
        </Method>

        <Method method="collections.info" label="Get a document collection">
          <Description>Returns detailed information on a document collection.</Description>
          <Arguments>
            <Argument id="id" description="Collection id" required />
          </Arguments>
        </Method>
      </div>
    </Grid>
  );
}

type MethodProps = {
  method: string,
  label: string,
  children: React.Element<*>,
};

const Method = (props: MethodProps) => {
  const children = React.Children.toArray(props.children);
  const description = children.find(child => child.type === Description);
  const apiArgs = children.find(child => child.type === Arguments);

  return (
    <div>
      <h3>
        <code>{props.method}</code> - {props.label}
      </h3>
      <div>{description}</div>
      <h4>Arguments</h4>
      <p>
        <code>{`${process.env.URL}/api/${props.method}`}</code>
      </p>
      {apiArgs}
    </div>
  );
};

const Description = (props: { children: React.Element<*> }) => <p>{props.children}</p>;
const Arguments = (props: { children: React.Element<*> }) => (
  <table>
    <thead>
      <tr>
        <td>Argument</td>
        <td>Required</td>
        <td>Description</td>
      </tr>
    </thead>
    <tbody>
      <Argument id="token" description="Authentication token" required />
      {props.pagination && <PaginationArguments />}
      {props.children}
    </tbody>
  </table>
);
const Argument = (props: { children: React.Element<*> }) => (
  <tr>
    <td>{props.id}</td>
    <td>{props.required ? 'required' : 'optional'}</td>
    <td>{props.description}</td>
  </tr>
);
const PaginationArguments = () => [
  <Argument id="offset" description="Pagination offset" />,
  <Argument id="limit" description="Pagination limit" />,
];
