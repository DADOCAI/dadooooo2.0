import React from "react";

export default function Ascii() {
  return (
    <main className="pt-32 px-8 pb-4">
      <div className="max-w-7xl mx-auto w-full border rounded-xl overflow-hidden shadow-sm" style={{ height: "90vh" }}>
        <iframe title="ASCII 工具" src="/ascii-app/index.html" style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
    </main>
  );
}
