// @flow
import * as React from 'react';
import Grid from 'styled-components-grid';
import { Helmet } from 'react-helmet';
import styled from 'styled-components';
import Header from './components/Header';

const Container = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 0 2em;

  pre {
    padding: 0.5em 1em;
    background: #f9fbfc;
    border-radius: 4px;
    border: 1px solid #e8ebed;
    overflow: scroll;
  }

  code {
    font-size: 15px;
  }

  table {
    border-collapse: collapse;

    thead {
      td {
        padding: 5px 12px 5px 0;
        border-bottom: 1px solid #ddd;
        vertical-align: bottom;
        font-weight: 500;
      }
    }

    tbody,
    thead {
      td {
        padding: 5px 12px 5px 0;
      }

      td:last-child {
        width: 100%;
        padding-right: 0;
      }
    }
  }

  h3 {
    code {
      font-size: 1.08em;
    }
  }
`;

export default function Pricing() {
  return (
    <Grid>
      <Helmet>
        <title>API Documentation - Outline</title>
      </Helmet>
      <Header>
        <h1>Documentation</h1>
        <p>The API is the heart and soul of Outline.</p>
      </Header>
      <Container>
        <p>
          As developers, it’s our mission to make the API as great as possible.
          While Outline is still in public beta, we might make small
          adjustments, including breaking changes to the API.
        </p>
        <h2>Making requests</h2>
        <p>
          Outline’s API follows simple RPC style conventions where each API
          endpoint is a method on{' '}
          <code>https://www.getoutline.com/api/&lt;METHOD&gt;</code>. Both{' '}
          <code>GET</code> and <code>POST</code> methods are supported but it’s
          recommeded that you make all call using <code>POST</code>. Only HTTPS
          is supported in production.
        </p>

        <p>
          For <code>GET</code> requests query string parameters are expected
          (e.g.
          <code>/api/document.info?id=...&token=...</code>). When making{' '}
          <code>POST</code> requests, request parameters are parsed depending on{' '}
          <code>Content-Type</code> header. To make a call using JSON payload,
          one must pass <code>Content-Type: application/json</code> header:
        </p>

        <p>
          <strong>Example POST request:</strong>
        </p>
        <pre>
          <code>
            {`curl https://www.getoutline.com/api/documents.info
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
            {`curl https://www.getoutline.com/api/documents.info?id=outline-api-NTpezNwhUP&token=API_KEY
`}
          </code>
        </pre>

        <h2>Authentication</h2>

        <p>
          To access private API endpoints, you must provide a valid API key. You
          can create new API keys in your{' '}
          <a href={`${process.env.URL}/settings`}>account settings</a>. Be
          careful when handling your keys as they give access to all of your
          documents.
        </p>

        <p>
          To authenticate with Outline API, you can supply the API key as a
          header (<code>Authorization: Bearer YOUR_API_KEY</code>) or as part of
          the payload using <code>token</code> parameter. If you’re making{' '}
          <code>GET</code> requests, header based authentication is recommended
          so that your keys don’t leak into logs.
        </p>

        <p>
          Some API endpoints allow unauhenticated requests for public resources
          and they can be called without an API key.
        </p>

        <h2>Errors</h2>

        <p>
          All successful API requests will be returned with <code>200</code>{' '}
          status code and <code>ok: true</code> in the response payload. If
          there’s an error while making the request, appropriate status code is
          returned with the <code>error</code> message:
        </p>

        <pre>
          <code>
            {`{
  "ok": false,
  "error: "Not Found"
}
`}
          </code>
        </pre>

        <h2>Methods</h2>
        <Methods>
          <Method method="auth.info" label="Get current auth">
            <Description>
              This method returns the user and team info for the user identified
              by the token.
            </Description>
            <Arguments />
          </Method>

          <Method method="users.info" label="Get current user">
            <Description>
              This method returns the profile info for the user identified by
              the token.
            </Description>
            <Arguments>
              <Argument id="id" description="Collection id" required />
            </Arguments>
          </Method>

          <Method method="users.s3Upload" label="Get S3 upload credentials">
            <Description>
              You can upload small files and images as part of your documents.
              All files are stored using Amazon S3. Instead of uploading files
              to Outline, you need to upload them directly to S3 with special
              credentials which can be obtained through this endpoint.
            </Description>
            <Arguments>
              <Argument
                id="filename"
                description="Filename of the uploaded file"
                required
              />
              <Argument
                id="kind"
                description="Mimetype of the document"
                required
              />
              <Argument
                id="size"
                description="Filesize of the document"
                required
              />
            </Arguments>
          </Method>

          <Method method="users.promote" label="Promote a new admin user">
            <Description>
              Promote a user to be a team admin. This endpoint is only available
              for admin users.
            </Description>
            <Arguments pagination>
              <Argument id="id" description="User ID to be promoted" required />
            </Arguments>
          </Method>

          <Method method="users.demote" label="Demote existing admin user">
            <Description>
              Demote existing team admin if there are more than one as one admin
              is always required. This endpoint is only available for admin
              users.
            </Description>
            <Arguments pagination>
              <Argument id="id" description="User ID to be demoted" required />
            </Arguments>
          </Method>

          <Method method="users.suspend" label="Suspend user account">
            <Description>
              Admin can suspend users to reduce the number of accounts on their
              billing plan or prevent them from accessing documention.
            </Description>
            <Arguments pagination>
              <Argument
                id="id"
                description="User ID to be suspended"
                required
              />
            </Arguments>
          </Method>

          <Method
            method="users.activate"
            label="Activate a suspended user account"
          >
            <Description>
              Admin can re-active a suspended user. This will update the billing
              plan and re-enable their access to the documention.
            </Description>
            <Arguments pagination>
              <Argument
                id="id"
                description="User ID to be activated"
                required
              />
            </Arguments>
          </Method>

          <Method
            method="collections.list"
            label="List your document collections"
          >
            <Description>List all your document collections.</Description>
            <Arguments pagination />
          </Method>

          <Method method="collections.info" label="Get a document collection">
            <Description>
              Returns detailed information on a document collection.
            </Description>
            <Arguments>
              <Argument id="id" description="Collection id" required />
            </Arguments>
          </Method>

          <Method
            method="collections.create"
            label="Create a document collection"
          >
            <Description>Creates a new document collection.</Description>
            <Arguments>
              <Argument id="name" description="Collection name" required />
              <Argument
                id="description"
                description="Short description for the collection"
              />
            </Arguments>
          </Method>

          <Method method="collections.update" label="Update a collection">
            <Description>
              This method allows you to modify already created document.
            </Description>
            <Arguments>
              <Argument id="id" description="Collection ID" required />
              <Argument id="name" description="Name for the collection" />
              <Argument
                id="color"
                description="Collection color in hex form (e.g. #E1E1E1)"
              />
            </Arguments>
          </Method>

          <Method method="collections.delete" label="Delete a collection">
            <Description>
              Delete a collection and all of its documents. This action can’t be
              undone so please be careful.
            </Description>
            <Arguments>
              <Argument id="id" description="Collection ID" required />
            </Arguments>
          </Method>

          <Method method="documents.list" label="List your documents">
            <Description>List all published documents.</Description>
            <Arguments pagination>
              <Argument
                id="collection"
                description="Collection ID to filter by"
              />
            </Arguments>
          </Method>

          <Method method="documents.drafts" label="List your draft documents">
            <Description>List all your draft documents.</Description>
          </Method>

          <Method method="documents.info" label="Get a document">
            <Description>
              <p>
                This method returns information for a document with a specific
                ID. The following identifiers are allowed:
              </p>
              <ul>
                <li>
                  UUID - <code>id</code> field of the document
                </li>
                <li>
                  URI identifier - Human readable identifier used in Outline
                  URLs (e.g. <code>outline-api-i48ZEZc5zjXndcP</code>)
                </li>
              </ul>
            </Description>
            <Arguments>
              <Argument id="id" description="Document ID or URI identifier" />
              <Argument id="shareId" description="An active shareId" />
            </Arguments>
          </Method>

          <Method method="documents.search" label="Search documents">
            <Description>
              This methods allows you to search all of your documents with
              keywords.
            </Description>
            <Arguments>
              <Argument id="query" description="Search query" required />
            </Arguments>
          </Method>

          <Method method="documents.create" label="Create a new document">
            <Description>
              This method allows you to publish a new document under an existing
              collection. By default a document is set to the parent collection
              root. If you want to create a subdocument, you can pass{' '}
              <code>parentDocument</code> to set parent document.
            </Description>
            <Arguments>
              <Argument
                id="collection"
                description={
                  <span>
                    <code>ID</code> of the collection to which the document is
                    created
                  </span>
                }
                required
              />
              <Argument
                id="title"
                description="Title for the document"
                required
              />
              <Argument
                id="text"
                description="Content of the document in Markdow"
                required
              />
              <Argument
                id="parentDocument"
                description={
                  <span>
                    <code>ID</code> of the parent document within the collection
                  </span>
                }
              />
              <Argument
                id="publish"
                description={
                  <span>
                    <code>true</code> by default. Pass <code>false</code> to
                    create a draft.
                  </span>
                }
              />
            </Arguments>
          </Method>

          <Method method="documents.update" label="Update a document">
            <Description>
              This method allows you to modify already created document.
            </Description>
            <Arguments>
              <Argument
                id="id"
                description="Document ID or URI identifier"
                required
              />
              <Argument id="title" description="Title for the document" />
              <Argument
                id="text"
                description="Content of the document in Markdown"
              />
              <Argument
                id="publish"
                description={
                  <span>
                    Pass <code>true</code> to publish a draft.
                  </span>
                }
              />
              <Argument
                id="autosave"
                description={
                  <span>
                    Pass <code>true</code> to signify an autosave. This skips
                    creating a revision.
                  </span>
                }
              />
              <Argument
                id="done"
                description={
                  <span>
                    Pass <code>true</code> to signify the end of an editing
                    session. This will trigger documents.update hooks.
                  </span>
                }
              />
            </Arguments>
          </Method>

          <Method method="documents.move" label="Move document in a collection">
            <Description>
              Move a document into a new location inside the collection. This is
              easily done by defining the parent document ID. If no parent
              document is provided, the document will be moved to the collection
              root.
            </Description>
            <Arguments>
              <Argument
                id="id"
                description="Document ID or URI identifier"
                required
              />
              <Argument
                id="parentDocument"
                description="ID of the new parent document (if any)"
              />
            </Arguments>
          </Method>

          <Method method="documents.delete" label="Delete a document">
            <Description>
              Delete a document and all of its child documents if any.
            </Description>
            <Arguments>
              <Argument
                id="id"
                description="Document ID or URI identifier"
                required
              />
            </Arguments>
          </Method>

          <Method method="documents.info" label="Get a document">
            <Description>
              Get a document with its ID or URL identifier from user’s
              collections.
            </Description>
            <Arguments>
              <Argument
                id="id"
                description="Document ID or URI identifier"
                required
              />
            </Arguments>
          </Method>

          <Method
            method="documents.restore"
            label="Restore a previous revision"
          >
            <Description>
              Restores a document to a previous revision by creating a new
              revision with the contents of the given revisionId.
            </Description>
            <Arguments>
              <Argument
                id="id"
                description="Document ID or URI identifier"
                required
              />
              <Argument
                id="revisionId"
                description="Revision ID to restore to"
                required
              />
            </Arguments>
          </Method>

          <Method method="documents.pin" label="Pin a document">
            <Description>
              Pins a document to the collection home. The pinned document is
              visible to all members of the team.
            </Description>
            <Arguments>
              <Argument
                id="id"
                description="Document ID or URI identifier"
                required
              />
            </Arguments>
          </Method>

          <Method method="documents.unpin" label="Unpin a document">
            <Description>
              Unpins a document from the collection home. It will still remain
              in the collection itself.
            </Description>
            <Arguments>
              <Argument
                id="id"
                description="Document ID or URI identifier"
                required
              />
            </Arguments>
          </Method>

          <Method method="documents.star" label="Star a document">
            <Description>
              Star (favorite) a document for authenticated user.
            </Description>
            <Arguments>
              <Argument
                id="id"
                description="Document ID or URI identifier"
                required
              />
            </Arguments>
          </Method>

          <Method method="documents.unstar" label="Unstar a document">
            <Description>
              Unstar a starred (favorited) document for authenticated user.
            </Description>
            <Arguments>
              <Argument
                id="id"
                description="Document ID or URI identifier"
                required
              />
            </Arguments>
          </Method>

          <Method
            method="documents.viewed"
            label="Get recently viewed document for user"
          >
            <Description>
              Return recently viewed documents for the authenticated user
            </Description>
            <Arguments pagination />
          </Method>

          <Method
            method="documents.starred"
            label="Get recently starred document for user"
          >
            <Description>
              Return recently starred documents for the authenticated user
            </Description>
            <Arguments pagination />
          </Method>

          <Method
            method="documents.pinned"
            label="Get pinned documents for a collection"
          >
            <Description>Return pinned documents for a collection</Description>
            <Arguments pagination />
          </Method>

          <Method
            method="documents.revision"
            label="Get revision for a document"
          >
            <Description>Return a specific revision of a document.</Description>
            <Arguments>
              <Argument
                id="id"
                description="Document ID or URI identifier"
                required
              />
              <Argument id="revisionId" description="Revision ID" required />
            </Arguments>
          </Method>

          <Method
            method="documents.revisions"
            label="Get revisions for a document"
          >
            <Description>
              Return revisions for a document. Upon each edit, a new revision is
              stored.
            </Description>
            <Arguments pagination>
              <Argument
                id="id"
                description="Document ID or URI identifier"
                required
              />
            </Arguments>
          </Method>

          <Method method="team.users" label="List team's users">
            <Description>
              List team`s users. This endpoint is only available for admin
              users.
            </Description>
            <Arguments pagination />
          </Method>

          <Method method="shares.list" label="List shared document links">
            <Description>
              List all your currently shared document links.
            </Description>
            <Arguments pagination />
          </Method>

          <Method method="shares.create" label="Create a share link">
            <Description>
              Creates a new share link that can be used by anyone to access a
              document. If you request multiple shares for the same document
              with the same user the same share will be returned.
            </Description>
            <Arguments>
              <Argument id="documentId" description="Document ID" required />
            </Arguments>
          </Method>

          <Method method="shares.revoke" label="Revoke a share link">
            <Description>
              Makes the share link inactive so that it can no longer be used to
              access the document.
            </Description>
            <Arguments>
              <Argument id="id" description="Share ID" required />
            </Arguments>
          </Method>
        </Methods>
      </Container>
    </Grid>
  );
}

const MethodList = styled.ul`
  margin-bottom: 80px;
