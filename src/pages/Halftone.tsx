import React from "react";

export function Halftone() {
  return (
    <div className="min-h-screen bg-black" style={{ marginTop: "96px" }}>
      <div className="w-full" style={{ height: "calc(100vh - 96px)" }}>
        <iframe
          title="Halftone Demo"
          src="/halftone-demo/index.html"
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      </div>
    </div>
  );
}

export default Halftone;
