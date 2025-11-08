import type { ResumeData } from "@reactive-resume/schema";

/**
 * Formats resume data as plain text for LLM context.
 * This provides the full resume context to help the AI understand the document structure
 * and make better writing improvements.
 */
export const formatResumeAsText = (resumeData: ResumeData): string => {
  const parts: string[] = [];

  // Basics section
  if (resumeData.basics.name) {
    parts.push(`Name: ${resumeData.basics.name}`);
  }
  if (resumeData.basics.headline) {
    parts.push(`Headline: ${resumeData.basics.headline}`);
  }
  if (resumeData.basics.email) {
    parts.push(`Email: ${resumeData.basics.email}`);
  }
  if (resumeData.basics.phone) {
    parts.push(`Phone: ${resumeData.basics.phone}`);
  }
  if (resumeData.basics.location) {
    parts.push(`Location: ${resumeData.basics.location}`);
  }
  if (resumeData.basics.url.href) {
    parts.push(`Website: ${resumeData.basics.url.href}`);
  }

  // Summary
  if (resumeData.sections.summary?.visible && resumeData.sections.summary.content) {
    parts.push(`\n## Summary\n${resumeData.sections.summary.content}`);
  }

  // Experience
  if (resumeData.sections.experience?.visible && resumeData.sections.experience.items.length > 0) {
    parts.push(`\n## Experience`);
    for (const item of resumeData.sections.experience.items) {
      if (!item.visible) continue;
      parts.push(`\n### ${item.position} at ${item.company}`);
      if (item.location) parts.push(`Location: ${item.location}`);
      if (item.date) parts.push(`Date: ${item.date}`);
      if (item.summary) parts.push(`Description: ${item.summary}`);
      if (item.companyDescription) parts.push(`Company: ${item.companyDescription}`);
    }
  }

  // Education
  if (resumeData.sections.education?.visible && resumeData.sections.education.items.length > 0) {
    parts.push(`\n## Education`);
    for (const item of resumeData.sections.education.items) {
      if (!item.visible) continue;
      parts.push(`\n### ${item.institution}`);
      if (item.studyType) parts.push(`Study Type: ${item.studyType}`);
      if (item.area) parts.push(`Area: ${item.area}`);
      if (item.date) parts.push(`Date: ${item.date}`);
      if (item.score) parts.push(`Score: ${item.score}`);
      if (item.summary) parts.push(`Description: ${item.summary}`);
    }
  }

  // Projects
  if (resumeData.sections.projects?.visible && resumeData.sections.projects.items.length > 0) {
    parts.push(`\n## Projects`);
    for (const item of resumeData.sections.projects.items) {
      if (!item.visible) continue;
      parts.push(`\n### ${item.name}`);
      if (item.description) parts.push(`Description: ${item.description}`);
      if (item.summary) parts.push(`Summary: ${item.summary}`);
      if (item.date) parts.push(`Date: ${item.date}`);
      if (item.url.href) parts.push(`URL: ${item.url.href}`);
      if (item.keywords && item.keywords.length > 0) {
        parts.push(`Keywords: ${item.keywords.filter(Boolean).join(", ")}`);
      }
    }
  }

  // Skills
  if (resumeData.sections.skills?.visible && resumeData.sections.skills.items.length > 0) {
    parts.push(`\n## Skills`);
    for (const item of resumeData.sections.skills.items) {
      if (!item.visible) continue;
      const keywords = item.keywords?.filter(Boolean).join(", ") || "";
      const description = item.description ? ` - ${item.description}` : "";
      parts.push(`- ${item.name}${keywords ? `: ${keywords}` : ""}${description}`);
    }
  }

  // Certifications
  if (
    resumeData.sections.certifications?.visible &&
    resumeData.sections.certifications.items.length > 0
  ) {
    parts.push(`\n## Certifications`);
    for (const item of resumeData.sections.certifications.items) {
      if (!item.visible) continue;
      parts.push(`\n### ${item.name}`);
      if (item.issuer) parts.push(`Issuer: ${item.issuer}`);
      if (item.date) parts.push(`Date: ${item.date}`);
      if (item.summary) parts.push(`Description: ${item.summary}`);
    }
  }

  // Awards
  if (resumeData.sections.awards?.visible && resumeData.sections.awards.items.length > 0) {
    parts.push(`\n## Awards`);
    for (const item of resumeData.sections.awards.items) {
      if (!item.visible) continue;
      parts.push(`\n### ${item.title}`);
      if (item.awarder) parts.push(`Awarder: ${item.awarder}`);
      if (item.date) parts.push(`Date: ${item.date}`);
      if (item.summary) parts.push(`Description: ${item.summary}`);
    }
  }

  // Publications
  if (
    resumeData.sections.publications?.visible &&
    resumeData.sections.publications.items.length > 0
  ) {
    parts.push(`\n## Publications`);
    for (const item of resumeData.sections.publications.items) {
      if (!item.visible) continue;
      parts.push(`\n### ${item.name}`);
      if (item.publisher) parts.push(`Publisher: ${item.publisher}`);
      if (item.date) parts.push(`Date: ${item.date}`);
      if (item.summary) parts.push(`Description: ${item.summary}`);
    }
  }

  // Volunteer
  if (resumeData.sections.volunteer?.visible && resumeData.sections.volunteer.items.length > 0) {
    parts.push(`\n## Volunteer Experience`);
    for (const item of resumeData.sections.volunteer.items) {
      if (!item.visible) continue;
      parts.push(`\n### ${item.organization}`);
      if (item.position) parts.push(`Position: ${item.position}`);
      if (item.date) parts.push(`Date: ${item.date}`);
      if (item.summary) parts.push(`Description: ${item.summary}`);
    }
  }

  // Languages
  if (resumeData.sections.languages?.visible && resumeData.sections.languages.items.length > 0) {
    parts.push(`\n## Languages`);
    for (const item of resumeData.sections.languages.items) {
      if (!item.visible) continue;
      parts.push(`- ${item.name}${item.fluency ? ` (${item.fluency})` : ""}`);
    }
  }

  // Interests
  if (resumeData.sections.interests?.visible && resumeData.sections.interests.items.length > 0) {
    parts.push(`\n## Interests`);
    for (const item of resumeData.sections.interests.items) {
      if (!item.visible) continue;
      const keywords = item.keywords?.filter(Boolean).join(", ") || "";
      parts.push(`- ${item.name}${keywords ? `: ${keywords}` : ""}`);
    }
  }

  // References
  if (resumeData.sections.references?.visible && resumeData.sections.references.items.length > 0) {
    parts.push(`\n## References`);
    for (const item of resumeData.sections.references.items) {
      if (!item.visible) continue;
      parts.push(`\n### ${item.name}`);
      if (item.description) parts.push(`Description: ${item.description}`);
      if (item.summary) parts.push(`Reference: ${item.summary}`);
      if (item.url.href) parts.push(`URL: ${item.url.href}`);
    }
  }

  // Custom sections
  if (resumeData.sections.custom) {
    for (const [key, section] of Object.entries(resumeData.sections.custom)) {
      if (!section.visible || section.items.length === 0) continue;
      parts.push(`\n## ${section.name}`);
      for (const item of section.items) {
        if (!item.visible) continue;
        if (item.name) parts.push(`\n### ${item.name}`);
        if (item.description) parts.push(`Description: ${item.description}`);
        if (item.summary) parts.push(`Summary: ${item.summary}`);
        if (item.date) parts.push(`Date: ${item.date}`);
        if (item.location) parts.push(`Location: ${item.location}`);
        if (item.url?.href) parts.push(`URL: ${item.url.href}`);
        if (item.keywords && item.keywords.length > 0) {
          parts.push(`Keywords: ${item.keywords.filter(Boolean).join(", ")}`);
        }
      }
    }
  }

  return parts.join("\n");
};

