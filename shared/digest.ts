/**
 * digest.ts — the shape of one monthly digest issue.
 *
 * Lives in shared/ because three places need the identical type: the admin
 * editor that writes it (client/src/pages/admin/AdminDigest.tsx), the routes
 * that store it (server/adminRoutes.ts), and the template that renders it
 * (server/emailService.ts).
 *
 * WHY AN AUTHORED DOCUMENT RATHER THAN A GENERATED ONE
 * ----------------------------------------------------
 * The weekly digest this replaces was fully generated: deadlines pulled from
 * shared/keyDates.ts plus a recap of the user's own figures. It went out
 * every Monday on a cron with nobody reading it first, and the 2026-09-07
 * send is what ended that arrangement — a PF corpus of ₹1,59,33,686 sat in a
 * bare two-column list directly beneath a tax bill of ₹3,51,000, with no
 * label on either, so the two read as comparable amounts.
 *
 * The dates are still computed (never hardcode a tax date — see the note at
 * the top of keyDates.ts), but the substance of the email is now written by
 * a person each month and sent by hand. `sections` is that writing.
 */

export interface DigestSection {
  heading: string;
  /**
   * Plain text. Blank lines separate paragraphs; single newlines become line
   * breaks. Deliberately not HTML or Markdown — this is escaped on render, so
   * a stray `<` in a draft can never produce broken markup or an injection
   * path in mail going to every registered user.
   */
  body: string;
}

export interface DigestIssueStats {
  sent: number;
  skipped: number;
  failed: number;
}

export interface DigestIssue {
  /** "2026-09" — one issue per calendar month, so the id is the month. */
  id: string;
  /** The email subject line. Written per issue; no default template. */
  subject: string;
  /** One-line preheader — the snippet shown next to the subject in an inbox. */
  preheader?: string;
  /** Optional lead-in paragraph above the first section. */
  intro?: string;
  /** The knowledge content. This is the reason the email exists. */
  sections: DigestSection[];
  /** Append the computed "dates to watch" table below the writing. */
  includeDates: boolean;
  /** Append this reader's own saved results, labelled. */
  includeUsage: boolean;
  status: "draft" | "sent";
  createdAt?: string;
  updatedAt?: string;
  sentAt?: string;
  /** Written once the send completes, and shown in the admin history. */
  stats?: DigestIssueStats;
}

/** "2026-09" for the month `now` falls in. */
export function currentIssueId(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** "September 2026" — for headings and the admin list. */
export function issueLabel(id: string): string {
  const [y, m] = id.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return id;
  const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  return `${MONTHS[m - 1]} ${y}`;
}

/** A new blank issue for the given month. */
export function emptyIssue(id: string): DigestIssue {
  return {
    id,
    subject: `AiTaxBot — ${issueLabel(id)}`,
    preheader: "",
    intro: "",
    sections: [{ heading: "", body: "" }],
    includeDates: true,
    includeUsage: true,
    status: "draft",
  };
}

/**
 * What must be true before an issue may go to every registered user.
 * Returned as a list so the admin UI can show all the problems at once
 * rather than one per attempt, and so the send route can refuse using the
 * same rules the button is disabled by — the check has to exist server-side
 * regardless, since the button is only a suggestion.
 */
export function validateIssue(issue: DigestIssue): string[] {
  const errors: string[] = [];
  if (!issue.subject?.trim()) errors.push("Subject is required.");
  if (issue.subject && issue.subject.length > 120) errors.push("Subject is over 120 characters.");
  const written = (issue.sections || []).filter((s) => s.heading?.trim() && s.body?.trim());
  if (written.length === 0) {
    errors.push("Add at least one section with both a heading and body text.");
  }
  (issue.sections || []).forEach((s, i) => {
    if (s.heading?.trim() && !s.body?.trim()) errors.push(`Section ${i + 1} has a heading but no body.`);
    if (!s.heading?.trim() && s.body?.trim()) errors.push(`Section ${i + 1} has body text but no heading.`);
  });
  return errors;
}
