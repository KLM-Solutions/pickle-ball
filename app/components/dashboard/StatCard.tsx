import { Award } from "lucide-react";

interface StatCardProps {
    metric: string;
    value: number;
    target: number;
    unit: string;
}

export function StatCard({ metric, value, target, unit }: StatCardProps) {
    const percentage = Math.min(100, (value / target) * 100);

    return (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-slate-400 uppercase tracking-wide">{metric}</div>
                <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
                {value}{unit}
            </div>
            <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                    Target: {target}{unit}
                </span>
            </div>
        </div>
    );
}
