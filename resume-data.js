// ===== EDIT HERE: the resume versions and the questions the terminal asks. =====
// How the pick works: each answer adds points to one or more versions; the version with the most points wins.
// A tie goes to the GENERAL version. To tune it, just change the numbers.

// Each version: the PDF, a name, and one line on what it leads with (keep it true to the PDF).
export const VARIANTS = {
  sales: {
    file: 'assets/Resumes/BraydenPatersonSales.pdf',
    name: 'Technical sales',
    why: 'Leads with client-facing work: explaining tech to non-technical staff, delivering training, and presenting results to management.',
  },
  it: {
    file: 'assets/Resumes/BraydenPatersonIT.pdf',
    name: 'IT and infrastructure',
    why: 'Leads with hands-on support: two service desk roles, hardware repair, OS imaging, inventory, and the tools I use day to day.',
  },
  cyber: {
    file: 'assets/Resumes/BraydenPatersonCyber.pdf',
    name: 'Cybersecurity',
    why: 'Leads with security: the phishing simulation I ran for 200+ employees, firewall and VPN setup, and relevant coursework.',
  },
};

// The tie-breaker when two versions score the same. ("Just give me a damn resume" lists every version above.)
export const GENERAL = 'it';

// Each question: the text, then its options. `points` says which versions that answer pushes towards.
export const QUESTIONS = [
  {
    text: 'What kind of role are you hiring for?',
    options: [
      { label: 'Technical sales / pre-sales', points: { sales: 3 } },
      { label: 'IT support / service desk', points: { it: 3 } },
      { label: 'Server / infrastructure', points: { it: 2, cyber: 1 } },
      { label: 'Cybersecurity', points: { cyber: 3 } },
    ],
  },
  {
    text: 'What matters most in this role?',
    options: [
      { label: 'Working with clients and customers', points: { sales: 2 } },
      { label: 'Hands-on troubleshooting', points: { it: 2 } },
      { label: 'Security awareness', points: { cyber: 2 } },
      { label: 'Building and running systems', points: { it: 1, cyber: 1 } },
    ],
  },
  {
    text: 'How long is the placement?',
    options: [
      { label: '4 months', points: {} },
      { label: '12 to 16 months', points: { sales: 1, it: 1 } },   // these two versions say I'm open to 12-16 months
      { label: 'Not sure yet', points: {} },
    ],
  },
];
