import times from "lodash/times";
import * as React from "react";
import { AvatarSize } from "~/components/Avatar";
import Fade from "~/components/Fade";
import PlaceholderText from "~/components/PlaceholderText";
import { ListItem } from "../components/ListItem";

type Props = {
  count?: number;
};

/**
 * Placeholder for a list item in the share popover.
 */
export function Placeholder({ count = 1 }: Props) {
  return (
    <Fade>
      {times(count, (index) => (
        <ListItem
          key={index}
          image={
            <PlaceholderText
              width={AvatarSize.Medium}
              height={AvatarSize.Medium}
            />
          }
          title={
            <PlaceholderText
              maxWidth={50}
              minWidth={30}
              height={14}
              style={{ marginTop: 4, marginBottom: 4 }}
            />
          }
          subtitle={
            <PlaceholderText
              maxWidth={75}
              minWidth={50}
              height={12}
              style={{ marginBottom: 4 }}
            />
          }
        />
      ))}
    </Fade>
  );
}
