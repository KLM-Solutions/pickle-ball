/**
 * LLM Response Generation API
 * 
 * This endpoint receives analysis data and generates coaching feedback.
 * For now, it returns dummy data. Later, it will:
 * 1. Select relevant frame data
 * 2. Send to LLM (OpenAI/Claude)
 * 3. Return structured coaching response
 */

import { NextRequest, NextResponse } from "next/server";

// Dummy LLM response for different stroke types
const DUMMY_RESPONSES: Record<string, string> = {
  serve: `## 🎾 Serve Analysis Report

### Overall Assessment
Your serve technique shows **good fundamentals** with room for improvement in power generation. Your contact point and ball toss timing are consistent, which is a strong foundation.

### Key Strengths
- **Consistent ball toss**: Your toss placement is reliable, landing in the optimal zone 85% of the time
- **Good knee bend**: You're generating power from your legs effectively
- **Solid follow-through**: Your paddle path after contact maintains good extension

### Areas for Improvement

#### 1. Hip Rotation (Priority: High)
Your hip rotation averages **23°**, which is below the optimal range of 35-45° for maximum power. Focus on:
- Starting with hips facing sideways
- Initiating the swing with hip rotation before arm movement
- Think "coil and uncoil" rather than arm-only swing

#### 2. Shoulder Position (Priority: Medium)
At contact, your shoulder abduction reaches **87°**. For more power without injury risk:
- Keep shoulder below 130° during the serve
- Focus on upward extension rather than lateral movement

### Drill Recommendations
1. **Shadow Swings**: Practice the serve motion without a ball, focusing on hip rotation
2. **Towel Drill**: Hold a towel behind you to feel the full rotation
3. **Wall Serves**: Practice against a wall to work on consistency

### Injury Prevention Notes
✅ No high-risk movements detected
⚠️ Monitor shoulder fatigue during extended sessions
💡 Consider adding rotator cuff exercises to your warm-up

---
*Analysis based on ${new Date().toLocaleDateString()} session*`,

  dink: `## 🤏 Dink Analysis Report

### Overall Assessment
Your dink technique demonstrates **excellent soft touch** and control. Your paddle face angle is well-maintained, creating consistent trajectory over the net.

### Key Strengths
- **Soft hands**: Minimal backswing creates predictable shots
- **Good posture**: Athletic stance with bent knees
- **Patient approach**: Not rushing shots unnecessarily

### Areas for Improvement

#### 1. Knee Bend Consistency (Priority: Medium)
Your knee flexion varies between shots. For better consistency:
- Maintain 20-30° knee bend throughout the exchange
- Lower your center of gravity before each shot
- Think "sit into the shot" rather than reaching

#### 2. Paddle Position (Priority: Low)
Occasionally your paddle drops below ideal position:
- Keep paddle face at net height between shots
- Use shorter, more compact strokes
- Reset to ready position immediately after each dink

### Drill Recommendations
1. **Kitchen Line Drops**: Drop 50 balls from shoulder height, focus on soft landing
2. **Dink Rallies**: 2-minute sustained dink rallies with a partner
3. **Target Practice**: Place targets in the kitchen and aim for precision

### Tactical Tips
- Vary your dink placement (middle, sideline, deep, short)
- Watch opponent's feet for anticipation cues
- Stay patient - the first player to speed up often loses

---
*Analysis based on ${new Date().toLocaleDateString()} session*`,

  groundstroke: `## 💪 Drive Analysis Report

### Overall Assessment
Your groundstroke mechanics show **solid power generation** with good hip rotation. Your drives are generating adequate pace while maintaining reasonable accuracy.

### Key Strengths
- **Hip rotation**: Strong kinetic chain engagement at 45° average
- **Balanced stance**: Good weight transfer through the shot
- **Follow-through**: Complete extension after contact

### Areas for Improvement

#### 1. Contact Point (Priority: High)
Your contact point is slightly late on 40% of drives:
- Meet the ball further in front of your body
- Prepare earlier with your backswing
- Watch the ball all the way to the paddle

#### 2. Recovery Position (Priority: Medium)
After driving, you're slow to reset:
- Split step immediately after contact
- Return paddle to ready position
- Anticipate opponent's return early

### Drill Recommendations
1. **Wall Rallies**: Drive against a wall, focus on contact point
2. **Cross-Court Patterns**: Practice consistent cross-court drives
3. **Footwork Ladder**: Improve recovery speed with agility drills

### Power vs Control Balance
Your current ratio: 70% power / 30% control
Recommended ratio: 60% power / 40% control

---
*Analysis based on ${new Date().toLocaleDateString()} session*`,

  overhead: `## ⚡ Overhead Analysis Report

### Overall Assessment
Your overhead technique shows **good timing and extension**. You're making contact at or near the optimal point above your hitting shoulder.

### Key Strengths
- **Full extension**: Reaching high for contact point
- **Good positioning**: Moving under the ball effectively
- **Solid power**: Generating pace on putaway shots

### Areas for Improvement

#### 1. Shoulder Safety (Priority: High)
Your shoulder abduction peaks at **142°** which approaches the injury risk zone:
- Focus on hitting "through" the ball rather than "around" it
- Use more wrist snap for power instead of arm swing
- Avoid over-rotation at the top of the swing

#### 2. Footwork (Priority: Medium)
Positioning could be more efficient:
- Drop step immediately when lob is identified
- Side shuffle rather than backpedal
- Set feet before swinging when possible

### Drill Recommendations
1. **Drop-Hit Drill**: Partner feeds lobs, focus on footwork first
2. **Shadow Overheads**: Practice the motion without a ball
3. **Bounce Overheads**: Let the ball bounce first for timing practice

### Injury Prevention Notes
⚠️ High shoulder extension detected - limit overhead practice volume
💡 Add shoulder mobility exercises to prevent strain
✅ Good leg drive helping reduce arm stress

---
*Analysis based on ${new Date().toLocaleDateString()} session*`,
};

