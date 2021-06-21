// @flow
import * as React from "react";
import theme from "../../shared/styles/theme";
import { User, Document, Team, Collection } from "../models";
import Body from "./components/Body";
import Button from "./components/Button";
import Diff from "./components/Diff";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

export type Props = {
  actor: User,
  team: Team,
  document: Document,
  collection: Collection,
  eventName: string,
  summary: string,
  unsubscribeUrl: string,
};

export const documentNotificationEmailText = ({
  actor,
  team,
  document,
  collection,
  eventName = "published",
}: Props) => `
"${document.title}" ${eventName}

${actor.name} ${eventName} the document "${document.title}", in the ${collection.name} collection.

Open Document: ${team.url}${document.url}
`;

export const DocumentNotificationEmail = ({
  actor,
  team,
  document,
  collection,
  eventName = "published",
  summary,
  unsubscribeUrl,
}: Props) => {
  return (
    <EmailTemplate>
      <Header />

      <Body>
        <Heading>
          "{document.title}" {eventName}
        </Heading>
        <p>
          {actor.name} {eventName} the document "{document.title}", in the{" "}
          {collection.name} collection.
        </p>
        {summary && (
          <>
            <EmptySpace height={20} />
            <Diff>
              <div dangerouslySetInnerHTML={{ __html: summary }} />
            </Diff>
            <EmptySpace height={20} />
          </>
        )}
        <p>
          <Button href={`${team.url}${document.url}`}>Open Document</Button>
        </p>
      </Body>

      <Footer unsubscribeUrl={unsubscribeUrl} />
    </EmailTemplate>
  );
};

export const css = `
  ins {
    background-color: #128a2929;
    text-decoration: none;
  }

  del {
    background-color: ${theme.slateLight};
    color: ${theme.slate};
    text-decoration: strikethrough;
  }

  ul {
    padding-left: 0;
  }

  .checkbox-list-item {
    list-style: none;
    padding: 4px 0;
    margin: 0;
  }

  .checkbox {
    font-size: 0;
    display: block;
    float: left;
    white-space: nowrap;
    width: 12px;
    height: 12px;
    margin-top: 2px;
    margin-right: 8px;
    border: 1px solid ${theme.textSecondary};
    border-radius: 3px;
  }
`;
