/**
 * Non-Destructive AI Plan Enhancer for CoachCore Training Lab
 * Refines coaching cues, wording, and tactical tips via Gemini without altering authoritative drill IDs, durations, or safety rules.
 */

import { fetchRawAIPlan, confirmAIGenerationQuota } from '../firebaseHelpers.js';
import { retrieveKnowledge } from '../knowledge/knowledgeService.js';

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
  const { uid, ageGroup = 'U14', coachLevel = 3, focusAreas = [], customPlaybookText = '' } = parameters;

  // Retrieve 5-15 highly relevant coaching passages for AI context
  let knowledgePassages = [];
  try {
    knowledgePassages = await retrieveKnowledge({
      ageGroup,
      focusAreas,
      limit: 10
    });
  } catch (kErr) {
    console.warn('[AIEnhancer] Knowledge retrieval skipped:', kErr);
  }

  const referenceText = knowledgePassages.length > 0
    ? knowledgePassages.map(p => `[Source: ${p.source}, ${p.sourceLocator}]\n"${p.excerpt || p.text.substring(0, 200)}..."`).join('\n\n')
    : 'Standard AFL Development Framework';

  // Build compact structured prompt sending ONLY selected drills and context
  const drillSummaries = localPlan.segments.map((seg, idx) => ({
    slot: idx + 1,
    drillId: seg.drillId,
    title: seg.title,
    minutes: seg.minutes,
    objective: seg.objective
  }));

  const clubPlaybookSection = customPlaybookText && customPlaybookText.trim()
    ? `\nCLUB PLAYBOOK (align coaching cues and tactical notes to this club's own terminology/structures where relevant, without changing drill identities):\n${customPlaybookText.trim().substring(0, 4000)}\n`
    : '';

  const promptText = `Refine coaching cues and tactical explanations for this pre-selected AFL training plan using official AFL curriculum guidelines.

Target Age: ${ageGroup}
Coach Level: ${coachLevel}
Focus Areas: ${(focusAreas || []).join(', ')}
${clubPlaybookSection}
AUTHORITATIVE AFL CURRICULUM GUIDELINES (5-15 Compact References):
${referenceText}

SELECTED DRILLS (IMMUTABLE):
${JSON.stringify(drillSummaries, null, 2)}

Instructions:
Return a JSON array containing refined coaching cues and tactical notes for each of the 6 segments in exact order.
Do NOT include source document names, page numbers, or reference labels in the output text.
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
        // Preserve authoritative drillId, duration, and group allocation fields unconditionally
        drillId: seg.drillId,
        minutes: seg.minutes,
        duration: seg.duration,
        blockMinutes: seg.blockMinutes,
        isConcurrent: seg.isConcurrent,
        attendingPlayerCount: seg.attendingPlayerCount,
        group1Size: seg.group1Size,
        group2Size: seg.group2Size,
        maximumStationGroupSize: seg.maximumStationGroupSize,
        assignedGroup: seg.assignedGroup,
        assignedPlayerCount: seg.assignedPlayerCount,
        partnerSlot: seg.partnerSlot,
        swapRequired: seg.swapRequired,
        swapAfterMinutes: seg.swapAfterMinutes,
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
