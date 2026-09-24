export interface DemoDocument {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  status: 'ready';
  summary: string;
  extracted_text: string;
  created_at: string;
}

export interface DemoMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Array<{ document_id: string; document_name: string; snippet: string }>;
  created_at: string;
}

export const demoDocuments: DemoDocument[] = [
  {
    id: 'demo-1',
    name: 'Q3 2024 Financial Report.pdf',
    file_type: 'pdf',
    file_size: 248320,
    status: 'ready',
    summary:
      'Third-quarter revenue grew 18% year-over-year to $42.6M, driven by enterprise expansion and a 24% increase in net new logos. Operating margin improved to 14%.',
    extracted_text:
      'Q3 2024 Financial Report\n\nRevenue: $42.6M, up 18% YoY. Gross margin 78%. Operating margin 14%, up from 9% last year. Net new logos grew 24%. Enterprise customers now represent 62% of ARR. Cash runway extended to 34 months following Series B extension. Headcount grew to 214. Top growth segments: financial services (31%), healthcare (22%).',
    created_at: '2024-10-12T09:30:00Z',
  },
  {
    id: 'demo-2',
    name: 'Product Launch Strategy.docx',
    file_type: 'docx',
    file_size: 87200,
    status: 'ready',
    summary:
      'Go-to-market plan for the November product launch covering positioning, pricing tiers, channel mix, and a 12-week campaign timeline.',
    extracted_text:
      'Product Launch Strategy\n\nLaunch date: November 14. Positioning: "AI document intelligence for every team." Pricing tiers: Starter $29/user/mo, Team $59/user/mo, Enterprise custom. Channels: product-led signup, outbound to 200 target accounts, partner co-marketing with 3 integrations. Campaign timeline: 12 weeks across teaser, launch week, and follow-on. Success metrics: 1,000 signups in launch month, 15% trial-to-paid conversion.',
    created_at: '2024-09-28T14:15:00Z',
  },
  {
    id: 'demo-3',
    name: 'Employee Handbook 2024.pdf',
    file_type: 'pdf',
    file_size: 512000,
    status: 'ready',
    summary:
      'Company policies covering remote work, benefits, time off, code of conduct, and performance review cycles for all employees.',
    extracted_text:
      'Employee Handbook 2024\n\nRemote work: hybrid policy, minimum 2 days in office. PTO: 20 days annually plus 10 holidays. Benefits: full health, dental, vision; 401k with 4% match. Performance reviews: biannual, in June and December. Code of conduct: respect, integrity, transparency. Expense policy: pre-approval for purchases over $500.',
    created_at: '2024-08-05T10:00:00Z',
  },
  {
    id: 'demo-4',
    name: 'Customer Research Notes.txt',
    file_type: 'txt',
    file_size: 18400,
    status: 'ready',
    summary:
      'Qualitative interview notes from 12 customers revealing top pain points around document search speed, citation accuracy, and mobile access.',
    extracted_text:
      'Customer Research Notes\n\nInterviewed 12 customers across SMB and enterprise. Top pain points: 1) Search takes too long (avg 4.2 min to find info). 2) No citations in AI answers - trust issue. 3) Mobile access is clunky. 4) Want to query across multiple documents at once. Key quote: "I need to trust the answer, not just get an answer." 9/12 would pay extra for grounded citations.',
    created_at: '2024-10-01T16:45:00Z',
  },
];

export const demoMessages: DemoMessage[] = [
  {
    id: 'demo-m1',
    role: 'user',
    content: 'What was the revenue growth in Q3?',
    citations: [],
    created_at: '2024-10-15T10:00:00Z',
  },
  {
    id: 'demo-m2',
    role: 'assistant',
    content:
      'Q3 2024 revenue grew 18% year-over-year, reaching $42.6M. The growth was driven by enterprise expansion and a 24% increase in net new logos, with operating margin improving from 9% to 14%.',
    citations: [
      { document_id: 'demo-1', document_name: 'Q3 2024 Financial Report.pdf', snippet: 'Revenue: $42.6M, up 18% YoY. Operating margin 14%, up from 9% last year.' },
    ],
    created_at: '2024-10-15T10:00:05Z',
  },
];
