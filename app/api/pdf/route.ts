import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for PDF generation

// Generate HTML report from data
function generateReportHTML(data: any): string {
  const {
    strokeType = "serve",
    grade = "B+",
    overallScore = 75,
    frames = 0,
    duration = 0,
    riskScore = 80,
    riskCounts = { high: 0, medium: 0, low: 0 },
    shoulderScore = 80,
    hipScore = 70,
    kneeScore = 75,
    elbowScore = 80,
    avgShoulder = null,
    avgHip = null,
    avgKnee = null,
    avgElbow = null,
    llmResponse = "",
    generatedAt = new Date().toLocaleDateString(),
  } = data;

  // Convert markdown-like LLM response to HTML
  const formatLLMResponse = (text: string) => {
    if (!text) return "<p>No AI coaching feedback available.</p>";
    
    return text
      .replace(/## (.*?)$/gm, '<h2 class="section-title">$1</h2>')
      .replace(/### (.*?)$/gm, '<h3 class="subsection-title">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/^\- (.*?)$/gm, '<li class="list-item">$1</li>')
      .replace(/^\d+\. (.*?)$/gm, '<li class="numbered-item">$1</li>')
      .replace(/\n\n/g, "</p><p>")
      .replace(/<\/li>\n<li/g, "</li><li");
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StrikeSense Performance Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #ffffff;
      color: #171717;
      line-height: 1.5;
      padding: 40px;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e5e5;
    }
    
    .logo {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .subtitle {
      color: #737373;
      font-size: 14px;
    }
    
    .report-title {
      font-size: 32px;
      font-weight: 700;
      margin: 20px 0 8px;
    }
    
    .report-meta {
      color: #737373;
      font-size: 14px;
    }
    
    .grade-section {
      background: #fafafa;
      border: 1px solid #e5e5e5;
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .grade-label {
      color: #737373;
      font-size: 14px;
      margin-bottom: 4px;
    }
    
    .grade-value {
      font-size: 64px;
      font-weight: 800;
      color: #000;
    }
    
    .grade-percent {
      font-size: 28px;
      font-weight: 700;
      color: #a3a3a3;
      margin-left: 12px;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    
    .metric-card {
      background: #fafafa;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      padding: 16px;
    }
    
    .metric-label {
      color: #737373;
      font-size: 11px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    
    .metric-value {
      font-size: 24px;
      font-weight: 700;
      color: #000;
    }
    
    .metric-subtext {
      color: #a3a3a3;
      font-size: 11px;
      margin-top: 4px;
    }
    
    .section {
      background: #fafafa;
      border: 1px solid #e5e5e5;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    
    .section-header {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .progress-bar-container {
      margin-bottom: 16px;
    }
    
    .progress-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    
    .progress-name {
      font-size: 14px;
      color: #525252;
    }
    
    .progress-detail {
      font-size: 12px;
      color: #a3a3a3;
    }
    
    .progress-value {
      font-size: 14px;
      font-weight: 600;
      color: #000;
    }
    
    .progress-bar {
      height: 8px;
      background: #e5e5e5;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: #000;
      border-radius: 4px;
    }
    
    .ai-feedback {
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      padding: 20px;
    }
    
    .ai-feedback .section-title {
      font-size: 16px;
      font-weight: 600;
      margin: 20px 0 12px;
      color: #000;
    }
    
    .ai-feedback .section-title:first-child {
      margin-top: 0;
    }
    
    .ai-feedback .subsection-title {
      font-size: 14px;
      font-weight: 600;
      margin: 16px 0 8px;
      color: #525252;
    }
    
    .ai-feedback p {
      font-size: 13px;
      color: #525252;
      margin-bottom: 12px;
      line-height: 1.6;
    }
    
    .ai-feedback ul, .ai-feedback ol {
      margin: 12px 0;
      padding-left: 20px;
    }
    
    .ai-feedback li {
      font-size: 13px;
      color: #525252;
      margin-bottom: 6px;
      line-height: 1.5;
    }
    
    .footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid #e5e5e5;
      color: #a3a3a3;
      font-size: 12px;
    }
    
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🏓 StrikeSense</div>
      <div class="subtitle">AI-Powered Pickleball Analysis</div>
      <h1 class="report-title">Performance Report</h1>
      <p class="report-meta">${strokeType.charAt(0).toUpperCase() + strokeType.slice(1)} Analysis • ${generatedAt}</p>
    </div>
    
    <div class="grade-section">
      <div>
        <p class="grade-label">Overall Score</p>
        <div style="display: flex; align-items: baseline;">
          <span class="grade-value">${grade}</span>
          <span class="grade-percent">${overallScore}%</span>
        </div>
      </div>
      <div style="text-align: right;">
        <p class="grade-label">Analysis Summary</p>
        <p style="font-size: 14px; color: #525252;">${frames} frames • ${duration.toFixed(1)}s duration</p>
      </div>
    </div>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <p class="metric-label">FRAMES ANALYZED</p>
        <p class="metric-value">${frames}</p>
        <p class="metric-subtext">${duration.toFixed(1)}s duration</p>
      </div>
      <div class="metric-card">
        <p class="metric-label">FORM SAFETY</p>
        <p class="metric-value">${riskScore}%</p>
        <p class="metric-subtext">${riskCounts.high > 0 ? `${riskCounts.high} caution` : "Looking good"}</p>
      </div>
      <div class="metric-card">
        <p class="metric-label">AVG HIP ROTATION</p>
        <p class="metric-value">${avgHip ? avgHip.toFixed(0) : "--"}</p>
        <p class="metric-subtext">degrees</p>
      </div>
      <div class="metric-card">
        <p class="metric-label">SHOULDER RANGE</p>
        <p class="metric-value">${avgShoulder ? avgShoulder.toFixed(0) : "--"}°</p>
        <p class="metric-subtext">average</p>
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-header">📊 Biomechanics Breakdown</h2>
      
      <div class="progress-bar-container">
        <div class="progress-label">
          <span class="progress-name">Shoulder Mechanics</span>
          <span>
            <span class="progress-detail">${avgShoulder ? `Avg: ${avgShoulder.toFixed(0)}°` : "No data"}</span>
            <span class="progress-value" style="margin-left: 12px;">${shoulderScore}%</span>
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${shoulderScore}%;"></div>
        </div>
      </div>
      
      <div class="progress-bar-container">
        <div class="progress-label">
          <span class="progress-name">Hip Power Transfer</span>
          <span>
            <span class="progress-detail">${avgHip ? `Avg: ${avgHip.toFixed(0)}°` : "No data"}</span>
            <span class="progress-value" style="margin-left: 12px;">${hipScore}%</span>
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${hipScore}%;"></div>
        </div>
      </div>
      
      <div class="progress-bar-container">
        <div class="progress-label">
          <span class="progress-name">Knee Stability</span>
          <span>
            <span class="progress-detail">${avgKnee ? `Avg: ${avgKnee.toFixed(0)}°` : "No data"}</span>
            <span class="progress-value" style="margin-left: 12px;">${kneeScore}%</span>
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${kneeScore}%;"></div>
        </div>
      </div>
      
      <div class="progress-bar-container">
        <div class="progress-label">
          <span class="progress-name">Elbow Extension</span>
          <span>
            <span class="progress-detail">${avgElbow ? `Avg: ${avgElbow.toFixed(0)}°` : "No data"}</span>
            <span class="progress-value" style="margin-left: 12px;">${elbowScore}%</span>
          </span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${elbowScore}%;"></div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-header">🤖 AI Coach Analysis</h2>
      <div class="ai-feedback">
        ${formatLLMResponse(llmResponse)}
      </div>
    </div>
    
    <div class="footer">
      <p>Generated by StrikeSense • ${generatedAt}</p>
      <p style="margin-top: 4px;">© 2024 StrikeSense • AI-Powered Pickleball Analysis</p>
    </div>
  </div>
</body>
</html>
  `;
}

export async function POST(request: NextRequest) {
  let browser = null;

  try {
    const body = await request.json();

    // Generate HTML from data
    const html = generateReportHTML(body);

    // Launch browser with @sparticuz/chromium
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1200, height: 800 },
      executablePath: await chromium.executablePath(),
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
    browser = null;

    // Return PDF
    return new NextResponse(Buffer.from(pdfBuffer), {
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
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

