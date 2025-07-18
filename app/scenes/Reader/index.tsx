import { observer } from "mobx-react";
import * as React from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import useStores from "~/hooks/useStores";
import Controls from "./components/Controls";
import Tabs from "./components/Tabs";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function Reader() {
  const match = useRouteMatch<{ id: string }>();
  const { documents } = useStores();
  const document = documents.get(match.params.id);
  const [numPages, setNumPages] = React.useState(0);
  const [pageNumber, setPageNumber] = React.useState(1);
  const [zoom, setZoom] = React.useState(1);
  const [tabs, setTabs] = React.useState([
    { id: "1", title: "Paper 1" },
    { id: "2", title: "Paper 2" },
  ]);
  const [activeTab, setActiveTab] = React.useState("1");

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  if (!document) {
    return null;
  }

  return (
    <Container>
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onClose={(id) => setTabs(tabs.filter((tab) => tab.id !== id))}
        onSwitch={(id) => setActiveTab(id)}
      />
      <Controls
        zoom={zoom}
        onZoomIn={() => setZoom(zoom + 0.1)}
        onZoomOut={() => setZoom(zoom - 0.1)}
        page={pageNumber}
        numPages={numPages}
        onNextPage={() => setPageNumber(Math.min(pageNumber + 1, numPages))}
        onPrevPage={() => setPageNumber(Math.max(pageNumber - 1, 1))}
      />
      <Content>
        <Document file={document.url} onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={pageNumber} scale={zoom} />
        </Document>
      </Content>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`;

const Content = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  overflow: auto;
`;

export default observer(Reader);
