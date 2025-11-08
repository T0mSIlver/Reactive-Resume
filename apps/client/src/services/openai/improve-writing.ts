/* eslint-disable lingui/text-restrictions */

import type { ResumeData } from "@reactive-resume/schema";
import { t } from "@lingui/macro";

import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "@/client/constants/llm";
import { useOpenAiStore } from "@/client/stores/openai";

import { openai } from "./client";
import { formatResumeAsText, formatItemContext, convertTextToHtml, convertHtmlToMarkdown } from "./format-resume";

const SYSTEM_PROMPT = `You are an expert resume writing assistant with deep knowledge of professional resume standards, ATS (Applicant Tracking System) optimization, and industry best practices.

Your role is to improve resume content while maintaining:
- Professional tone and clarity
- Action-oriented language
- Consistency with the rest of the resume
- Appropriate length and impact
- The original meaning and intent

CRITICAL INSTRUCTIONS:
- Return ONLY the improved text, nothing else
- Do not include any prefix, suffix, explanation, or commentary
- Do not begin with a newline
- Maintain the same language as the input text
- Preserve any technical terms, proper nouns, and industry-specific language
- Keep the improved text concise and impactful

ABSOLUTE RULE - NUMBERS AND METRICS:
- NEVER invent, add, or fabricate numbers, percentages, dollar amounts, quantities, or metrics
- ONLY include numbers/metrics if they are explicitly present in the original text or context
- If numbers exist in the original text, preserve them exactly as written
- If no numbers exist in the original, do not add any - focus on improving language and clarity instead
- Quantifiable achievements are valuable ONLY when they come from the source material

OUTPUT FORMAT:
- Return the response in Markdown format
- For work experience and education descriptions, format the output as bullet points using Markdown list syntax ("- " or "* ")
- Use between 3 and 5 bullet points
- For recent experiences/education (based on dates in the resume context), use more bullet points (4-5)
- For older experiences/education, use fewer bullet points (3-4)
- Each bullet point should be a concise, action-oriented statement
- Use standard Markdown bullet point format (each bullet on a new line starting with "- ")
- Separate paragraphs with blank lines`;

export const improveWriting = async (
  text: string,
  resumeData?: ResumeData,
  itemContext?: Record<string, unknown>,
) => {
  const { model, maxTokens, includeResumeContext, useDefaultTemperature, temperatureImprove } = useOpenAiStore.getState();

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
  userMessages.push(`Please improve the writing of the following paragraph. Return only the improved text, no additional commentary:\n\n${inputText}`);

  const requestParams: {
    messages: Array<{ role: "system" | "user"; content: string }>;
    model: string;
    max_tokens: number;
    n: number;
    temperature?: number;
  } = {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessages.join("") },
    ],
    model: model ?? DEFAULT_MODEL,
    max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
    n: 1,
  };

  // Only include temperature if useDefaultTemperature is enabled
  if (useDefaultTemperature) {
    requestParams.temperature = temperatureImprove;
  }

  const result = await openai().chat.completions.create(requestParams);

  if (result.choices.length === 0) {
    throw new Error(t`OpenAI did not return any choices for your text.`);
  }

  const plainText = result.choices[0].message.content?.trim() ?? inputText;
  
  // Convert plain text with newlines and bullet points to HTML format
  return convertTextToHtml(plainText);
};
