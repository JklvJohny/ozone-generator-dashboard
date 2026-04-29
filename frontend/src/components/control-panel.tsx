import { useState, useEffect, useRef } from "react";
import { SensorData } from "../types/sensor";
import { sendSetLevel, sendSetMode } from "../lib/mqttClient";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Loader2, Timer, StopCircle, Cpu, Cloud, CalendarClock } from "lucide-react";

interface ControlPanelProps {
    data: SensorData | null;
}

export function ControlPanel({ data }: ControlPanelProps) {
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    // ── Timer Tab ──────────────────────────────────────────────────────────
    const [timerInput, setTimerInput]     = useState<string>("");
    const [totalSeconds, setTotalSeconds] = useState<number | null>(null);
    const [countdown, setCountdown]       = useState<number | null>(null);
    const intervalRef                      = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Tab state ──────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<"timer" | "schedule">("timer");

    // ── Schedule Tab ───────────────────────────────────────────────────────
    const [scheduleStart, setScheduleStart]   = useState<string>("");
    const [scheduleStop, setScheduleStop]     = useState<string>("");
    const [scheduleLevel, setScheduleLevel]   = useState<1 | 2 | 3>(1);
    const [scheduleStatus, setScheduleStatus] = useState<"idle" | "waiting" | "running">("idle");
    const [scheduleError, setScheduleError]   = useState<string | null>(null);
    const [scheduleInfo, setScheduleInfo]     = useState<{ start: string; stop: string; level: number } | null>(null);
    const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const stopTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

    const activeModules = data?.active_modules ?? 0;
    const currentLevel  = (data as any)?.electrode_level as (0 | 1 | 2 | 3) ?? 0;

    // ── Countdown tick ─────────────────────────────────────────────────────
    useEffect(() => {
        if (countdown === null) return;
        if (countdown <= 0) {
            sendSetLevel(0);
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            setCountdown(null);
            setTotalSeconds(null);
            setTimerInput("");
            return;
        }
        intervalRef.current = setInterval(() => {
            setCountdown((prev) => (prev !== null ? prev - 1 : null));
        }, 1000);
        return () => clearInterval(intervalRef.current!);
    }, [countdown]);

    const handleConfirmTimer = () => {
        const duration = parseInt(timerInput, 10);
        if (!isNaN(duration) && duration > 0) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setTotalSeconds(duration);
            setCountdown(duration);
        }
    };

    const handleCancelTimer = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setCountdown(null);
        setTotalSeconds(null);
        setTimerInput("");
    };

    const formatTime = (s: number) => {
        const m   = Math.floor(s / 60).toString().padStart(2, "0");
        const sec = (s % 60).toString().padStart(2, "0");
        return `${m}:${sec}`;
    };

    const progress = countdown !== null && totalSeconds ? countdown / totalSeconds : 0;

    // ── Schedule Logic ─────────────────────────────────────────────────────
    const handleSetSchedule = () => {
        setScheduleError(null);
        if (!scheduleStart || !scheduleStop) {
            setScheduleError("กรุณากรอกเวลาเปิดและปิดให้ครบครับ");
            return;
        }
        const now = new Date();
        const [startH, startM] = scheduleStart.split(":").map(Number);
        const [stopH,  stopM]  = scheduleStop.split(":").map(Number);

        const startDate = new Date(now);
        startDate.setHours(startH, startM, 0, 0);
        const stopDate = new Date(now);
        stopDate.setHours(stopH, stopM, 0, 0);

        if (startDate <= now) {
            setScheduleError("เวลาเปิดผ่านไปแล้ว ไม่สามารถตั้งได้ครับ");
            return;
        }
        if (stopDate <= startDate) {
            setScheduleError("เวลาปิดต้องมาหลังเวลาเปิดครับ");
            return;
        }

        const msUntilStart = startDate.getTime() - now.getTime();
        const msUntilStop  = stopDate.getTime()  - now.getTime();

        setScheduleStatus("waiting");
        setScheduleInfo({ start: scheduleStart, stop: scheduleStop, level: scheduleLevel });

        startTimeoutRef.current = setTimeout(() => {
            sendSetLevel(scheduleLevel);
            setScheduleStatus("running");
        }, msUntilStart);

        stopTimeoutRef.current = setTimeout(() => {
            sendSetLevel(0);
            setScheduleStatus("idle");
            setScheduleInfo(null);
        }, msUntilStop);
    };

    const handleCancelSchedule = () => {
        if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
        if (stopTimeoutRef.current)  clearTimeout(stopTimeoutRef.current);
        startTimeoutRef.current = null;
        stopTimeoutRef.current  = null;
        setScheduleStatus("idle");
        setScheduleError(null);
        setScheduleInfo(null);
    };

    // cleanup on unmount
    useEffect(() => {
        return () => {
            if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
            if (stopTimeoutRef.current)  clearTimeout(stopTimeoutRef.current);
        };
    }, []);

    // ── Electrode buttons ──────────────────────────────────────────────────
    const handleLevelButton = (level: 1 | 2 | 3) => {
        const target = currentLevel === level ? (0 as const) : level;
        setLoadingAction(`level_${target}`);
        sendSetLevel(target);
        setTimeout(() => setLoadingAction(null), 800);
    };

    // ── Mode toggle ────────────────────────────────────────────────────────
    const isLocalMode = data?.mode === "local";
    const handleToggleMode = () => {
        if (!data) return;
        sendSetMode(isLocalMode ? "remote" : "local");
    };

    const isScheduleActive = scheduleStatus !== "idle";
    const isRemote         = !isLocalMode;

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur shadow-lg">
            <CardHeader className="border-b border-border/50 pb-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg font-semibold tracking-tight">
                    System Control Panel
                </CardTitle>

                {/* Mode Toggle */}
                <button
                    id="mode-toggle-btn"
                    onClick={handleToggleMode}
                    disabled={!data}
                    title={isLocalMode ? "Switch to Remote mode" : "Switch to Local mode"}
                    className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border uppercase tracking-wider transition-all duration-300 active:scale-95
                        ${!data
                            ? "bg-slate-700/30 text-slate-500 border-slate-600/30 cursor-not-allowed opacity-60"
                            : isLocalMode
                                ? "bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                                : "bg-sky-500/15 text-sky-400 border-sky-500/40 hover:bg-sky-500/25 cursor-pointer shadow-[0_0_12px_rgba(14,165,233,0.2)]"
                        }`}
                >
                    {isLocalMode
                        ? <><Cpu className="w-3.5 h-3.5" /> Local&nbsp;<span className="opacity-60 font-normal normal-case tracking-normal">→ Remote</span></>
                        : <><Cloud className="w-3.5 h-3.5" /> Remote&nbsp;<span className="opacity-60 font-normal normal-case tracking-normal">→ Local</span></>
                    }
                </button>
            </CardHeader>

            <CardContent className="p-6 space-y-8">

                {/* ── Auto-Shutoff Timer ── */}
                <div className="space-y-5">
                    {/* Section header + Tab switcher */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-slate-400 tracking-widest uppercase flex items-center gap-2">
                            <Timer className="w-4 h-4 text-sky-400" />
                            Auto-Shutoff Timer
                        </h3>
                        <div className="flex bg-slate-800/60 rounded-lg p-0.5 border border-slate-700/40 gap-0.5">
                            <button
                                onClick={() => setActiveTab("timer")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200
                                    ${activeTab === "timer"
                                        ? "bg-sky-600 text-white shadow"
                                        : "text-slate-400 hover:text-slate-200"}`}
                            >
                                <Timer className="w-3 h-3" /> Timer
                            </button>
                            <button
                                onClick={() => setActiveTab("schedule")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200
                                    ${activeTab === "schedule"
                                        ? "bg-sky-600 text-white shadow"
                                        : "text-slate-400 hover:text-slate-200"}`}
                            >
                                <CalendarClock className="w-3 h-3" /> Schedule
                            </button>
                        </div>
                    </div>

                    {/* ── Timer Tab ── */}
                    {activeTab === "timer" && (
                        <div className="bg-slate-900/40 rounded-2xl border border-slate-700/40 p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:justify-center gap-6 sm:gap-12">
                            {/* SVG Ring */}
                            <div className="relative flex-shrink-0 flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28">
                                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
                                    <circle cx="48" cy="48" r="40" fill="none" stroke="#1e293b" strokeWidth="8" />
                                    <circle
                                        cx="48" cy="48" r="40" fill="none"
                                        stroke={countdown !== null ? (progress > 0.25 ? "#38bdf8" : "#f87171") : "#334155"}
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 40}`}
                                        strokeDashoffset={`${countdown !== null ? 2 * Math.PI * 40 * (1 - progress) : 0}`}
                                        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
                                    />
                                </svg>
                                <span className={`text-xl sm:text-2xl font-extrabold tabular-nums ${countdown !== null ? (progress > 0.25 ? "text-sky-300" : "text-red-400") : "text-slate-400"}`}>
                                    {countdown !== null ? formatTime(countdown) : "00:00"}
                                </span>
                            </div>

                            {countdown !== null ? (
                                <div className="flex flex-col gap-2 justify-center text-center sm:text-left">
                                    <p className="text-[14px] text-slate-300">
                                        Electrodes will shut off automatically at <span className="text-white font-semibold tabular-nums">00:00</span>
                                    </p>
                                    <p className="text-[12px] text-slate-500 mb-2">
                                        Started with <span className="text-slate-400">{formatTime(totalSeconds!)}</span>
                                    </p>
                                    <button
                                        onClick={handleCancelTimer}
                                        className="flex items-center justify-center sm:justify-start gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 active:scale-95 transition-all w-full sm:w-fit"
                                    >
                                        <StopCircle className="w-4 h-4" /> Cancel timer
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 justify-center text-center sm:text-left">
                                    <p className="text-[14px] text-slate-300 mb-1">Set running duration before auto shutdown.</p>
                                    <div className="flex flex-col sm:flex-row items-center gap-3">
                                        <input
                                            type="number"
                                            placeholder="Duration (e.g. 180s)"
                                            value={timerInput}
                                            onChange={(e) => setTimerInput(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleConfirmTimer()}
                                            className="flex h-11 w-full sm:w-48 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm placeholder:text-slate-500 text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 transition-all disabled:cursor-not-allowed disabled:opacity-50 shadow-inner text-center sm:text-left"
                                            disabled={!data || isLocalMode}
                                        />
                                        <button
                                            onClick={handleConfirmTimer}
                                            className="h-11 px-6 w-full sm:w-auto rounded-lg bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-semibold text-sm transition-all shadow-md hover:shadow-sky-600/20 disabled:opacity-50 disabled:pointer-events-none"
                                            disabled={!data || isLocalMode || !timerInput}
                                        >
                                            Start
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Schedule Tab ── */}
                    {activeTab === "schedule" && (
                        <div className="bg-slate-900/40 rounded-2xl border border-slate-700/40 p-6 space-y-5">

                            {/* Status banner */}
                            {scheduleStatus === "waiting" && scheduleInfo && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
                                    <CalendarClock className="w-4 h-4 flex-shrink-0 animate-pulse" />
                                    <span>รอเปิดเวลา <strong>{scheduleInfo.start}</strong> · ปิดเวลา <strong>{scheduleInfo.stop}</strong> · Level {scheduleInfo.level}</span>
                                </div>
                            )}
                            {scheduleStatus === "running" && scheduleInfo && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-sm">
                                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping flex-shrink-0" />
                                    <span>กำลังทำงาน · ปิดอัตโนมัติเวลา <strong>{scheduleInfo.stop}</strong> · Level {scheduleInfo.level}</span>
                                </div>
                            )}

                            {/* Error */}
                            {scheduleError && (
                                <p className="text-red-400 text-xs px-1">{scheduleError}</p>
                            )}

                            {/* Form */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">เวลาเปิด</label>
                                    <input
                                        type="time"
                                        value={scheduleStart}
                                        onChange={(e) => { setScheduleStart(e.target.value); setScheduleError(null); }}
                                        disabled={isScheduleActive || !isRemote}
                                        className="w-full h-11 rounded-lg border border-slate-700 bg-slate-800/80 px-4 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed [color-scheme:dark]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">เวลาปิด</label>
                                    <input
                                        type="time"
                                        value={scheduleStop}
                                        onChange={(e) => { setScheduleStop(e.target.value); setScheduleError(null); }}
                                        disabled={isScheduleActive || !isRemote}
                                        className="w-full h-11 rounded-lg border border-slate-700 bg-slate-800/80 px-4 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            {/* Level selector */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Electrode Level</label>
                                <div className="flex gap-2">
                                    {([1, 2, 3] as const).map((lv) => (
                                        <button
                                            key={lv}
                                            onClick={() => setScheduleLevel(lv)}
                                            disabled={isScheduleActive || !isRemote}
                                            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-200 active:scale-95
                                                ${scheduleLevel === lv
                                                    ? "bg-sky-500/20 border-sky-500 text-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.25)]"
                                                    : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-500"}
                                                disabled:opacity-40 disabled:cursor-not-allowed`}
                                        >
                                            Level {lv}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Action buttons */}
                            {!isScheduleActive ? (
                                <button
                                    onClick={handleSetSchedule}
                                    disabled={!isRemote || !scheduleStart || !scheduleStop}
                                    className="w-full h-11 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-semibold text-sm transition-all shadow-md disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    {!isRemote ? "เปลี่ยนเป็น Remote mode ก่อนครับ" : "ตั้ง Schedule"}
                                </button>
                            ) : (
                                <button
                                    onClick={handleCancelSchedule}
                                    className="w-full h-11 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <StopCircle className="w-4 h-4" /> ยกเลิก Schedule
                                </button>
                            )}

                            {!isRemote && (
                                <p className="text-center text-[11px] text-slate-500">⚠️ ต้องอยู่ใน Remote mode จึงจะตั้ง Schedule ได้ครับ</p>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Electrode Power ── */}
                <div className="space-y-5">
                    <h3 className="text-xs font-semibold text-slate-400 tracking-widest uppercase">
                        Electrode Power
                    </h3>

                    <div className="bg-slate-900/40 rounded-2xl border border-slate-700/40 p-5">
                        <p className="text-[11px] text-slate-500 mb-5">Active electrodes</p>
                        <div className="flex items-end justify-center gap-12">
                            {(["A", "B", "C"] as const).map((label, i) => {
                                const isOn = currentLevel > i;
                                return (
                                    <div key={label} className="flex flex-col items-center gap-2.5">
                                        <span className={`text-[10px] font-bold tracking-widest uppercase ${isOn ? "text-sky-400" : "text-slate-600"}`}>
                                            Electrode {label}
                                        </span>
                                        <div className={`relative flex items-center justify-center w-16 h-16 rounded-full border-2 text-base font-bold transition-all duration-500
                                            ${isOn ? "bg-sky-500 border-sky-400 text-white shadow-[0_0_22px_rgba(14,165,233,0.75)]"
                                                   : "bg-slate-800/60 border-slate-700/50 text-slate-600"}`}
                                        >
                                            {isOn && <span className="absolute inset-0 rounded-full border-2 border-sky-400/40 animate-ping" />}
                                            {label}
                                        </div>
                                        <span className={`text-[10px] font-semibold tracking-wider ${isOn ? "text-sky-400" : "text-slate-600"}`}>
                                            {isOn ? "ON" : "OFF"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-center text-xs text-slate-500 mt-5">
                            {currentLevel === 0 ? "No electrodes active" : `${currentLevel} electrode${currentLevel > 1 ? "s" : ""} running`}
                        </p>
                    </div>

                    <div>
                        <p className="text-[11px] text-slate-500 mb-3">Select level</p>
                        <div className="flex gap-3">
                            {([1, 2, 3] as const).map((level) => {
                                const isActive   = currentLevel === level;
                                const isLoading  = loadingAction === `level_${level}`;
                                const isDisabled = !data || loadingAction !== null || isLocalMode;

                                return (
                                    <button
                                        key={level}
                                        id={`electrode-level-${level}`}
                                        onClick={() => handleLevelButton(level)}
                                        disabled={isDisabled}
                                        className={`relative flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl border-2 font-semibold transition-all duration-300
                                            ${isActive
                                                ? "bg-sky-500/15 border-sky-500 text-sky-300 shadow-[0_0_20px_rgba(14,165,233,0.3)]"
                                                : "bg-slate-900/60 border-slate-700/60 text-slate-400 hover:bg-slate-800/70 hover:border-slate-600"}
                                            ${isDisabled ? "opacity-50 cursor-not-allowed" : "active:scale-95 cursor-pointer"}`}
                                    >
                                        {isLoading && <Loader2 className="absolute top-2 right-2 w-3 h-3 animate-spin text-sky-400" />}
                                        <span className={`text-2xl font-extrabold tabular-nums ${isActive ? "text-sky-300" : "text-slate-300"}`}>{level}</span>
                                        <span className={`text-[10px] font-bold tracking-widest uppercase ${isActive ? "text-sky-500" : "text-slate-600"}`}>Level {level}</span>
                                        {isActive && <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.8)]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Active Modules ── */}
                <div className="pt-6 border-t border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Active Modules</h3>
                            <p className="text-xs text-slate-500">Currently active generator count</p>
                        </div>
                        <div className="py-2 px-6 bg-slate-900/50 rounded-2xl border border-slate-700/50 shadow-inner">
                            <div className="text-center text-3xl font-extrabold tabular-nums text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
                                {activeModules}
                            </div>
                        </div>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
