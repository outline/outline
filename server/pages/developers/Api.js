// @flow
import * as React from 'react';
import styled from 'styled-components';
import Grid from 'styled-components-grid';
import PageTitle from '../components/PageTitle';
import Header from '../components/Header';
import Content from '../components/Content';

export default function Api() {
  return (
    <Grid>
      <PageTitle title="API Reference" />
      <Header background="#AA34F0">
        <h1>API Reference</h1>
        <p>Outline is built on an open, best-in-class, API</p>
      </Header>
      <Content>
        <Methods>
          <Method method="auth.info" label="Get current auth">
            <Description>
              This method returns the user and team info for the user identified
              by the token.
            </Description>
            <Arguments />
          </Method>

          <Method method="events.list" label="List team's events">
            <Description>List all of the events in the team.</Description>
            <Arguments pagination>
              <Argument
                id="auditLog"
                description="Boolean. If user token has access, return auditing events"
              />
            </Arguments>
          </Method>

          <Method method="users.list" label="List team's users">
            <Description>List all of the users in the team.</Description>
            <Arguments pagination />
          </Method>

          <Method method="users.info" label="Get current user">
            <Description>
              This method returns the profile info for the user identified by
              the token.
            </Description>
            <Arguments>
              <Argument id="id" description="Collection ID" required />
            </Arguments>
          </Method>

          <Method method="users.s3Upload" label="Get S3 upload credentials">
            <Description>
              You can upload small files and images as part of your documents.
              All files are stored using Amazon S3. Instead of uploading files
              to Outline, you need to upload them directly to S3 with
              credentials which can be obtained through this endpoint.
            </Description>
            <Arguments>
              <Argument
                id="name"
                description="Name of the uploaded file"
                required
              />
              <Argument
                id="contentType"
                description="Mimetype of the file"
                required
              />
              <Argument
                id="size"
                description="Size in bytes of the file"
                required
              />
              <Argument
                id="documentId"
                description="ID of the associated document"
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

          <Method method="collections.info" label="Get a collection">
            <Description>
              Returns detailed information on a document collection.
            </Description>
            <Arguments>
              <Argument id="id" description="Collection ID" required />
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

          <Method method="collections.export" label="Export a collection">
            <Description>
              Returns a zip file of all the collections documents in markdown
              format. If documents are nested then they will be nested in
              folders inside the zip file.
            </Description>
            <Arguments>
              <Argument id="id" description="Collection ID" required />
            </Arguments>
          </Method>

          <Method method="collections.exportAll" label="Export all collections">
            <Description>
              Returns a zip file of all the collections or creates an async job
              to send a zip file via email to the authenticated user. If
              documents are nested then they will be nested in folders inside
              the zip file.
            </Description>
            <Arguments>
              <Argument
                id="download"
                description="Download as zip (default is email)"
              />
            </Arguments>
          </Method>

          <Method method="collections.update" label="Update a collection">
            <Description>
              This method allows you to modify an already created collection.
            </Description>
            <Arguments>
              <Argument id="id" description="Collection ID" required />
              <Argument id="name" description="Name for the collection" />
              <Argument id="private" description="Boolean" />
              <Argument
                id="color"
                description="Collection color in hex form (e.g. #E1E1E1)"
              />
            </Arguments>
          </Method>

          <Method method="collections.add_user" label="Add a collection member">
            <Description>
              This method allows you to add a user to a private collection.
            </Description>
            <Arguments>
              <Argument id="id" description="Collection ID" required />
              <Argument
                id="userId"
                description="User ID to add to the collection"
              />
            </Arguments>
          </Method>

          <Method
            method="collections.remove_user"
            label="Remove a collection member"
          >
            <Description>
              This method allows you to remove a user from a private collection.
            </Description>
            <Arguments>
              <Argument id="id" description="Collection ID" required />
              <Argument
                id="userId"
                description="User ID to remove from the collection"
              />
            </Arguments>
          </Method>

          <Method
            method="collections.add_group"
            label="Add a group to a collection"
          >
            <Description>
              This method allows you to give all members in a group access to a
              collection.
            </Description>
            <Arguments>
              <Argument id="id" description="Collection ID" required />
              <Argument
                id="groupId"
                description="Group ID to add to the collection"
              />
            </Arguments>
          </Method>

          <Method
            method="collections.remove_group"
            label="Remove a group from a collection"
          >
            <Description>
              This method allows you to revoke all members in a group access to
              a collection. Note that members of the group may still retain
              access through other groups or individual memberships.
            </Description>
            <Arguments>
              <Argument id="id" description="Collection ID" required />
              <Argument
                id="groupId"
                description="Group ID to remove from the collection"
              />
            </Arguments>
          </Method>

          <Method
            method="collections.memberships"
            label="List collection members"
          >
            <Description>
              This method allows you to list a collections individual
              memberships. This is both a collections maintainers, and user
              permissions for read and write if the collection is private
            </Description>
            <Arguments pagination>
              <Argument id="id" description="Collection ID" required />
              <Argument id="query" description="Filter results by user name" />
              <Argument
                id="permission"
                description="Filter results by permission"
              />
            </Arguments>
          </Method>

          <Method
            method="collections.group_memberships"
            label="List collection group members"
          >
            <Description>
              This method allows you to list a collections group memberships.
              This is the list of groups that have been given access to the
              collection.
            </Description>
            <Arguments pagination>
              <Argument id="id" description="Collection ID" required />
              <Argument id="query" description="Filter results by group name" />
              <Argument
                id="permission"
                description="Filter results by permission"
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
              <Argument id="user" description="User ID to filter by" />
              <Argument
                id="backlinkDocumentId"
                description="Backlinked document ID to filter by"
              />
              <Argument
                id="parentDocumentId"
                description="Parent document ID to filter by"
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
                  UUID - <Code>id</Code> field of the document
                </li>
                <li>
                  URI identifier - Human readable identifier used in Outline
                  URLs (e.g. <Code>outline-api-i48ZEZc5zjXndcP</Code>)
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
              This methods allows you to search your teams documents with
              keywords. Search results will be restricted to those accessible by
              the current access token.
            </Description>
            <Arguments>
              <Argument id="query" description="Search query" required />
              <Argument id="userId" description="User ID" />
              <Argument id="collectionId" description="Collection ID" />
              <Argument id="includeArchived" description="Boolean" />
              <Argument id="includeDrafts" description="Boolean" />
              <Argument
                id="dateFilter"
                description="Date range to consider (day, week, month or year)"
              />
            </Arguments>
          </Method>

          <Method method="documents.create" label="Create a new document">
            <Description>
              This method allows you to publish a new document under an existing
              collection. By default a document is set to the parent collection
              root. If you want to create a subdocument, you can pass{' '}
              <Code>parentDocumentId</Code> to set parent document.
            </Description>
            <Arguments>
              <Argument
                id="collectionId"
                description={
                  <span>
                    <Code>ID</Code> of the collection to which the document is
                    created
                  </span>
                }
                required
              />
              <Argument id="title" description="Title for the document" />
              <Argument
                id="text"
                description="Content of the document in Markdow"
                required
              />
              <Argument
                id="parentDocumentId"
                description={
                  <span>
                    <Code>ID</Code> of the parent document within the collection
                  </span>
                }
              />
              <Argument
                id="publish"
                description={
                  <span>
                    <Code>true</Code> by default. Pass <Code>false</Code> to
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
                    Pass <Code>true</Code> to publish a draft.
                  </span>
                }
              />
              <Argument
                id="append"
                description={
                  <span>
                    Pass <Code>true</Code> to append the text parameter to the
                    end of the document rather than replace.
                  </span>
                }
              />
              <Argument
                id="autosave"
                description={
                  <span>
                    Pass <Code>true</Code> to signify an autosave. This skips
                    creating a revision.
                  </span>
                }
              />
              <Argument
                id="done"
                description={
                  <span>
                    Pass <Code>true</Code> to signify the end of an editing
                    session. This will trigger update notifications.
                  </span>
                }
              />
            </Arguments>
          </Method>

          <Method method="documents.move" label="Move document in a collection">
            <Description>
              Move a document to a new location or collection. If no parent
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
                id="collectionId"
                description="ID of the collection"
                required
              />
              <Argument
                id="parentDocumentId"
                description="ID of the new parent document"
              />
            </Arguments>
          </Method>

          <Method method="documents.archive" label="Archive a document">
            <Description>
              Archive a document and all of its nested documents, if any.
            </Description>
            <Arguments>
              <Argument
                id="id"
                description="Document ID or URI identifier"
                required
              />
            </Arguments>
          </Method>

          <Method method="documents.delete" label="Delete a document">
            <Description>
              Permanently delete a document and all of its nested documents, if
              any.
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
              revision with the contents of the given revisionId or restores an
              archived document if no revisionId is passed.
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
            <Arguments pagination>
              <Argument
                id="collectionId"
                description="Collection ID"
                required
              />
            </Arguments>
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

          <Method method="groups.create" label="Create a group">
            <Description>
              This method allows you to create a new group to organize people in
              the team.
            </Description>
            <Arguments pagination>
              <Argument
                id="name"
                description="The name of the group"
                required
              />
            </Arguments>
          </Method>

          <Method method="groups.update" label="Update a group">
            <Description>
              This method allows you to update an existing group. At this time
              the only field that can be edited is the name.
            </Description>
            <Arguments pagination>
              <Argument id="id" description="Group ID" required />
              <Argument
                id="name"
                description="The name of the group"
                required
              />
            </Arguments>
          </Method>

          <Method method="groups.delete" label="Delete a group">
            <Description>
              Deleting a group will cause all of its members to lose access to
              any collections the group has been given access to. This action
              can’t be undone so please be careful.
            </Description>
            <Arguments>
              <Argument id="id" description="Group ID" required />
            </Arguments>
          </Method>

          <Method method="groups.info" label="Get a group">
            <Description>Returns detailed information on a group.</Description>
            <Arguments>
              <Argument id="id" description="Group ID" required />
            </Arguments>
          </Method>

          <Method method="groups.list" label="List groups">
            <Description>
              List all groups the current user has access to.
            </Description>
            <Arguments pagination />
          </Method>

          <Method
            method="groups.memberships"
            label="List the group memberships"
          >
            <Description>
              List members in a group, the query parameter allows filtering by
              user name.
            </Description>
            <Arguments pagination>
              <Argument id="id" description="Group ID" />
              <Argument id="query" description="Search query" />
            </Arguments>
          </Method>

          <Method method="groups.add_user" label="Add a group member">
            <Description>
              This method allows you to add a user to a group.
            </Description>
            <Arguments>
              <Argument id="id" description="Group ID" required />
              <Argument id="userId" description="User ID to add to the group" />
            </Arguments>
          </Method>

          <Method method="groups.remove_user" label="Remove a group member">
            <Description>
              This method allows you to remove a user from a group.
            </Description>
            <Arguments>
              <Argument id="id" description="Group ID" required />
              <Argument
                id="userId"
                description="User ID to remove from the group"
              />
            </Arguments>
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

          <Method method="views.list" label="List document views">
            <Description>
              List all users that have viewed a document and the overall view
              count.
            </Description>
            <Arguments>
              <Argument id="documentId" description="Document ID" required />
            </Arguments>
          </Method>

          <Method method="views.create" label="Create a document view">
            <Description>
              Creates a new view for a document. This is documented in the
              interests of thoroughness however it is recommended that views are
              not created from outside of the Outline UI.
            </Description>
            <Arguments>
              <Argument id="documentId" description="Document ID" required />
            </Arguments>
          </Method>
        </Methods>
      </Content>
    </Grid>
  );
}

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

