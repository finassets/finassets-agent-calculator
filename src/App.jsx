import React, { useMemo } from "react";
import AgentQuickCalculator from "./AgentQuickCalculator";
import ColdCalculator from "./ColdCalculator";

function getModeFromUrl() {
  const p = new URLSearchParams(window.location.search);
  const m = (p.get("mode") || "").toLowerCase();
  // explicit cold only, everything else -> agent
  return m === "cold" || m === "full" ? "cold" : "agent";
}

export default function App() {
  const mode = useMemo(() => getModeFromUrl(), []);

  return <div className="min-h-screen bg-gray-50">{mode === "cold" ? <ColdCalculator /> : <AgentQuickCalculator />}</div>;
}