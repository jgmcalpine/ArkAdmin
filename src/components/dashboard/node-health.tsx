import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { NodeInfo } from "@/lib/bark/schemas";

type NodeHealthProps = {
  info: NodeInfo;
};

function formatNetwork(network: string): string {
  return network.charAt(0).toUpperCase() + network.slice(1);
}

export function NodeHealth({ info }: NodeHealthProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <div className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-green-500 opacity-75" />
          </div>
          <CardTitle>System Status</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {/* Network */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Network</span>
            <Badge variant="outline">
              {formatNetwork(info.network)}
            </Badge>
          </div>

          {/* Block Height */}
          {info.blockHeight !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Block Height</span>
              <span className="text-sm font-semibold">
                #{new Intl.NumberFormat("en-US").format(info.blockHeight)}
              </span>
            </div>
          )}

          {/* Version */}
          {info.version && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="text-sm font-semibold">{info.version}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

