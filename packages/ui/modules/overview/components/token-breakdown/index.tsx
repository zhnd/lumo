"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TokenByModel } from "../../types";
import { formatTokens } from "../../libs";

interface TokenBreakdownProps {
  data: TokenByModel[];
}

const TOKEN_TYPES = [
  { key: "input" as const, label: "Input", color: "bg-chart-1" },
  { key: "output" as const, label: "Output", color: "bg-chart-2" },
  { key: "cacheRead" as const, label: "Cache Read", color: "bg-chart-3" },
  { key: "cacheCreation" as const, label: "Cache Creation", color: "bg-chart-4" },
] as const;

export function TokenBreakdown({ data }: TokenBreakdownProps) {
  // Calculate totals
  const totals = data.reduce(
    (acc, model) => ({
      input: acc.input + model.input,
      output: acc.output + model.output,
      cacheRead: acc.cacheRead + model.cacheRead,
      cacheCreation: acc.cacheCreation + model.cacheCreation,
    }),
    { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }
  );

  const grandTotal = totals.input + totals.output + totals.cacheRead + totals.cacheCreation;
  const cachePercentage = grandTotal > 0
    ? ((totals.cacheRead / grandTotal) * 100).toFixed(0)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Token Counter</CardTitle>
        <CardDescription>
          {formatTokens(grandTotal)} total · {cachePercentage}% cache read
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-2 text-left font-medium">Model</th>
                {TOKEN_TYPES.map(({ key, label, color }) => (
                  <th key={key} className="pb-2 text-right font-medium">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={`size-2 rounded-full ${color}`} />
                      {label}
                    </div>
                  </th>
                ))}
                <th className="pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((model) => {
                const modelTotal = model.input + model.output + model.cacheRead + model.cacheCreation;
                return (
                  <tr key={model.model} className="border-b last:border-0">
                    <td className="py-2 font-medium">{model.displayName}</td>
                    {TOKEN_TYPES.map(({ key }) => (
                      <td key={key} className="py-2 text-right text-muted-foreground tabular-nums">
                        {model[key] > 0 ? formatTokens(model[key]) : "-"}
                      </td>
                    ))}
                    <td className="py-2 text-right font-medium tabular-nums">
                      {formatTokens(modelTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t font-medium">
                <td className="pt-2">Total</td>
                {TOKEN_TYPES.map(({ key }) => (
                  <td key={key} className="pt-2 text-right tabular-nums">
                    {totals[key] > 0 ? formatTokens(totals[key]) : "-"}
                  </td>
                ))}
                <td className="pt-2 text-right tabular-nums">
                  {formatTokens(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
