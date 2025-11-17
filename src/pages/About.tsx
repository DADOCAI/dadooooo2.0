import { Header } from "../components/Header";
import { Envelope } from "../components/Envelope";

export function About() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-32 px-8">
        <div className="max-w-4xl mx-auto">
          <Envelope />
        </div>
      </main>
    </div>
  );
}