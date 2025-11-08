/* eslint-disable lingui/text-restrictions */

import type { ResumeData } from "@reactive-resume/schema";
import { t } from "@lingui/macro";

import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "@/client/constants/llm";
import { useOpenAiStore } from "@/client/stores/openai";

import { openai } from "./client";
import { formatResumeAsText } from "./format-resume";

const SYSTEM_PROMPT = `You are an expert resume writing assistant with deep knowledge of professional resume standards, ATS (Applicant Tracking System) optimization, and industry best practices.

Your role is to improve resume content while maintaining:
- Professional tone and clarity
- Action-oriented language with quantifiable achievements
- Consistency with the rest of the resume
- Appropriate length and impact
- The original meaning and intent

CRITICAL INSTRUCTIONS:
- Return ONLY the improved text paragraph, nothing else
- Do not include any prefix, suffix, explanation, or commentary
- Do not begin with a newline
- Maintain the same language as the input text
- Preserve any technical terms, proper nouns, and industry-specific language
- Keep the improved text concise and impactful`;

export const improveWriting = async (text: string, resumeData?: ResumeData) => {
  const { model, maxTokens } = useOpenAiStore.getState();

  const userMessages: string[] = [];
  
  if (resumeData) {
    userMessages.push(`Here is the complete resume for context:\n\n${formatResumeAsText(resumeData)}\n\n---\n\n`);
  }
  
  userMessages.push(`Please improve the writing of the following paragraph. Return only the improved text, no additional commentary:\n\n${text}`);

  const result = await openai().chat.completions.create({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessages.join("") },
    ],
    model: model ?? DEFAULT_MODEL,
    max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
    n: 1,
  });

  if (result.choices.length === 0) {
    throw new Error(t`OpenAI did not return any choices for your text.`);
  }

  return result.choices[0].message.content?.trim() ?? text;
};
