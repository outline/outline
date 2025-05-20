import { Location } from "history";
import CenteredContent from "~/components/CenteredContent";
import PageTitle from "~/components/PageTitle";
import PlaceholderDocument from "~/components/PlaceholderDocument";
import Container from "./Container";

type Props = {
  location: Location<{ title?: string }>;
};

export default function Loading({ location }: Props) {
  return (
    <Container column auto>
      {location.state?.title && <PageTitle title={location.state.title} />}
      <CenteredContent>
        <PlaceholderDocument />
      </CenteredContent>
    </Container>
  );
}
