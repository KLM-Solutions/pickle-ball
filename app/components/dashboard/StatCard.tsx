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
        <div className="bg-background rounded-2xl p-4 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-text-secondary uppercase tracking-wide">{metric}</div>
                <Award className="w-4 h-4 text-accent" />
            </div>
            <div className="text-2xl font-bold text-secondary mb-1">
                {value}{unit}
            </div>
            <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <span className="text-xs text-text-secondary font-medium whitespace-nowrap">
                    Target: {target}{unit}
                </span>
            </div>
        </div>
    );
}
