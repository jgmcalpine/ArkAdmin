import { type LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  status?: "active" | "inactive" | "neutral";
};

export function StatCard({ title, value, icon: Icon, status = "neutral" }: StatCardProps) {
  const statusStyles = {
    active: "text-green-600 dark:text-green-400",
    inactive: "text-gray-500 dark:text-gray-400",
    neutral: "text-foreground",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={cn("flex-shrink-0", statusStyles[status])}>
          <Icon className="h-8 w-8" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-semibold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