const DEFAULT_RESPONSE = `## 📊 Stroke Analysis Report

### Overall Assessment
Your technique has been analyzed across multiple metrics. Overall form shows good fundamentals with specific areas identified for improvement.

### Key Observations
- Consistent movement patterns detected
- Good athletic positioning
- Proper paddle control observed

### General Recommendations
1. Continue practicing fundamental movements
2. Focus on maintaining consistent form under pressure
3. Consider video review for continued improvement

### Next Steps
- Review the detailed metrics in the JSON data
- Focus on one area of improvement at a time
- Schedule follow-up analysis in 2-4 weeks

---
*Analysis based on ${new Date().toLocaleDateString()} session*`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stroke_type, frames, summary, job_id } = body;

    // TODO: Later - select relevant frames for LLM
    // TODO: Later - call actual LLM API (OpenAI/Claude)
    // For now, return dummy response based on stroke type

    console.log(`[LLM Response] Generating response for stroke_type=${stroke_type}, frames=${frames?.length || 0}`);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get dummy response based on stroke type
    const llmResponse = DUMMY_RESPONSES[stroke_type] || DEFAULT_RESPONSE;

    // Add some dynamic content based on actual data
    let enhancedResponse = llmResponse;
    
    if (frames && frames.length > 0) {
      // Add frame count to response
      enhancedResponse = enhancedResponse.replace(
        /Analysis based on/,
        `Analyzed ${frames.length} frames on`
      );
    }

    if (summary) {
      // Could enhance response with actual summary data later
    }

    return NextResponse.json({
      success: true,
      response: enhancedResponse,
      metadata: {
        stroke_type,
        frames_analyzed: frames?.length || 0,
        generated_at: new Date().toISOString(),
        model: "dummy-v1", // Later: "gpt-4" or "claude-3"
        job_id
      }
    });

  } catch (error: any) {
    console.error("[LLM Response] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate response" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch a previously generated response
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("job_id");

  if (!jobId) {
    return NextResponse.json(
      { error: "Missing job_id parameter" },
      { status: 400 }
    );
  }

  // TODO: Later - fetch from database
  // For now, return dummy
  return NextResponse.json({
    success: true,
    response: DEFAULT_RESPONSE,
    metadata: {
      job_id: jobId,
      generated_at: new Date().toISOString(),
    }
  });
}

