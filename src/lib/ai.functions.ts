import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { MeetingSummary } from "./types";

const FACTS_RULE =
  "Never invent recipients, names, promises, decisions, dates, qualifications or facts that are not in the input. If information is missing, use a clearly marked placeholder like [Name] instead of guessing.";

const emailInput = z.object({
  recipient: z.string().max(200).optional().default(""),
  subject: z.string().max(300),
  category: z.string().max(80),
  points: z.string().max(8000),
  tone: z.string().max(40),
  length: z.string().max(20),
  context: z.string().max(12000).optional().default(""),
});

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => emailInput.parse(d))
  .handler(async ({ data }) => {
    const { runAI, extractJson } = await import("./ai.server");
    const text = await runAI(
      `You are an expert professional email writer. Write one complete email with greeting, body and closing, with correct grammar, spelling and punctuation, matching the requested tone and length (short ≈ 80 words, medium ≈ 150, long ≈ 250). Preserve the user's intended meaning and facts. ${FACTS_RULE} Return ONLY JSON: {"subject": string, "body": string}. The body is plain text with line breaks.`,
      `Recipient: ${data.recipient || "(not specified)"}
Category: ${data.category}
Purpose / subject: ${data.subject}
Tone: ${data.tone}
Length: ${data.length}
Key points:
${data.points}
${data.context ? `\nReference information (use only these facts):\n${data.context}` : ""}`,
    );
    return extractJson<{ subject: string; body: string }>(text);
  });

export const reviseEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        mode: z.enum(["rewrite", "shorten", "expand", "alternative"]),
        subject: z.string().max(300),
        body: z.string().max(12000),
        tone: z.string().max(40),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { runAI, extractJson } = await import("./ai.server");
    const instr = {
      rewrite: "Rewrite the email to read more clearly and polished, keeping the same length.",
      shorten: "Shorten the email substantially while keeping every key fact and request.",
      expand: "Expand the email with a little more context and courtesy, without adding new facts.",
      alternative: "Write a noticeably different alternative version with fresh wording and structure.",
    }[data.mode];
    const text = await runAI(
      `You edit professional emails. ${instr} Keep the ${data.tone} tone. ${FACTS_RULE} Return ONLY JSON: {"subject": string, "body": string}.`,
      `Subject: ${data.subject}\n\n${data.body}`,
    );
    return extractJson<{ subject: string; body: string }>(text);
  });

export const summarizeMeeting = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().max(300),
        date: z.string().max(40),
        attendees: z.string().max(2000).optional().default(""),
        notes: z.string().min(10).max(60000),
        length: z.string().max(20),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { runAI, extractJson } = await import("./ai.server");
    const text = await runAI(
      `You turn meeting notes into an organized, actionable report. Summary length: ${data.length} (brief ≈ 2-3 sentences, standard ≈ 1 paragraph, detailed ≈ 2-3 paragraphs).
Rules: Only include decisions that were clearly confirmed; put suggestions or ideas not agreed upon in "proposals". Never invent task owners, deadlines or decisions — use null when not specified. Convert deadlines to YYYY-MM-DD when the date can be determined from the meeting date (${data.date}); otherwise keep the original wording.
Return ONLY JSON matching:
{"overview": string, "topics": string[], "decisions": string[], "proposals": string[],
 "actionItems": [{"description": string, "owner": string|null, "deadline": string|null, "status": "Open", "context": string|null}],
 "deadlines": [{"item": string, "date": string}], "openQuestions": string[]}`,
      `Meeting: ${data.title}\nDate: ${data.date}\nAttendees: ${data.attendees || "(not listed)"}\n\nNotes:\n${data.notes}`,
    );
    const s = extractJson<MeetingSummary>(text);
    return {
      overview: s.overview ?? "",
      topics: s.topics ?? [],
      decisions: s.decisions ?? [],
      proposals: s.proposals ?? [],
      deadlines: s.deadlines ?? [],
      openQuestions: s.openQuestions ?? [],
      actionItems: (s.actionItems ?? []).map((a, i) => ({ ...a, id: `ai${i}-${Date.now()}`, status: a.status || "Open" })),
    } satisfies MeetingSummary;
  });
