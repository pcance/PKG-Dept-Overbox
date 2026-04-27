"use client";
import { useCallback } from "react";
import { ItemRow, ResolvedDims } from "@/types";

interface Props {
  rows: ItemRow[];
  setRows: React.Dispatch<React.SetStateAction<ItemRow[]>>;
  apiBase: string;
}

let _nextId = 100;
function nextId() { return ++_nextId; }

export default function ItemsGrid({ rows, setRows, apiBase }: Props) {
  const updateRow = useCallback((id: number, patch: Partial<ItemRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, [setRows]);

  const addRow = useCallback((mode: "pn" | "manual") => {
    setRows((prev) => [
      ...prev,
      {
        id: nextId(),
        mode,
        pn: "",
        length: "",
        width: "",
        depth: "",
        quantity: 1,
        resolved: null,
        error: null,
      },
    ]);
  }, [setRows]);

  const removeRow = useCallback((id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, [setRows]);

  async function lookupPN(id: number, pn: string) {
    if (!pn.trim()) {
      updateRow(id, { resolved: null, error: null });
      return;
    }
    try {
      const resp = await fetch(`${apiBase}/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part_numbers: [pn.trim()] }),
      });
      const data: Record<string, ResolvedDims | null> = await resp.json();
      const found = data[pn.trim()];
      if (found) {
        updateRow(id, { resolved: found, error: null });
      } else {
        updateRow(id, { resolved: null, error: `PN "${pn}" not found` });
      }
    } catch {
      updateRow(id, { resolved: null, error: "Lookup failed" });
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Items to Pack</h2>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-1 border border-gray-100 rounded p-2">
            <div className="flex items-center gap-2">
              <select
                className="text-xs border border-gray-300 rounded px-1 py-1"
                value={row.mode}
                onChange={(e) =>
                  updateRow(row.id, {
                    mode: e.target.value as "pn" | "manual",
                    resolved: null,
                    error: null,
                    pn: "",
                    length: "",
                    width: "",
                    depth: "",
                  })
                }
              >
                <option value="pn">Part #</option>
                <option value="manual">Manual</option>
              </select>

              {row.mode === "pn" ? (
                <input
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                  placeholder="Part Number"
                  value={row.pn}
                  onChange={(e) => updateRow(row.id, { pn: e.target.value, resolved: null, error: null })}
                  onBlur={(e) => lookupPN(row.id, e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Tab") lookupPN(row.id, row.pn); }}
                />
              ) : (
                <div className="flex gap-1 flex-1">
                  {(["length", "width", "depth"] as const).map((dim) => (
                    <input
                      key={dim}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center"
                      placeholder={dim === "length" ? "L" : dim === "width" ? "W" : "D"}
                      type="number"
                      min="0"
                      step="0.1"
                      value={row[dim] as string}
                      onChange={(e) => updateRow(row.id, { [dim]: e.target.value })}
                    />
                  ))}
                </div>
              )}

              <input
                className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center"
                type="number"
                min="1"
                value={row.quantity}
                onChange={(e) => updateRow(row.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                title="Quantity"
              />

              <button
                onClick={() => removeRow(row.id)}
                className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                title="Remove"
              >
                x
              </button>
            </div>

            {row.mode === "pn" && row.resolved && (
              <div className="text-xs text-green-700 pl-1">
                {row.resolved.description} - {row.resolved.length}x{row.resolved.width}x{row.resolved.depth} cm
              </div>
            )}
            {row.error && (
              <div className="text-xs text-red-600 pl-1">{row.error}</div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => addRow("pn")}
          className="text-sm text-blue-600 hover:underline"
        >
          + Add Part # Row
        </button>
        <button
          onClick={() => addRow("manual")}
          className="text-sm text-blue-600 hover:underline"
        >
          + Add Manual Dims Row
        </button>
      </div>
    </div>
  );
}