const Methods = (props: { children: React.Node }) => {
  const children = React.Children.toArray(props.children);
  const methods = children.map(child => child.props.method);

  return (
    <React.Fragment>
      <Grid>
        <Grid.Unit
          size={{ tablet: 1 / 4 }}
          visible={{ mobile: false, tablet: true }}
        >
          <nav>
            <h2>Reference</h2>
            <List>
              {methods.map(method => (
                <li key={method}>
                  <MenuItem href={`#${method}`}>{method}</MenuItem>
                </li>
              ))}
            </List>
          </nav>
        </Grid.Unit>
        <Grid.Unit size={{ tablet: 3 / 4 }}>{children}</Grid.Unit>
      </Grid>
    </React.Fragment>
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

const Table = styled.table`
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
`;

const Arguments = (props: ArgumentsProps) => (
  <Table>
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
  </Table>
);

const Heading = styled.h3`
  code {
    font-size: 1em;
    padding: 2px 4px;
    background: #333;
    border-radius: 4px;
    color: #fff;
  }
`;

const Code = styled.code`
  font-size: 15px;
`;

const Method = (props: MethodProps) => {
  const children = React.Children.toArray(props.children);
  const description = children.find(child => child.type === Description);
  const apiArgs = children.find(child => child.type === Arguments);

  return (
    <MethodContainer>
      <Heading id={props.method}>
        <code>{props.method}</code> {props.label}
      </Heading>
      <div>{description}</div>
      <Request>HTTP request & arguments</Request>
      <p>
        <Code>{`${process.env.URL}/api/${props.method}`}</Code>
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
      <Code>{props.id}</Code>
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
