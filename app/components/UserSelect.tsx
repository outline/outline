import * as React from "react";
import type User from "~/models/User";
import { InputSelect } from "~/components/InputSelect";
import type { Option } from "~/components/InputSelect";
import { Avatar } from "~/components/Avatar";

type Props = {
  value: string;
  onChange: (value: string) => void;
  users: User[];
  placeholder?: string;
  disabled?: boolean;
};

export default function UserSelect({
  value,
  onChange,
  users,
  placeholder = "Выберите пользователя",
  disabled,
}: Props) {
  const options: Option[] = React.useMemo(
    () =>
      users.map((user) => ({
        type: "item" as const,
        label: user.name,
        value: user.id,
        icon: <Avatar model={user} size={16} />,
      })),
    [users]
  );

  return (
    <InputSelect
      value={value}
      onChange={onChange}
      options={options}
      label=""
      hideLabel
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}
