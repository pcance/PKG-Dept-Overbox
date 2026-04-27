"use client";
import { useState } from "react";
import SiteSelector from "@/components/SiteSelector";
import ItemsGrid from "@/components/ItemsGrid";
import PasteBox from "@/components/PasteBox";
import ResultsPanel from "@/components/ResultsPanel";
import { ItemRow, SolveResult } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [site, setSite] = useState<"penang" | "debrecen">("penang");
  const [rows, setRows] = useState<ItemRow[]>([
    { id: 1, mode: "pn", pn: "", length: "", width: "", depth: "", quantity: 1, resolved: null, error: null },
  ]);
  const [solving, setSolving] = useState(false);
  const [result, setResult] = useState<SolveResult | null>(null);
  const [solveError, setSolveError] = useState<string | null>(null);
  const [excludedPNs, setExcludedPNs] = useState<string[]>([]);

  async function handleSolve(excluded: string[] = []) {
    setSolving(true);
    setResult(null);
    setSolveError(null);

    const items: Array<{ label: string; length: number; width: number; depth: number; quantity: number }> = [];
    for (const row of rows) {
      if (row.mode === "pn") {
        if (!row.pn || !row.resolved) continue;
        items.push({
          label: row.pn,
          length: row.resolved.length,
          width: row.resolved.width,
          depth: row.resolved.depth,
          quantity: row.quantity,
        });
      } else {
        const l = parseFloat(row.length as string);
        const w = parseFloat(row.width as string);
        const d = parseFloat(row.depth as string);
        if (isNaN(l) || isNaN(w) || isNaN(d)) continue;
        items.push({
          label: `${l}x${w}x${d}`,
          length: l,
          width: w,
          depth: d,
          quantity: row.quantity,
        });
      }
    }

    if (items.length === 0) {
      setSolveError("Please add at least one valid item.");
      setSolving(false);
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site, items, exclude_part_numbers: excluded }),
      });
      const data = await resp.json();
      setResult(data);
    } catch {
      setSolveError("Failed to connect to solver. Make sure the backend is running.");
    } finally {
      setSolving(false);
    }
  }

  function handleNextBest() {
    if (!result?.overbox) return;
    const newExcluded = [...excludedPNs, result.overbox.part_number];
    setExcludedPNs(newExcluded);
    handleSolve(newExcluded);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-700 text-white px-6 py-3 shadow">
        <h1 className="text-xl font-bold">Overbox Finder</h1>
        <p className="text-blue-200 text-sm">Find the smallest single overbox for your items</p>
      </header>

      <main className="flex flex-1 gap-4 p-4 overflow-hidden">
        <div className="w-2/5 flex flex-col gap-4 overflow-y-auto">
          <SiteSelector site={site} onChange={setSite} />
          <PasteBox
            apiBase={API_BASE}
            onParsed={(parsed) => {
              setRows((prev) => {
                const updated = [...prev];
                for (const p of parsed) {
                  const existing = updated.find((r) => r.mode === "pn" && r.pn === p.pn);
                  if (existing) {
                    existing.quantity += p.quantity;
                  } else {
                    const newId = Math.max(0, ...updated.map((r) => r.id)) + 1;
                    updated.push({
                      id: newId,
                      mode: "pn",
                      pn: p.pn,
                      length: "",
                      width: "",
                      depth: "",
                      quantity: p.quantity,
                      resolved: p.resolved,
                      error: p.resolved ? null : `PN "${p.pn}" not found`,
                    });
                  }
                }
                return updated;
              });
            }}
          />
          <ItemsGrid
            rows={rows}
            setRows={setRows}
            apiBase={API_BASE}
          />

          <button
            onClick={() => { setExcludedPNs([]); handleSolve([]); }}
            disabled={solving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 transition"
          >
            {solving ? "Solving..." : "Find Overbox"}
          </button>

          {solveError && (
            <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
              {solveError}
            </div>
          )}
        </div>

        <div className="w-3/5 overflow-y-auto">
          <ResultsPanel result={result} solving={solving} onNextBest={handleNextBest} />
        </div>
      </main>
    </div>
  );
}
