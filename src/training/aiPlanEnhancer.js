/**
 * Non-Destructive AI Plan Enhancer for CoachCore Training Lab
 * Refines coaching cues, wording, and tactical tips via Gemini without altering authoritative drill IDs, durations, or safety rules.
 */

import { fetchRawAIPlan, confirmAIGenerationQuota } from '../firebaseHelpers.js';

/**
 * Enhances a valid local plan using Gemini AI without changing drill identities or durations.
 * @param {object} localPlan 
 * @param {string} apiKey 
 * @returns {Promise<object>} Enhanced plan object
 */
export async function enhancePlanWithAI(localPlan, apiKey) {
  if (!localPlan || !Array.isArray(localPlan.segments) || !apiKey) {
    return localPlan;
  }

  const { parameters = {} } = localPlan;
  const { uid, ageGroup, coachLevel, focusAreas } = parameters;

  // Build compact structured prompt sending ONLY selected drills and context
  const drillSummaries = localPlan.segments.map((seg, idx) => ({
    slot: idx + 1,
    drillId: seg.drillId,
    title: seg.title,
    minutes: seg.minutes,
    objective: seg.objective
  }));

  const promptText = `Refine coaching cues and tactical explanations for this pre-selected AFL training plan.
Target Age: ${ageGroup || 'U14'}
Coach Level: ${coachLevel || 3}
Focus: ${(focusAreas || []).join(', ')}

Selected Drills:
${JSON.stringify(drillSummaries, null, 2)}

Instructions:
Return a JSON array containing refined coaching cues and execution steps for each of the 4 segments in the exact order.
Do NOT change drillId, duration, or core safety rules.`;

  try {
    const rawData = await fetchRawAIPlan(uid, promptText, apiKey);
    const contentText = rawData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!contentText) {
      return localPlan;
    }

    let cleanText = contentText.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    }

    const parsed = JSON.parse(cleanText);
    if (!Array.isArray(parsed) || parsed.length !== localPlan.segments.length) {
      console.warn("AI enhancement output length mismatch, retaining local plan");
      return localPlan;
    }

    // Merge enhancements into local segments non-destructively
    const enhancedSegments = localPlan.segments.map((seg, idx) => {
      const aiSeg = parsed[idx] || {};
      const newCues = Array.isArray(aiSeg.coachingCues) && aiSeg.coachingCues.length > 0
        ? aiSeg.coachingCues
        : seg.coachingCues;

      return {
        ...seg,
        // Preserve authoritative drillId and duration unconditionally
        drillId: seg.drillId,
        minutes: seg.minutes,
        duration: seg.duration,
        coachingCues: newCues,
        tacticalNotes: aiSeg.tacticalNotes || seg.tacticalNotes || ''
      };
    });

    // Confirm quota consumption ONLY after successful validation & merge
    if (uid && uid !== 'guest') {
      try {
        await confirmAIGenerationQuota(uid);
      } catch (err) {
        console.warn("Quota confirmation failed:", err);
      }
    }

    return {
      ...localPlan,
      source: 'local+ai',
      segments: enhancedSegments,
      aiEnhanced: true
    };
  } catch (err) {
    console.warn("AI enhancement failed, retaining valid local plan:", err);
    return localPlan;
  }
}