`;

const Methods = (props: { children: React.Node }) => {
  const children = React.Children.toArray(props.children);
  const methods = children.map(child => child.props.method);

  return (
    <div>
      <MethodList>
        {methods.map(method => (
          <li key={method}>
            <a href={`#${method}`}>{method}</a>
          </li>
        ))}
      </MethodList>
      {children}
    </div>
  );
};

const MethodContainer = styled.div`
  margin-bottom: 80px;
`;

const Request = styled.h4`
  text-transform: capitalize;
`;

type MethodProps = {
  method: string,
  label: string,
  children: React.Node,
};

const Description = (props: { children: React.Node }) => (
  <p>{props.children}</p>
);

type ArgumentsProps = {
  pagination?: boolean,
  children?: React.Node | string,
};

const Arguments = (props: ArgumentsProps) => (
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
      {props.pagination && (
        // $FlowIssue
        <PaginationArguments />
      )}
      {props.children}
    </tbody>
  </table>
);

const Method = (props: MethodProps) => {
  const children = React.Children.toArray(props.children);
  const description = children.find(child => child.type === Description);
  const apiArgs = children.find(child => child.type === Arguments);

  return (
    <MethodContainer>
      <h3 id={props.method}>
        <code>{props.method}</code> - {props.label}
      </h3>
      <div>{description}</div>
      <Request>HTTP request & arguments</Request>
      <p>
        <code>{`${process.env.URL}/api/${props.method}`}</code>
      </p>
      {apiArgs}
    </MethodContainer>
  );
};

type ArgumentProps = {
  id: string,
  required?: boolean,
  description: React.Node | string,
};

const Argument = (props: ArgumentProps) => (
  <tr>
    <td>
      <code>{props.id}</code>
    </td>
    <td>
      <i>{props.required ? 'required' : 'optional'}</i>
    </td>
    <td>{props.description}</td>
  </tr>
);
const PaginationArguments = () => [
  <Argument id="offset" description="Pagination offset" />,
  <Argument id="limit" description="Pagination limit" />,
];
