import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
  color?: "emerald" | "blue" | "violet" | "amber";
}

const colorStyles = {
  emerald: {
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    iconText: "text-emerald-600 dark:text-emerald-400",
    valueText: "text-emerald-600 dark:text-emerald-400",
  },
  blue: {
    iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
    iconText: "text-blue-600 dark:text-blue-400",
    valueText: "text-blue-600 dark:text-blue-400",
  },
  violet: {
    iconBg: "bg-violet-500/10 dark:bg-violet-500/20",
    iconText: "text-violet-600 dark:text-violet-400",
    valueText: "text-violet-600 dark:text-violet-400",
  },
  amber: {
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    iconText: "text-amber-600 dark:text-amber-400",
    valueText: "text-amber-600 dark:text-amber-400",
  },
} as const;

export function StatCard({ title, value, description, icon, color }: StatCardProps) {
  const styles = color ? colorStyles[color] : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            styles ? styles.iconBg : "bg-muted"
          )}
        >
          <div className={cn("size-4", styles ? styles.iconText : "text-muted-foreground")}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", styles?.valueText)}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
