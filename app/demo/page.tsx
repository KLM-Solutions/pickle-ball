"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { enableDemoMode, DEMO_STROKE_TYPE } from "@/lib/demo/demoData";

/**
 * Demo Entry Page
 * 
 * Sets up demo mode and redirects to the guide page.
 * This page is the entry point for the demo session.
 */
export default function DemoPage() {
    const router = useRouter();

    useEffect(() => {
        // Enable demo mode in session
        enableDemoMode();

        // Redirect to guide page with demo stroke type
        router.push(`/strikesense/guide?stroke=${DEMO_STROKE_TYPE}&demo=true`);
    }, [router]);

    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-black rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-2xl">🏓</span>
                </div>
                <h1 className="text-xl font-bold text-black mb-2">Starting Demo...</h1>
                <p className="text-neutral-500 text-sm">Loading your demo experience</p>
            </div>
        </div>
    );
}
