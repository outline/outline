type Props = {
  expanded: boolean;
  children?: React.ReactNode;
};

const Folder: React.FC<Props> = ({ expanded, children }: Props) => {
  if (!expanded) {
    return null;
  }

  return <>{children}</>;
};

export default Folder;
