/* eslint-disable lingui/text-restrictions */

import type { ResumeData } from "@reactive-resume/schema";
import { t } from "@lingui/macro";

import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "@/client/constants/llm";
import { useOpenAiStore } from "@/client/stores/openai";

import { openai } from "./client";
import { formatResumeAsText, formatItemContext, convertTextToHtml, convertHtmlToMarkdown } from "./format-resume";

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
- Preserve formatting, capitalization, and style

BULLET POINT FORMATTING:
- For work experience and education descriptions, format the output as bullet points
- Use between 3 and 5 bullet points
- For recent experiences/education (based on dates in the resume context), use more bullet points (4-5)
- For older experiences/education, use fewer bullet points (3-4)
- If the input is already in bullet point format, preserve that format while fixing errors
- If the input is paragraph text for experience/education descriptions, convert it to bullet points
- Each bullet point should be a concise, action-oriented statement with quantifiable achievements when possible
- Use standard bullet point format (each bullet on a new line starting with "- " or "• ")`;

export const fixGrammar = async (
  text: string,
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
  userMessages.push(`Please fix the spelling and grammar errors in the following paragraph. Return only the corrected text, no additional commentary:\n\n${inputText}`);

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

  const plainText = result.choices[0].message.content?.trim() ?? inputText;
  
  // Convert plain text with newlines and bullet points to HTML format
  return convertTextToHtml(plainText);
};
