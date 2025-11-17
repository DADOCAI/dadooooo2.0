import React from "react";
import "../styles/retro.css";
import { BackgroundRemover } from "../components/retro/BackgroundRemover";

export default function Cutout() {
  return (
    <main className="pt-32 pb-12 px-6">
      <div className="max-w-6xl mx-auto flex justify-center">
        <BackgroundRemover />
      </div>
    </main>
  );
}