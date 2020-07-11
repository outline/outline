// @flow
import * as React from "react";
import { Table, TBody, TR, TD } from "oy-vey";
import { User, Document, Revision, Team, Collection } from "../models";
import EmailTemplate from "./components/EmailLayout";
import Body from "./components/Body";
import Button from "./components/Button";
import Heading from "./components/Heading";
import Header from "./components/Header";
import Footer from "./components/Footer";
import EmptySpace from "./components/EmptySpace";
import { compactedDiff } from "../utils/diff";
import theme from "../../shared/styles/theme";

export type Props = {
  actor: User,
  team: Team,
  document: Document,
  previous: Revision,
  collection: Collection,
  eventName: string,
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

${actor.name} ${eventName} the document "${document.title}", in the ${
  collection.name
} collection.

Open Document: ${team.url}${document.url}
`;

export const DocumentNotificationEmail = ({
  actor,
  team,
  document,
  previous,
  collection,
  eventName = "published",
  unsubscribeUrl,
}: Props) => {
  const diffHtml = compactedDiff(
    previous ? previous.toMarkdown() : "",
    document.toMarkdown()
  );

  return (
    <EmailTemplate>
      <Table padding="20" width="100%">
        <TBody>
          <TR>
            <TD align="left">
              <Header />
            </TD>
            <TD align="right">
              <EmptySpace height={40} />
              <Button href={`${team.url}${document.url}`}>Open Document</Button>
            </TD>
          </TR>
        </TBody>
      </Table>
      <Body>
        <Heading>
          "{document.title}" {eventName}
        </Heading>
        <EmptySpace height={10} />
        <Table padding="20" width="100%">
          <TBody>
            <TR>
              <TD
                align="left"
                style={{
                  border: `1px solid ${theme.slateLight}`,
                  borderRadius: "4px 4px 0 0",
                  padding: "20px",
                }}
              >
                {actor.name} {eventName} the document
              </TD>
            </TR>
            {!!diffHtml && (
              <TR>
                <TD
                  align="left"
                  padding="20"
                  style={{
                    border: `1px solid ${theme.slateLight}`,
                    background: "#F7F9FA",
                    borderRadius: "0 0 4px 4px",
                    borderTop: "none",
                    padding: "20px",
                  }}
                >
                  <span
                    dangerouslySetInnerHTML={{
                      __html: diffHtml,
                    }}
                  />
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
        <EmptySpace height={10} />
      </Body>
      <Footer unsubscribeUrl={unsubscribeUrl} />
    </EmailTemplate>
  );
};
