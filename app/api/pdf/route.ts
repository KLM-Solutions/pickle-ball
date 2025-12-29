/**
 * PDF Generation API
 * 
 * Generates a PDF report from the analysis data.
 * Uses puppeteer-core with chromium-min for serverless environments.
 */

import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

// HTML template for the PDF report
function generateReportHTML(data: {
  strokeType: string;
  grade: string;
  overallScore: number;
  frames: number;
  duration: number;
  riskScore: number;
  riskCounts: { high: number; medium: number; low: number };
  shoulderScore: number;
  hipScore: number;
  kneeScore: number;
  elbowScore: number;
  avgShoulder: number | null;
  avgHip: number | null;
  avgKnee: number | null;
  avgElbow: number | null;
  llmResponse: string | null;
  generatedAt: string;
}): string {
  const formatLlmResponse = (text: string | null): string => {
    if (!text) return '<p class="text-gray-500 text-center py-4">AI coaching feedback not available.</p>';
    
    // Convert markdown to HTML
    return text
      .replace(/## (.*)/g, '<h2 class="text-lg font-bold text-black mt-6 mb-3">$1</h2>')
      .replace(/### (.*)/g, '<h3 class="text-base font-semibold text-gray-700 mt-4 mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-black">$1</strong>')
      .replace(/- (.*)/g, '<li class="ml-4">$1</li>')
      .replace(/\n\n/g, '</p><p class="text-gray-600 mb-3 leading-relaxed text-sm">')
      .replace(/\n/g, '<br>');
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StrikeSense Performance Report</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    body { font-family: 'Inter', sans-serif; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    .page-break { page-break-after: always; }
  </style>
</head>
<body class="bg-white text-gray-900 p-8">
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-black flex items-center justify-center text-2xl">
          🏓
        </div>
        <div>
          <h1 class="text-xl font-bold">StrikeSense</h1>
          <p class="text-xs text-gray-500">AI Stroke Analysis</p>
        </div>
      </div>
      <div class="text-right">
        <p class="text-sm font-medium text-gray-600">${data.generatedAt}</p>
        <p class="text-xs text-gray-400">${data.strokeType.charAt(0).toUpperCase() + data.strokeType.slice(1)} Analysis</p>
      </div>
    </div>

    <!-- Title -->
    <div class="text-center mb-10">
      <h2 class="text-3xl font-bold text-black mb-2">Performance Report</h2>
      <p class="text-gray-500 text-sm">${data.strokeType.charAt(0).toUpperCase() + data.strokeType.slice(1)} Technique Analysis</p>
    </div>

    <!-- Grade Card -->
    <div class="bg-gray-50 rounded-2xl p-8 border border-gray-200 mb-8">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-gray-500 text-sm font-medium mb-1">Overall Score</p>
          <div class="flex items-baseline gap-3">
            <span class="text-6xl font-black text-black">${data.grade}</span>
            <span class="text-3xl font-bold text-gray-400">${data.overallScore}%</span>
          </div>
        </div>
        <div class="w-24 h-24 relative">
          <svg class="w-full h-full transform -rotate-90">
            <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e5e5" stroke-width="8" />
            <circle 
              cx="48" cy="48" r="40" fill="none" stroke="black" stroke-width="8" 
              stroke-linecap="round"
              stroke-dasharray="${data.overallScore * 2.51} 251"
            />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-2xl">🏆</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Key Metrics Grid -->
    <div class="grid grid-cols-4 gap-4 mb-8">
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <p class="text-xs text-gray-500 mb-1">Frames</p>
        <p class="text-2xl font-bold text-black">${data.frames}</p>
        <p class="text-xs text-gray-400">${data.duration.toFixed(1)}s duration</p>
      </div>
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <p class="text-xs text-gray-500 mb-1">Form Safety</p>
        <p class="text-2xl font-bold text-black">${data.riskScore}%</p>
        <p class="text-xs text-gray-400">${data.riskCounts.high > 0 ? data.riskCounts.high + ' caution' : 'Looking good'}</p>
      </div>
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <p class="text-xs text-gray-500 mb-1">Avg Hip</p>
        <p class="text-2xl font-bold text-black">${data.avgHip?.toFixed(0) || '--'}°</p>
        <p class="text-xs text-gray-400">rotation</p>
      </div>
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <p class="text-xs text-gray-500 mb-1">Shoulder</p>
        <p class="text-2xl font-bold text-black">${data.avgShoulder?.toFixed(0) || '--'}°</p>
        <p class="text-xs text-gray-400">abduction</p>
      </div>
    </div>

    <!-- Biomechanics Breakdown -->
    <div class="bg-gray-50 rounded-2xl p-6 border border-gray-200 mb-8">
      <h3 class="text-lg font-semibold text-black mb-5">Biomechanics Breakdown</h3>
      
      <div class="space-y-5">
        <div>
          <div class="flex justify-between items-baseline mb-2">
            <span class="text-sm font-medium text-gray-600">Shoulder Mechanics</span>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400">Avg: ${data.avgShoulder?.toFixed(0) || '--'}°</span>
              <span class="text-sm font-bold text-black">${data.shoulderScore}%</span>
            </div>
          </div>
          <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div class="h-full bg-black" style="width: ${data.shoulderScore}%"></div>
          </div>
        </div>
        
        <div>
          <div class="flex justify-between items-baseline mb-2">
            <span class="text-sm font-medium text-gray-600">Hip Power Transfer</span>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400">Avg: ${data.avgHip?.toFixed(0) || '--'}°</span>
              <span class="text-sm font-bold text-black">${data.hipScore}%</span>
            </div>
          </div>
          <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div class="h-full bg-black" style="width: ${data.hipScore}%"></div>
          </div>
        </div>
        
        <div>
          <div class="flex justify-between items-baseline mb-2">
            <span class="text-sm font-medium text-gray-600">Knee Stability</span>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400">Avg: ${data.avgKnee?.toFixed(0) || '--'}°</span>
              <span class="text-sm font-bold text-black">${data.kneeScore}%</span>
            </div>
          </div>
          <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div class="h-full bg-black" style="width: ${data.kneeScore}%"></div>
          </div>
        </div>
        
        <div>
          <div class="flex justify-between items-baseline mb-2">
            <span class="text-sm font-medium text-gray-600">Elbow Extension</span>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400">Avg: ${data.avgElbow?.toFixed(0) || '--'}°</span>
              <span class="text-sm font-bold text-black">${data.elbowScore}%</span>
            </div>
          </div>
          <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div class="h-full bg-black" style="width: ${data.elbowScore}%"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Coach Analysis -->
    <div class="bg-gray-50 rounded-2xl p-6 border border-gray-200 mb-8">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
          <span class="text-white">💬</span>
        </div>
        <div>
          <h3 class="text-base font-semibold text-black">AI Coach Analysis</h3>
          <p class="text-xs text-gray-500">Personalized feedback & recommendations</p>
        </div>
      </div>
      
      <div class="bg-white rounded-xl p-5 border border-gray-200">
        <div class="prose prose-sm max-w-none">
          ${formatLlmResponse(data.llmResponse)}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center pt-6 border-t border-gray-200">
      <p class="text-xs text-gray-400">
        Generated by StrikeSense • AI-Powered Pickleball Analysis • ${data.generatedAt}
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate HTML from data
    const html = generateReportHTML(body);

    // Launch browser
    const executablePath = await chromium.executablePath(
      "https://github.com/nicknisi/chromium/releases/download/v127.0.6533.119/chromium-v127.0.6533.119-pack.tar"
    );

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1200, height: 800 },
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    
    // Set content
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    await browser.close();

    // Convert Uint8Array to Buffer for NextResponse
    const pdf = Buffer.from(pdfBuffer);

    // Return PDF
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="strikesense-report-${Date.now()}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error.message },
      { status: 500 }
    );
  }
}
