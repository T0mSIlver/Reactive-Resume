/* eslint-disable lingui/text-restrictions */

import type { ResumeData } from "@reactive-resume/schema";
import { t } from "@lingui/macro";

import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "@/client/constants/llm";
import { useOpenAiStore } from "@/client/stores/openai";

import { openai } from "./client";
import { formatResumeAsText, formatItemContext, convertTextToHtml, convertHtmlToMarkdown } from "./format-resume";

const getSystemPrompt = (mood: Mood): string => {
  const moodDescriptions: Record<Mood, string> = {
    casual: "more relaxed and conversational while remaining professional",
    professional: "more formal, polished, and business-appropriate",
    confident: "more assertive, achievement-focused, and self-assured",
    friendly: "more warm, approachable, and personable while maintaining professionalism",
  };

  return `You are an expert resume writing assistant specialized in adjusting tone and voice for professional documents.

Your role is to change the tone of resume content to be ${moodDescriptions[mood]} while:
- Maintaining the core meaning and key information
- Preserving technical terms, proper nouns, and industry-specific language
- Ensuring consistency with the rest of the resume
- Keeping the content appropriate for resume standards
- Maintaining professional credibility

CRITICAL INSTRUCTIONS:
- Return ONLY the revised text with the new tone, nothing else
- Do not include any prefix, suffix, explanation, or commentary
- Do not begin with a newline
- Maintain the same language as the input text
- Adjust word choice, sentence structure, and phrasing to match the desired tone

ABSOLUTE RULE - NUMBERS AND METRICS:
- NEVER invent, add, or fabricate numbers, percentages, dollar amounts, quantities, or metrics
- ONLY include numbers/metrics if they are explicitly present in the original text or context
- If numbers exist in the original text, preserve them exactly as written
- If no numbers exist in the original, do not add any - only change the tone

BULLET POINT FORMATTING:
- For work experience and education descriptions, format the output as bullet points
- Use between 3 and 5 bullet points
- For recent experiences/education (based on dates in the resume context), use more bullet points (4-5)
- For older experiences/education, use fewer bullet points (3-4)
- Each bullet point should be a concise, action-oriented statement
- Use standard bullet point format (each bullet on a new line starting with "- " or "• ")`;
};

type Mood = "casual" | "professional" | "confident" | "friendly";

export const changeTone = async (
  text: string,
  mood: Mood,
  resumeData?: ResumeData,
  itemContext?: Record<string, unknown>,
) => {
  const { model, maxTokens, includeResumeContext } = useOpenAiStore.getState();

  const userMessages: string[] = [];
  
  // Only include full resume context if the setting is enabled
  if (includeResumeContext && resumeData) {
    userMessages.push(`Here is the complete resume for context:\n\n${formatResumeAsText(resumeData)}\n\n---\n\n`);
  }
  
  // Include current item context if provided (for unsaved items)
  if (itemContext) {
    const contextText = formatItemContext(itemContext);
    if (contextText) {
      userMessages.push(`Here is the context for the current item being edited:\n\n${contextText}\n\n---\n\n`);
    }
  }
  
  // Convert HTML to Markdown before sending to LLM (better structure preservation)
  const inputText = convertHtmlToMarkdown(text);
  userMessages.push(`Please change the tone of the following paragraph to be ${mood}. Return only the revised text, no additional commentary:\n\n${inputText}`);

  const result = await openai().chat.completions.create({
    messages: [
      { role: "system", content: getSystemPrompt(mood) },
      { role: "user", content: userMessages.join("") },
    ],
    model: model ?? DEFAULT_MODEL,
    max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
    n: 1,
  });

  if (result.choices.length === 0) {
    throw new Error(t`OpenAI did not return any choices for your text.`);
  }

  const plainText = result.choices[0].message.content?.trim() ?? inputText;
  
  // Convert plain text with newlines and bullet points to HTML format
  return convertTextToHtml(plainText);
};
