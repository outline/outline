import { observer } from "mobx-react";
import type * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { UserHoverCard } from "~/components/UserHoverCard";
import useCurrentUser from "~/hooks/useCurrentUser";
import useOwners from "~/hooks/useOwners";
import type User from "~/models/User";

type Props = {
  /** The ids of the owners to describe. */
  ownerIds: string[];
};

/**
 * Describes who owns a document or collection, with a profile card on each
 * name. Renders nothing when there are no owners.
 */
function OwnersLabel({ ownerIds }: Props) {
  const { t } = useTranslation();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const owners = useOwners(ownerIds);

  if (owners.length === 0) {
    return null;
  }

  const isOwner = !!user && owners.some((owner) => owner.id === user.id);
  const others = owners.filter((owner) => owner.id !== user?.id);

  if (isOwner) {
    if (others.length === 0) {
      return <span>{t("Owned by you")}</span>;
    }
    if (others.length > 1) {
      return (
        <span>
          {t("Owned by you and {{ count }} others", { count: others.length })}
        </span>
      );
    }
    return (
      <span>
        <Trans
          defaults="Owned by you and <owner>{{ name }}</owner>"
          values={{ name: others[0].name }}
          components={{ owner: <OwnerName user={others[0]} /> }}
        />
      </span>
    );
  }

  if (others.length === 1) {
    return (
      <span>
        <Trans
          defaults="Owned by <owner>{{ name }}</owner>"
          values={{ name: others[0].name }}
          components={{ owner: <OwnerName user={others[0]} /> }}
        />
      </span>
    );
  }

  if (others.length === 2) {
    return (
      <span>
        <Trans
          defaults="Owned by <owner>{{ name }}</owner> and <other>{{ otherName }}</other>"
          values={{ name: others[0].name, otherName: others[1].name }}
          components={{
            owner: <OwnerName user={others[0]} />,
            other: <OwnerName user={others[1]} />,
          }}
        />
      </span>
    );
  }

  return (
    <span>
      <Trans
        count={others.length - 1}
        defaults="Owned by <owner>{{ name }}</owner> and {{ count }} others"
        values={{ name: others[0].name, count: others.length - 1 }}
        components={{ owner: <OwnerName user={others[0]} /> }}
      />
    </span>
  );
}

type OwnerNameProps = {
  /** The owner to show a profile card for. */
  user: User;
  /** The translated name, provided by Trans. */
  children?: React.ReactNode;
};

function OwnerName({ user, children }: OwnerNameProps) {
  return (
    <UserHoverCard user={user}>
      <span>{children}</span>
    </UserHoverCard>
  );
}

export default observer(OwnersLabel);
