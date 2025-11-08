/* eslint-disable lingui/text-restrictions */

import type { ResumeData } from "@reactive-resume/schema";
import { t } from "@lingui/macro";

import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "@/client/constants/llm";
import { useOpenAiStore } from "@/client/stores/openai";

import { openai } from "./client";
import { formatResumeAsText } from "./format-resume";

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
- Adjust word choice, sentence structure, and phrasing to match the desired tone`;
};

type Mood = "casual" | "professional" | "confident" | "friendly";

export const changeTone = async (text: string, mood: Mood, resumeData?: ResumeData) => {
  const { model, maxTokens } = useOpenAiStore.getState();

  const userMessages: string[] = [];
  
  if (resumeData) {
    userMessages.push(`Here is the complete resume for context:\n\n${formatResumeAsText(resumeData)}\n\n---\n\n`);
  }
  
  userMessages.push(`Please change the tone of the following paragraph to be ${mood}. Return only the revised text, no additional commentary:\n\n${text}`);

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

  return result.choices[0].message.content?.trim() ?? text;
};
