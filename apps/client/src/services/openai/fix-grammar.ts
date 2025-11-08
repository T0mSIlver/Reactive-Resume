/* eslint-disable lingui/text-restrictions */

import type { ResumeData } from "@reactive-resume/schema";
import { t } from "@lingui/macro";

import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "@/client/constants/llm";
import { useOpenAiStore } from "@/client/stores/openai";

import { openai } from "./client";
import { formatResumeAsText } from "./format-resume";

const SYSTEM_PROMPT = `You are an expert grammar and spelling checker specialized in professional resume writing.

Your role is to correct spelling, grammar, punctuation, and syntax errors while:
- Preserving the exact meaning and intent of the text
- Maintaining professional tone and style
- Keeping technical terms, proper nouns, and industry jargon unchanged
- Ensuring consistency with the rest of the resume
- Following standard English grammar rules (or the language of the input text)

CRITICAL INSTRUCTIONS:
- Return ONLY the corrected text, nothing else
- Do not include any prefix, suffix, explanation, or commentary
- Do not begin with a newline
- Only fix errors - do not rewrite or improve the content
- Maintain the same language as the input text
- Preserve formatting, capitalization, and style`;

export const fixGrammar = async (text: string, resumeData?: ResumeData) => {
  const { model, maxTokens } = useOpenAiStore.getState();

  const userMessages: string[] = [];
  
  if (resumeData) {
    userMessages.push(`Here is the complete resume for context:\n\n${formatResumeAsText(resumeData)}\n\n---\n\n`);
  }
  
  userMessages.push(`Please fix the spelling and grammar errors in the following paragraph. Return only the corrected text, no additional commentary:\n\n${text}`);

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
