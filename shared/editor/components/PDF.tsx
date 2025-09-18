import React, { useEffect, useState, useRef } from "react";

interface PdfViewerProps {
  pdfUrl: string;
  name: string;
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

export default function PdfViewer({ pdfUrl, name }: PdfViewerProps) {
  const [data, setData] = useState<string>();
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const pdfWrapperRef = useRef<HTMLObjectElement>(null);

  useOnClickOutside(pdfWrapperRef, () => setIsFocused(false));

  useEffect(() => {
    fetch(pdfUrl + "&preview=true")
      .then((res) => res.json())
      .then((res) => {
        setData(res.url);
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
      <iframe
        title={name}
        src={data}
        width="100%"
        height="800px"
        onClick={() => setIsFocused(true)}
        style={{ pointerEvents: isFocused ? "auto" : "none" }}
       />
    </div>
  );
}
