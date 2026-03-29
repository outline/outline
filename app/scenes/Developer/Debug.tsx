import { Link } from "react-router-dom";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import { debugChangesetsPath } from "~/utils/routeHelpers";

export default function Debug() {
  return (
    <Scene title="Debug">
      <Heading>Debug</Heading>
      <ul style={{ paddingLeft: 16 }}>
        <li>
          <Link to={debugChangesetsPath()}>Changeset playground</Link>
        </li>
      </ul>
    </Scene>
  );
}
