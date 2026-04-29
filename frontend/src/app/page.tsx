"use client";

import { useState } from "react";
import { SensorData } from "@/types/sensor";
import { useOzoneMqtt } from "@/lib/useMqtt";

import { ConnectionBadge } from "@/components/connection-badge";
import { StatusCards } from "@/components/status-cards";
import { OzoneGauge } from "@/components/ozone-gauge";
import { LiveChart } from "@/components/live-chart";
import { ControlPanel } from "@/components/control-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, Cpu, Cloud } from "lucide-react";

export default function DashboardPage() {
    // Establish direct MQTT connection to HiveMQ Cloud
    const { data, history, connectionState } = useOzoneMqtt(null);

    const mode = data?.mode;
    const isLocal = mode === 'local';
    const isRemote = mode === 'remote';

    return (
        <div className="min-h-screen bg-[#0B0F19] dark:bg-[#0B0F19] text-foreground font-sans p-4 sm:p-6 lg:p-8 relative overflow-x-hidden transition-colors duration-300"
            style={{ backgroundColor: 'hsl(var(--background))' }}
        >

            {/* Ambient Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-600/10 blur-[120px] animate-blob mix-blend-screen dark:mix-blend-screen mix-blend-multiply" />
                <div className="absolute top-[20%] right-[-10%] w-[35%] h-[45%] rounded-full bg-indigo-600/10 blur-[120px] animate-blob dark:mix-blend-screen mix-blend-multiply" style={{ animationDelay: "2s" }} />
                <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-sky-900/10 blur-[150px] animate-blob dark:mix-blend-screen mix-blend-multiply" style={{ animationDelay: "4s" }} />
            </div>

            {/* Header */}
            <header className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                        Ozone Generator Console
                    </h1>
                    <p className="text-sm dark:text-sky-200/70 text-sky-700/80 mt-1 font-medium">
                        Project Capstone: Realtime ESP32/FastAPI Monitoring &amp; Administration
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-card/50 backdrop-blur px-4 py-3 rounded-2xl border border-border/50 shadow-sm">
                    <div className="text-right text-xs text-muted-foreground">
                        <div className="uppercase tracking-widest font-semibold mb-1">Network Hook</div>
                        <div className="font-bold text-foreground tabular-nums">
                            {data ? new Date(data.timestamp).toLocaleTimeString() : "Waiting..."}
                        </div>
                    </div>
                    <div className="h-8 w-px bg-border/50" />

                    {/* Mode Badge — compact pill */}
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider transition-all duration-300 ${
                        isLocal
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : isRemote
                                ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                                : 'bg-slate-700/30 text-slate-500 border-slate-600/30'
                    }`}>
                        {isLocal
                            ? <Cpu className="w-3 h-3" />
                            : isRemote
                                ? <Cloud className="w-3 h-3" />
                                : <Loader2 className="w-3 h-3 animate-spin" />
                        }
                        <span>{isLocal ? 'Local' : isRemote ? 'Remote' : '—'}</span>
                    </div>

                    <div className="h-8 w-px bg-border/50" />
                    <ConnectionBadge state={connectionState} />
                    <div className="h-8 w-px bg-border/50" />

                    {/* Theme Toggle */}
                    <ThemeToggle />
                </div>
            </header>

            {/* Main Grid Container */}
            <main className="max-w-7xl mx-auto space-y-6">

                {/* Top Row: Quick Stats */}
                <StatusCards data={data} />

                {/* Middle Row: Live Visualization */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Main Chart */}
                    <div className="lg:col-span-3">
                        <LiveChart history={history} />
                    </div>

                    {/* Gauge Widget */}
                    <div className="lg:col-span-1">
                        <OzoneGauge data={data} />
                    </div>
                </div>

                {/* Bottom Row: Control Panel */}
                <div className="max-w-3xl mx-auto pt-4 pb-12">
                    <ControlPanel data={data} />
                </div>

            </main>

        </div>
    );
}

