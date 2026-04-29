import { SensorData } from "../types/sensor";
import { Zap, Activity, Battery, Gauge, Power, Bolt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface StatusCardsProps {
    data: SensorData | null;
}

export function StatusCards({ data }: StatusCardsProps) {
    const power = data ? data.voltage * data.current : null;
    const powerPerHour = power;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 relative z-10">

            {/* Ozone PPM */}
            <Card className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 hover:bg-slate-800/80 hover:border-sky-500/50 transition-all duration-300 shadow-lg group">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardTitle className="text-[11px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider z-10">Ozone Concentration</CardTitle>
                    <div className="z-10 bg-slate-800/50 p-1.5 rounded-md border border-slate-700/50 group-hover:border-sky-500/30 transition-colors">
                        <Activity className="w-5 h-5 text-sky-400" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-lg sm:text-xl font-bold tracking-tight text-slate-100 group-hover:text-white transition-colors drop-shadow-sm">
                        {data ? `${data.ozone_ppm.toFixed(3)} ppm` : "--"}
                    </div>
                </CardContent>
            </Card>

            {/* Voltage */}
            <Card className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 hover:bg-slate-800/80 hover:border-sky-500/50 transition-all duration-300 shadow-lg group">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardTitle className="text-[11px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider z-10">Voltage</CardTitle>
                    <div className="z-10 bg-slate-800/50 p-1.5 rounded-md border border-slate-700/50 group-hover:border-sky-500/30 transition-colors">
                        <Zap className="w-5 h-5 text-amber-400" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-lg sm:text-xl font-bold tracking-tight text-slate-100 group-hover:text-white transition-colors drop-shadow-sm">
                        {data ? `${data.voltage.toFixed(1)} V` : "--"}
                    </div>
                </CardContent>
            </Card>

            {/* Current */}
            <Card className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 hover:bg-slate-800/80 hover:border-sky-500/50 transition-all duration-300 shadow-lg group">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardTitle className="text-[11px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider z-10">Current</CardTitle>
                    <div className="z-10 bg-slate-800/50 p-1.5 rounded-md border border-slate-700/50 group-hover:border-sky-500/30 transition-colors">
                        <Battery className="w-5 h-5 text-emerald-400" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-lg sm:text-xl font-bold tracking-tight text-slate-100 group-hover:text-white transition-colors drop-shadow-sm">
                        {data ? `${data.current.toFixed(2)} A` : "--"}
                    </div>
                </CardContent>
            </Card>

            {/* Power */}
            <Card className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 hover:bg-slate-800/80 hover:border-sky-500/50 transition-all duration-300 shadow-lg group">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardTitle className="text-[11px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider z-10">Power (P=VI)</CardTitle>
                    <div className="z-10 bg-slate-800/50 p-1.5 rounded-md border border-slate-700/50 group-hover:border-sky-500/30 transition-colors">
                        <Power className="w-5 h-5 text-orange-400" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-lg sm:text-xl font-bold tracking-tight text-slate-100 group-hover:text-white transition-colors drop-shadow-sm">
                        {power !== null ? `${power.toFixed(2)} W` : "--"}
                    </div>
                </CardContent>
            </Card>

            {/* Power/Hour */}
            <Card className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 hover:bg-slate-800/80 hover:border-sky-500/50 transition-all duration-300 shadow-lg group">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardTitle className="text-[11px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider z-10">Power / Hour</CardTitle>
                    <div className="z-10 bg-slate-800/50 p-1.5 rounded-md border border-slate-700/50 group-hover:border-sky-500/30 transition-colors">
                        <Bolt className="w-5 h-5 text-yellow-400" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-lg sm:text-xl font-bold tracking-tight text-slate-100 group-hover:text-white transition-colors drop-shadow-sm">
                        {powerPerHour !== null ? `${powerPerHour.toFixed(2)} Wh` : "--"}
                    </div>
                </CardContent>
            </Card>

            {/* Active Modules */}
            <Card className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 hover:bg-slate-800/80 hover:border-sky-500/50 transition-all duration-300 shadow-lg group">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardTitle className="text-[11px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider z-10">Active Modules</CardTitle>
                    <div className="z-10 bg-slate-800/50 p-1.5 rounded-md border border-slate-700/50 group-hover:border-sky-500/30 transition-colors">
                        <Gauge className="w-5 h-5 text-indigo-400" />
                    </div>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-lg sm:text-xl font-bold tracking-tight text-slate-100 group-hover:text-white transition-colors drop-shadow-sm">
                        {data ? data.active_modules.toString() : "--"}
                    </div>
                </CardContent>
            </Card>



        </div>
    );
}
