import React, { useEffect, useState, useRef } from "react";

interface PdfViewerProps {
  pdfUrl: string;
}

const useOnClickOutside = (
  ref: React.RefObject<HTMLElement | null>,
  callback: (event: MouseEvent | TouchEvent) => void
) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback(event);
      }
    };
    window.addEventListener("click", listener);

    return () => {
      window.removeEventListener("click", listener);
    };
  }, [callback, ref]);
};

export default function PdfViewer({ pdfUrl }: PdfViewerProps) {
  const [data, setData] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const pdfWrapperRef = useRef<HTMLObjectElement>(null);

  useOnClickOutside(pdfWrapperRef, () => setIsFocused(false));

  useEffect(() => {
    fetch(pdfUrl + "&preview=true")
      .then((res) => res.json())
      .then((res) => {
        setIsLoading(false);
        setData(res.data);
      })
      // eslint-disable-next-line no-console
      .catch((error) => console.log("there is an error", error)); // placeholder
  }, [pdfUrl]);

  return (
    <div
      ref={pdfWrapperRef}
      onClick={() => {
        setIsFocused(true);
      }}
    >
      {isLoading && <div>Loading PDF...</div>}

      {data && (
        <object
          type="application/pdf"
          data={`data:application/pdf;base64,${data}`}
          width="100%"
          height="800px"
          style={{ pointerEvents: isFocused ? "auto" : "none" }}
        >
          <p>
            Unable to display PDF. <a href={pdfUrl}>Click to Download</a>
          </p>
        </object>
      )}
    </div>
  );
}
