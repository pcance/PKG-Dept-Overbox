"use client";
import { useState } from "react";
import { ResolvedDims } from "@/types";

interface ParsedRow {
  pn: string;
  quantity: number;
  resolved: ResolvedDims | null;
}

interface Props {
  apiBase: string;
  onParsed: (rows: ParsedRow[]) => void;
}

export default function PasteBox({ apiBase, onParsed }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleApply() {
    setLoading(true);
    try {
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const map = new Map<string, number>();

      for (const line of lines) {
        const cols = line.split("\t");
        const pn = cols[0]?.trim();
        if (!pn) continue;
        const qty = cols.length > 1 ? parseInt(cols[1]?.trim() || "1", 10) : 1;
        const safeQty = isNaN(qty) || qty < 1 ? 1 : qty;
        map.set(pn, (map.get(pn) || 0) + safeQty);
      }

      if (map.size === 0) return;

      const pns = Array.from(map.keys());
      const resp = await fetch(`${apiBase}/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part_numbers: pns }),
      });
      const lookupData: Record<string, ResolvedDims | null> = await resp.json();

      const parsed: ParsedRow[] = pns.map((pn) => ({
        pn,
        quantity: map.get(pn)!,
        resolved: lookupData[pn] || null,
      }));

      onParsed(parsed);
      setText("");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <button
        className="text-sm font-medium text-blue-600 hover:underline"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Hide" : "Paste from Excel"}
      </button>

      {open && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">
            Paste Excel data (Col A = Part Number, Col B = Quantity). Duplicates are merged.
          </p>
          <textarea
            className="w-full h-28 border border-gray-300 rounded p-2 text-sm font-mono"
            placeholder={"801629B-01\t3\n800622E-01\t1\n801270A-02"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            onClick={handleApply}
            disabled={loading || !text.trim()}
            className="mt-2 px-4 py-1.5 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          >
            {loading ? "Loading..." : "Add to List"}
          </button>
        </div>
      )}
    </div>
  );
}
