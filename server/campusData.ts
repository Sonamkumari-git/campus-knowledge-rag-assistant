export type CampusSource = {
  id: string;
  documentName: string;
  category: string;
  page: number;
  section: string;
  uploaded: string;
  version: string;
  status: "Indexed" | "Processing";
  chunks: number;
  excerpt: string;
  content: string;
};

export type RetrievalResult = CampusSource & {
  score: number;
};

export const campusSources: CampusSource[] = [
  {
    id: "academic-rules-2026",
    documentName: "Academic Rules & Regulations.pdf",
    category: "Academic",
    page: 12,
    section: "Attendance requirements",
    uploaded: "25 Sep 2026",
    version: "2026.1",
    status: "Indexed",
    chunks: 142,
    excerpt: "Students must maintain at least 75% attendance in each registered course to be eligible to appear for the end-semester examination.",
    content: "Students must maintain at least 75% attendance in each registered course to be eligible to appear for the end-semester examination. Requests for condonation must follow the process published by the academic office.",
  },
  {
    id: "exam-calendar-2026",
    documentName: "Academic Calendar 2026.pdf",
    category: "Academic",
    page: 4,
    section: "End-semester examinations",
    uploaded: "18 Sep 2026",
    version: "2026.1",
    status: "Indexed",
    chunks: 86,
    excerpt: "End-semester examinations for the odd semester are scheduled from 02 December to 18 December 2026.",
    content: "The odd-semester end-semester examinations are scheduled from 02 December to 18 December 2026. The detailed timetable will be released by the examination office.",
  },
  {
    id: "hostel-handbook-2026",
    documentName: "Residential Life Handbook.pdf",
    category: "Hostel",
    page: 8,
    section: "Residence expectations",
    uploaded: "10 Sep 2026",
    version: "2026.2",
    status: "Indexed",
    chunks: 74,
    excerpt: "Residents must observe quiet hours from 10:30 PM to 6:30 AM and register overnight guests with the residence desk.",
    content: "Residents must observe quiet hours from 10:30 PM to 6:30 AM. Overnight guests must be registered with the residence desk, and residents are responsible for their guests' conduct.",
  },
  {
    id: "scholarship-guide-2026",
    documentName: "Scholarship & Financial Aid Guide.pdf",
    category: "Financial aid",
    page: 6,
    section: "Application process",
    uploaded: "02 Sep 2026",
    version: "2026.1",
    status: "Indexed",
    chunks: 63,
    excerpt: "Students apply for need-based aid through the student portal and must upload the income certificate before the published deadline.",
    content: "Students apply for need-based financial aid through the student portal. The application requires an income certificate and supporting documents listed in the portal checklist before the published deadline.",
  },
  {
    id: "admissions-checklist-2026",
    documentName: "Admissions Document Checklist.pdf",
    category: "Admissions",
    page: 2,
    section: "Required documents",
    uploaded: "28 Aug 2026",
    version: "2026.1",
    status: "Indexed",
    chunks: 51,
    excerpt: "Applicants should prepare their identity proof, qualifying examination marksheet, transfer certificate, and recent photographs.",
    content: "For admission verification, applicants should prepare identity proof, the qualifying examination marksheet, a transfer certificate where applicable, and recent passport-size photographs.",
  },
  {
    id: "library-services-2026",
    documentName: "Library Services Guide.pdf",
    category: "Library",
    page: 5,
    section: "Borrowing policy",
    uploaded: "14 Aug 2026",
    version: "2026.1",
    status: "Indexed",
    chunks: 39,
    excerpt: "Undergraduate students may borrow up to four books for fourteen days and can renew an item once if it has not been reserved.",
    content: "Undergraduate students may borrow up to four books for fourteen days. An item can be renewed once if it has not been reserved by another reader.",
  },
];

const stopWords = new Set(["what", "when", "where", "how", "can", "the", "for", "are", "is", "about", "and", "with", "from", "does", "this", "that", "must", "should", "new", "course"]);

function terms(query: string) {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9%\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

export function retrieveChunks(query: string, category?: string): RetrievalResult[] {
  const queryTerms = terms(query);
  return campusSources
    .filter(source => !category || source.category === category)
    .map(source => {
      const haystack = `${source.documentName} ${source.category} ${source.section} ${source.content}`.toLowerCase();
      const matched = queryTerms.filter(term => new RegExp(`\\b${term}\\b`).test(haystack));
      const phraseBonus = haystack.includes(query.toLowerCase().trim()) ? 0.18 : 0;
      const score = Math.min(0.99, 0.45 + matched.length * 0.1 + phraseBonus);
      return { ...source, score: matched.length ? score : 0.08 };
    })
    .filter(source => source.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

export function buildGroundedFallback(question: string, results: RetrievalResult[]) {
  if (!results.length) {
    return "I couldn't find reliable information about that in the available campus documents. Please check the latest official notice or contact the relevant campus office.";
  }

  const lead = results[0];
  const supporting = results.slice(1, 3);
  const supportText = supporting.length
    ? ` ${supporting.map(result => result.content).join(" ")}`
    : "";
  return `Based on the available campus documents, ${lead.content}${supportText} If your situation is different, please confirm the latest official notice with the relevant office.`;
}

export const categoryOptions = ["All documents", ...Array.from(new Set(campusSources.map(source => source.category)))];
