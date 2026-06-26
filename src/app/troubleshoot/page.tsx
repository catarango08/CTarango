import Link from "next/link";
import { Troubleshooter } from "@/components/Troubleshooter";

export const metadata = {
  title: "AI Troubleshooter — Wireman KB",
  description:
    "Diagnose electrical problems step by step with an AI assistant built for licensed journeyman wiremen.",
};

export default function TroubleshootPage() {
  return (
    <>
      <p className="breadcrumb">
        <Link href="/">Browse</Link> / AI Troubleshooter
      </p>
      <section className="hero" style={{ paddingTop: 0, marginBottom: 20 }}>
        <h1>AI Troubleshooter</h1>
        <p>
          Describe an electrical problem and work the diagnosis step by step. The assistant
          reasons like a journeyman, cites NEC articles where they apply, and points you to
          the knowledge base — always starting from a safe, de-energized condition.
        </p>
      </section>

      <Troubleshooter />
    </>
  );
}
