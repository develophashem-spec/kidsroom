import { DEPARTMENT_LABELS, type Department } from "@/lib/catalog-constants";
import { SIZE_CHART } from "@/lib/fit";

export function SizeChart({ department }: { department: Department }) {
  const label = department === "women" ? "Bust" : "Chest";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-80 border-collapse text-sm">
        <caption className="mb-2 text-left text-xs text-muted">
          {DEPARTMENT_LABELS[department]}’s sizes – body measurements in centimetres
        </caption>
        <thead>
          <tr className="border-b border-ink text-left">
            <th scope="col" className="py-2 pr-4 font-semibold">
              Size
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              {label}
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              Waist
            </th>
            <th scope="col" className="py-2 font-semibold">
              Hip
            </th>
          </tr>
        </thead>
        <tbody>
          {SIZE_CHART[department].map((row) => (
            <tr key={row.size} className="border-b border-line">
              <th scope="row" className="py-2 pr-4 text-left font-semibold">
                {row.size}
              </th>
              <td className="py-2 pr-4">{row.chest}</td>
              <td className="py-2 pr-4">{row.waist}</td>
              <td className="py-2">{row.hip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
