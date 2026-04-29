"use client";

import { useState } from "react";
import { SensorData } from "../types/sensor";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine,
} from "recharts";
import { ChevronDown } from "lucide-react";

interface LiveChartProps {
    history: SensorData[];
}

// ─── Chart mode definitions ─────────────────────────────────────────────────

type ChartMode = "default" | "power_current" | "power_ozone" | "power_voltage";

const CHART_MODES: { value: ChartMode; label: string }[] = [
    { value: "default",       label: "Ozone · Voltage · Current" },
    { value: "power_current", label: "Power vs Current" },
    { value: "power_ozone",   label: "Power vs Ozone" },
    { value: "power_voltage", label: "Power vs Voltage" },
];

// ─── Gradient / color tokens ─────────────────────────────────────────────────

const COLORS = {
    ozone:   "#38bdf8",   // sky-400
    voltage: "#fbbf24",   // amber-400
    current: "#34d399",   // emerald-400
    power:   "#fb923c",   // orange-400
};

// ─── Component ───────────────────────────────────────────────────────────────

export function LiveChart({ history }: LiveChartProps) {
    const [mode, setMode] = useState<ChartMode>("default");
    const [open, setOpen] = useState(false);

    // Map raw history → chart-ready rows (compute power = V × I)
    const chartData = history.map((d) => {
        const date = new Date(d.timestamp);
        return {
            time: `${date.getHours().toString().padStart(2, "0")}:${date
                .getMinutes()
                .toString()
                .padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`,
            ozone:   d.ozone_ppm,
            voltage: d.voltage,
            current: d.current,
            power:   d.voltage * d.current,
            electrode_level: d.electrode_level,
        };
    });

    // Detect when electrode level changes to a higher value to draw a marker
    const eventLines: { time: string; level: number }[] = [];
    let lastLevel = 0;
    chartData.forEach(d => {
        if (d.electrode_level > lastLevel && d.electrode_level > 0) {
            eventLines.push({ time: d.time, level: d.electrode_level });
        }
        lastLevel = d.electrode_level;
    });

    const selectedLabel = CHART_MODES.find((m) => m.value === mode)?.label ?? "";

    // ─── Shared styles ────────────────────────────────────────────────────────

    const tooltipStyle = {
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        backdropFilter: "blur(8px)",
        borderColor: "#1e293b",
        borderRadius: "8px",
        color: "#f8fafc",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
    };

    const axisProps = {
        fontSize: 12,
        tickLine: false as const,
        axisLine: false as const,
    };

    // ─── Render the correct <AreaChart> per mode ──────────────────────────────

    const renderChart = () => {
        if (mode === "default") {
            return (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                    <defs>
                        <linearGradient id="gOzone" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={COLORS.ozone}   stopOpacity={0.5} />
                            <stop offset="95%" stopColor={COLORS.ozone}   stopOpacity={0}   />
                        </linearGradient>
                        <linearGradient id="gVoltage" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={COLORS.voltage} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS.voltage} stopOpacity={0}   />
                        </linearGradient>
                        <linearGradient id="gCurrent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={COLORS.current} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS.current} stopOpacity={0}   />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" minTickGap={30} {...axisProps} />
                    <YAxis yAxisId="left"  stroke={COLORS.ozone}   tickFormatter={(v) => v.toFixed(2)} {...axisProps} />
                    <YAxis yAxisId="right" orientation="right" stroke={COLORS.voltage} {...axisProps} />
                    <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#f8fafc" }} />
                    <Legend wrapperStyle={{ paddingTop: "10px" }} />
                    <Area yAxisId="left"  type="monotone" dataKey="ozone"   name="Ozone (ppm)"  stroke={COLORS.ozone}   strokeWidth={2} fill="url(#gOzone)"   fillOpacity={1} isAnimationActive={false} />
                    <Area yAxisId="right" type="monotone" dataKey="voltage" name="Voltage (V)"  stroke={COLORS.voltage} strokeWidth={2} fill="url(#gVoltage)" fillOpacity={1} isAnimationActive={false} />
                    <Area yAxisId="right" type="monotone" dataKey="current" name="Current (A)"  stroke={COLORS.current} strokeWidth={2} fill="url(#gCurrent)" fillOpacity={1} isAnimationActive={false} />
                    {eventLines.map((ev, i) => (
                        <ReferenceLine key={`ev-${i}`} x={ev.time} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" label={{ position: 'insideTop', value: `Level ${ev.level}`, fill: '#f87171', fontSize: 10, fontWeight: 'bold' }} />
                    ))}
                </AreaChart>
            );
        }

        if (mode === "power_current") {
            return (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                    <defs>
                        <linearGradient id="gPowerPC" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={COLORS.power}   stopOpacity={0.4} />
                            <stop offset="95%" stopColor={COLORS.power}   stopOpacity={0}   />
                        </linearGradient>
                        <linearGradient id="gCurrentPC" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={COLORS.current} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS.current} stopOpacity={0}   />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" minTickGap={30} {...axisProps} />
                    <YAxis yAxisId="left"  stroke={COLORS.power}   tickFormatter={(v) => `${v.toFixed(1)}W`} {...axisProps} />
                    <YAxis yAxisId="right" orientation="right" stroke={COLORS.current} tickFormatter={(v) => `${v.toFixed(2)}A`} {...axisProps} />
                    <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#f8fafc" }} />
                    <Legend wrapperStyle={{ paddingTop: "10px" }} />
                    <Area yAxisId="left"  type="monotone" dataKey="power"   name="Power (W)"   stroke={COLORS.power}   strokeWidth={2} fill="url(#gPowerPC)"   fillOpacity={1} isAnimationActive={false} />
                    <Area yAxisId="right" type="monotone" dataKey="current" name="Current (A)" stroke={COLORS.current} strokeWidth={2} fill="url(#gCurrentPC)" fillOpacity={1} isAnimationActive={false} />
                    {eventLines.map((ev, i) => (
                        <ReferenceLine key={`ev-pc-${i}`} x={ev.time} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" label={{ position: 'insideTop', value: `Level ${ev.level}`, fill: '#f87171', fontSize: 10, fontWeight: 'bold' }} />
                    ))}
                </AreaChart>
            );
        }

        if (mode === "power_ozone") {
            return (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                    <defs>
                        <linearGradient id="gPowerPO" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={COLORS.power} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={COLORS.power} stopOpacity={0}   />
                        </linearGradient>
                        <linearGradient id="gOzonePO" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={COLORS.ozone} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS.ozone} stopOpacity={0}   />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" minTickGap={30} {...axisProps} />
                    <YAxis yAxisId="left"  stroke={COLORS.power} tickFormatter={(v) => `${v.toFixed(1)}W`} {...axisProps} />
                    <YAxis yAxisId="right" orientation="right" stroke={COLORS.ozone} tickFormatter={(v) => `${v.toFixed(3)}`} {...axisProps} />
                    <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#f8fafc" }} />
                    <Legend wrapperStyle={{ paddingTop: "10px" }} />
                    <Area yAxisId="left"  type="monotone" dataKey="power" name="Power (W)"    stroke={COLORS.power} strokeWidth={2} fill="url(#gPowerPO)" fillOpacity={1} isAnimationActive={false} />
                    <Area yAxisId="right" type="monotone" dataKey="ozone" name="Ozone (ppm)"  stroke={COLORS.ozone} strokeWidth={2} fill="url(#gOzonePO)" fillOpacity={1} isAnimationActive={false} />
                    {eventLines.map((ev, i) => (
                        <ReferenceLine key={`ev-po-${i}`} x={ev.time} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" label={{ position: 'insideTop', value: `Level ${ev.level}`, fill: '#f87171', fontSize: 10, fontWeight: 'bold' }} />
                    ))}
                </AreaChart>
            );
        }

        // power_voltage
        return (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                <defs>
                    <linearGradient id="gPowerPV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={COLORS.power}   stopOpacity={0.4} />
                        <stop offset="95%" stopColor={COLORS.power}   stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="gVoltagePV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={COLORS.voltage} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.voltage} stopOpacity={0}   />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" minTickGap={30} {...axisProps} />
                <YAxis yAxisId="left"  stroke={COLORS.power}   tickFormatter={(v) => `${v.toFixed(1)}W`} {...axisProps} />
                <YAxis yAxisId="right" orientation="right" stroke={COLORS.voltage} tickFormatter={(v) => `${v.toFixed(1)}V`} {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#f8fafc" }} />
                <Legend wrapperStyle={{ paddingTop: "10px" }} />
                <Area yAxisId="left"  type="monotone" dataKey="power"   name="Power (W)"   stroke={COLORS.power}   strokeWidth={2} fill="url(#gPowerPV)"   fillOpacity={1} isAnimationActive={false} />
                <Area yAxisId="right" type="monotone" dataKey="voltage" name="Voltage (V)" stroke={COLORS.voltage} strokeWidth={2} fill="url(#gVoltagePV)" fillOpacity={1} isAnimationActive={false} />
                {eventLines.map((ev, i) => (
                    <ReferenceLine key={`ev-pv-${i}`} x={ev.time} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" label={{ position: 'insideTop', value: `Level ${ev.level}`, fill: '#f87171', fontSize: 10, fontWeight: 'bold' }} />
                ))}
            </AreaChart>
        );
    };

    // ─── JSX ─────────────────────────────────────────────────────────────────

    return (
        <Card className="shadow-lg border-border/50 bg-card/50 backdrop-blur pb-2">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-medium text-foreground tracking-tight">
                    Realtime Telemetry
                </CardTitle>

                {/* ── Dropdown ── */}
                <div className="relative">
                    <button
                        onClick={() => setOpen((o) => !o)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
                                   bg-slate-800/80 border border-slate-700/60 text-slate-300
                                   hover:bg-slate-700/80 hover:border-sky-500/40 hover:text-white
                                   transition-all duration-200 shadow-sm"
                    >
                        <span>{selectedLabel}</span>
                        <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                        />
                    </button>

                    {open && (
                        <div className="absolute right-0 mt-1 w-52 z-50 rounded-xl overflow-hidden
                                        bg-slate-900/95 border border-slate-700/60 shadow-2xl backdrop-blur-md">
                            {CHART_MODES.map((m) => (
                                <button
                                    key={m.value}
                                    onClick={() => { setMode(m.value); setOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors duration-150
                                        ${mode === m.value
                                            ? "bg-sky-500/20 text-sky-300 border-l-2 border-sky-400"
                                            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                                        }`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {renderChart()}
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
