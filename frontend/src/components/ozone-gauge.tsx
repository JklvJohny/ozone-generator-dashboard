import { SensorData } from "../types/sensor";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface OzoneGaugeProps {
    data: SensorData | null;
}

export function OzoneGauge({ data }: OzoneGaugeProps) {
    // ปรับหลอดให้เต็มหลอดที่ 5.0 PPM (แม็กซ์ของไม้บรรทัดใหม่ที่เราตั้งไว้)
    const MAX_PPM = 5.0;
    const currentPpm = data?.ozone_ppm || 0;

    const rawPercentage = (currentPpm / MAX_PPM) * 100;
    const percentage = Math.min(Math.max(rawPercentage, 0), 100);

    // Gradient selection (เขียว -> เหลือง -> แดง)
    let gradient = "from-emerald-400 to-emerald-600";
    let shadow = "shadow-emerald-500/50";
    
    if (currentPpm > 0.1) {
        // เหลือง: โอโซนเริ่มเกินมาตรฐาน OSHA 0.1 PPM (ห้ามสูดดมต่อเนื่อง)
        gradient = "from-amber-400 to-amber-600";
        shadow = "shadow-amber-500/50";
    }
    if (currentPpm > 1.0) {
        // แดง: โอโซนเข้มข้นจัด (โหมดฆ่าเชื้อ)
        gradient = "from-rose-500 to-rose-700";
        shadow = "shadow-rose-500/50";
    }

    return (
        <Card className="flex flex-col h-full bg-card/50 backdrop-blur border-border/50">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-foreground tracking-tight">Level Indicator</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center py-6">

                {/* The glass tube container */}
                <div className="relative w-20 h-64 bg-slate-900 rounded-full border border-slate-700/50 overflow-hidden flex items-end shadow-[inset_0_2px_15px_rgba(0,0,0,0.8),0_0_20px_rgba(56,189,248,0.05)]">
                    {/* Tick Marks Overlay */}
                    <div className="absolute inset-0 flex flex-col justify-between py-6 opacity-30 pointer-events-none z-10 w-full">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex flex-row items-center w-full">
                                <div className="w-1/3 border-t-2 border-slate-300" />
                            </div>
                        ))}
                    </div>

                    {/* Left side glare/reflection for 3D effect */}
                    <div className="absolute inset-y-0 left-2 w-2 bg-gradient-to-r from-white/10 to-transparent pointer-events-none z-20 rounded-full" />

                    {/* The illuminated fluid fill */}
                    <div
                        className={`w-full transition-all duration-700 ease-out bg-gradient-to-t opacity-90 shadow-[0_0_20px_rgba(0,0,0,0.5)] ${shadow} ${gradient} relative`}
                        style={{ height: `${percentage}%` }}
                    >
                        {/* Bubbles Animation Effect */}
                        {currentPpm > 0 && (
                            <div className="absolute inset-0 overflow-hidden mix-blend-overlay opacity-60">
                                <div className="absolute bottom-0 left-[20%] w-1.5 h-1.5 bg-white rounded-full animate-bubble-up" style={{ animationDelay: '0s' }} />
                                <div className="absolute bottom-0 left-[60%] w-2 h-2 bg-white rounded-full animate-bubble-up" style={{ animationDelay: '1.2s', animationDuration: '3s' }} />
                                <div className="absolute bottom-0 left-[40%] w-1 h-1 bg-white rounded-full animate-bubble-up" style={{ animationDelay: '2.5s', animationDuration: '5s' }} />
                                <div className="absolute bottom-0 left-[80%] w-1.5 h-1.5 bg-white rounded-full animate-bubble-up" style={{ animationDelay: '1.8s', animationDuration: '4s' }} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Readout */}
                <div className="mt-8 text-center flex flex-col">
                    <span className="text-4xl font-extrabold tracking-tighter text-foreground tabular-nums">
                        {currentPpm.toFixed(3)}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-1">
                        PPM
                    </span>
                </div>

            </CardContent>
        </Card>
    );
}
