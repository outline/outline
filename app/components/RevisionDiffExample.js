// @flow
import * as React from "react";
import styled from "styled-components";
import { client } from "utils/ApiClient";

export default function RevisionDiffExample() {
  const [diff, setDiff] = React.useState("");

  React.useEffect(() => {
    const fetchData = async () => {
      const res = await client.post("/revisions.diff_example", {});
      console.log({ res });
      setDiff(res.data.diff);
    };

    fetchData();
  }, []);

  return <Container dangerouslySetInnerHTML={{ __html: diff }} />;
}

const Container = styled.div`
  ins {
    color: green;
    text-decoration: none;
  }

  del {
    color: red;
    text-decoration: strikethrough;
  }
`;
