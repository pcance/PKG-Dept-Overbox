"use client";
interface Props {
  site: "penang" | "debrecen";
  onChange: (site: "penang" | "debrecen") => void;
}
export default function SiteSelector({ site, onChange }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <label className="block text-sm font-semibold text-gray-700 mb-2">Site</label>
      <div className="flex gap-4">
        {(["penang", "debrecen"] as const).map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`px-5 py-2 rounded-full border-2 font-medium capitalize transition
              ${site === s
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-blue-400"}`}
          >
            {s === "penang" ? "Penang" : "Debrecen"}
          </button>
        ))}
      </div>
    </div>
  );
}
