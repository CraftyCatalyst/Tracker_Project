import React from "react";

export const formatHeader = (header) => {
  const processed = header
    .replace(/\s*\/\s*/g, " / ") // spacing around slashes
    .split(" / ")
    .map((segment, index) => (
      <React.Fragment key={index}>
        {segment}
        {index < header.split(" / ").length - 1 && <br />}
      </React.Fragment>
    ));

  return <span style={{ whiteSpace: "normal", textAlign: "center" }}>{processed}</span>;
};
