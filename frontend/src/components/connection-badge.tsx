import { Wifi, WifiOff, RefreshCcw } from 'lucide-react';
import { ConnectionState } from '../lib/websocket';

interface ConnectionBadgeProps {
    state: ConnectionState;
}

export function ConnectionBadge({ state }: ConnectionBadgeProps) {
    let bgColor = "bg-slate-100";
    let textColor = "text-slate-500";
    let borderColor = "border-slate-200";
    let icon = <WifiOff className="w-4 h-4" />;
    let label = "Disconnected";

    if (state === "connected") {
        bgColor = "bg-emerald-500/10";
        textColor = "text-emerald-500";
        borderColor = "border-emerald-500/20";
        icon = <Wifi className="w-4 h-4" />;
        label = "Connected";
    } else if (state === "connecting") {
        bgColor = "bg-amber-500/10";
        textColor = "text-amber-500";
        borderColor = "border-amber-500/20";
        icon = <RefreshCcw className="w-4 h-4 animate-spin" />;
        label = "Reconnecting";
    } else {
        bgColor = "bg-rose-500/10";
        textColor = "text-rose-500";
        borderColor = "border-rose-500/20";
    }

    return (
        <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${bgColor} ${textColor} ${borderColor} transition-colors duration-300`}
        >
            {icon}
            <span>{label}</span>
        </div>
    );
}
