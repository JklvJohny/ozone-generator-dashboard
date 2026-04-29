"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Read initial theme from localStorage or system preference
    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem("theme");
        if (stored === "light") {
            setIsDark(false);
            document.documentElement.classList.remove("dark");
        } else {
            // Default to dark
            setIsDark(true);
            document.documentElement.classList.add("dark");
        }
    }, []);

    const toggle = () => {
        const next = !isDark;
        setIsDark(next);
        if (next) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    if (!mounted) return null;

    return (
        <button
            onClick={toggle}
            aria-label="Toggle light/dark mode"
            className={`
                relative flex items-center justify-center w-10 h-10 rounded-full
                border transition-all duration-300 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-sky-500/50
                ${isDark
                    ? "bg-slate-800 border-slate-600/60 hover:bg-slate-700 hover:border-slate-500 text-amber-300"
                    : "bg-sky-50 border-sky-200 hover:bg-sky-100 hover:border-sky-300 text-sky-600"
                }
                active:scale-90
            `}
            style={{ transition: "background 0.3s, border-color 0.3s, color 0.3s, transform 0.15s" }}
        >
            <span
                key={isDark ? "moon" : "sun"}
                style={{
                    display: "flex",
                    animation: "theme-icon-in 0.3s ease",
                }}
            >
                {isDark
                    ? <Moon className="w-4 h-4" strokeWidth={2} />
                    : <Sun className="w-4 h-4" strokeWidth={2} />
                }
            </span>
        </button>
    );
}
