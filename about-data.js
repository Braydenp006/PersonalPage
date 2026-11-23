// ===== EDIT HERE: the places I've worked and studied, for the map on the About page. =====
// `kind`: 'work' (black, numbered pin) or 'school' (orange pin). Newest first; the order sets the work pins' numbers. `at` is [latitude, longitude]: right-click a spot on
// openstreetmap.org and pick "Show address" to read one off. `where` is the text shown, so it can be vaguer than the pin.
// What I did comes from my resumes (keep it true to them).
// `photo` (optional): a picture of the building, shown at the top of its popup. Put the file in assets/Pictures/work/
// and give it `alt` text. Use photos I took myself, or ones I have permission / a licence to use (credit them in `credit`).
export const PLACES = [
  {
    kind: 'work',
    role: 'IT Service Desk',
    place: 'York Region',
    where: '17150 / 17250 Yonge St, Newmarket',
    dates: 'May 2026 – August 2026',
    at: [44.0479, -79.4802],   // York Region Administrative Centre
    photo: 'assets/Pictures/work/york-region.webp', alt: 'The York Region Administrative Centre, a glass office building on Yonge St',
    credit: 'Wojciech Dittwald, CC BY-SA 3.0, via Wikimedia Commons',
    did: [
      'Supported MS365, eDocs, InforXM, Jira and other applications for a regional government office',
      'Helped migrate service documentation from eDocs to a new SharePoint site',
      'Managed an inventory of 200+ monitors, decommissioning older units and replacing them to meet equipment standards',
      'Helped coordinate a floor-to-floor office relocation to keep downtime low for staff',
    ],
  },
  {
    kind: 'work',
    role: 'IT Service Desk',
    place: 'New Leaf',
    where: '19601 Leslie St, Queensville',
    dates: 'May 2025 – September 2025',
    at: [44.1169, -79.4447],
    photo: 'assets/Pictures/work/temp-new-leaf.jpg', alt: 'The New Leaf building on Leslie St',   // TEMP: not mine to use, replace before going live
    did: [
      'Built a phishing simulation with SendGrid and a tracking link, sent to 200+ employees, with a dashboard showing results per site',
      'Made phishing training videos for all employees and presented the results to upper management',
      'Led a migration from Linux to Windows, imaging machines with Clonezilla',
      'Designed and delivered four months of Windows training, in person and on video',
      'Supported 10+ sites: repaired laptops, diagnosed printer and network issues, installed security cameras',
    ],
  },
  {
    kind: 'work',
    role: 'Landscaper',
    place: 'Unionville Property Care',
    where: 'Stouffville area',
    dates: 'April 2024 – August 2024',
    at: [43.9718, -79.2454],   // general area only: the business is run from the owner's home
    photo: 'assets/Pictures/work/temp-unionville.jpg', alt: 'A landscaped garden',   // TEMP: not mine to use, replace before going live
    did: [
      'Became proficient with landscaping equipment: mowers, trimmers, blowers and more',
      'Worked with the team to finish landscaping projects efficiently',
    ],
  },
  {
    kind: 'work',
    role: 'Fry Cook / Cashier',
    place: "Mary Brown's",
    where: 'Yonge St & Green Lane, Newmarket',
    dates: 'June 2022 – January 2024',
    at: [44.0753, -79.4804],
    photo: 'assets/Pictures/work/mary-browns.webp', alt: "A Mary Brown's Chicken restaurant",   // stand-in: the Richmond Hill location, not the Newmarket one
    credit: 'Raysonho, CC0, via Wikimedia Commons',
    did: [
      'Applied WHMIS training to keep the workplace compliant',
      'Trained multiple new employees',
    ],
  },
  {
    kind: 'work',
    role: 'Fry Cook',
    place: 'Little Brothers Kitchen',
    where: '1065 Davis Dr, Newmarket (now closed)',
    dates: 'July 2021 – April 2022',
    at: [44.0668, -79.4326],
    photo: 'assets/Pictures/work/temp-little-brothers.jpg', alt: 'The plaza at 1065 Davis Dr',   // TEMP: not mine to use, replace before going live
    did: [
      'Cooked a range of dishes and kept the kitchen and front area clean',
      'Provided high quality service and food to customers',
    ],
  },
  {
    kind: 'school',
    role: 'Bachelor of Computing, Cybersecurity Specialization',
    place: "Queen's University",
    where: 'Kingston',
    dates: 'September 2024 – present',
    at: [44.2263, -76.4958],
    photo: 'assets/Pictures/work/queens.webp', alt: "Grant Hall, the stone clock tower building at Queen's University",
    credit: 'Takipoint123, CC BY-SA 4.0, via Wikimedia Commons',
    did: [
      'Minor in Math',
      'Relevant coursework: Operating Systems, System Level Programming, Software Quality Assurance',
    ],
  },
  {
    kind: 'school',
    role: 'High school',
    place: 'Dr. John M. Denison Secondary School',
    where: '135 Bristol Rd, Newmarket',
    dates: '[TODO: years]',
    at: [44.0697, -79.4773],
    photo: 'assets/Pictures/work/temp-denison.jpg', alt: 'Dr. John M. Denison Secondary School',   // TEMP: not mine to use, replace before going live
    did: [
      '[TODO: anything to mention, or leave this out]',
    ],
  },
];

// ===== EDIT HERE: the "Me" tab. Facts from my resumes. =====
export const ME = {
  name: 'Brayden Paterson',
  role: 'Computing student',
  school: "Queen's University",
  status: 'Open to a co-op from May 2027',
  facts: [['Program', 'Computing'], ['Focus', 'Cybersecurity'], ['Minor', 'Mathematics'], ['School', "Queen's"], ['Based in', 'Holland Landing'], ['Co-op', '4 months, May 2027']],
  // the symbols lit on the sign under my name: [label, icon in assets/icons/]
  marks: [['Servers & infrastructure', 'mark-server'], ['Technical sales', 'mark-talk'], ['Cybersecurity', 'mark-shield'], ['Mathematics', 'mark-sigma']],
  contact: [   // the links at the foot of the sign (an odd last one spans the row)
    ['Resume', 'resume.html'],
    ['Contact me', 'mailto:braydenp006@gmail.com'],
    ['GitHub', 'https://github.com/Braydenp006'],
    ['LinkedIn', 'https://www.linkedin.com/in/braydenpaterson/'],
  ],
  numbers: [   // shortcut: not shown since the one-page layout (no spot in the sketch); kept for the resume/projects pages. The grid of figures: [label, value]. All from my resumes and my server.
    ['Employees in my phishing test', '200+'],
    ['Sites supported', '10+'],
    ['Monitors managed', '200+'],
    ['PCs built and sold', '5'],
    ['Months of Windows training', '4'],
    ['Services on my server', '11'],
    ['Backup history kept', '~3 wk'],
    ['Jobs held', '5'],
    ['Certifications', '–'],   // [TODO: my certifications]
  ],
};

// ===== EDIT HERE: the Stats box. `value` stays null (shown as a dash) until the server script that fetches it exists. =====
export const LIVE = [
  { label: 'Clash Royale trophies', value: null },
  { label: 'Workouts this week', value: null },          // Hevy
  { label: 'Climbing sessions this week', value: null }, // [TODO: where this number comes from]
  { label: 'Chess rating', value: null },                // [TODO: chess.com or Lichess]
  { label: 'Hours of music listened', value: null },     // [TODO: from Spotify or Last.fm; this year or all time]
];

// ===== EDIT HERE: the Equipment slots: what I work with. `icon` is a file in assets/icons/ (no icon: initials). `group` sets its row. =====
export const EQUIPMENT = [
  { group: 'Systems', name: 'Linux', icon: 'linux', text: 'My daily driver: command line, shell scripting, package management, system administration.' },
  { group: 'Systems', name: 'FreeBSD', icon: 'freebsd', text: 'Runs my home server: one jail per service, every service set up by hand.' },
  { group: 'Systems', name: 'Windows', icon: 'window', text: 'Supported it across two service desks, and led a Linux-to-Windows migration with Clonezilla.' },
  { group: 'Systems', name: 'HP Z420', icon: 'hp', text: 'The home server this site runs on.' },
  { group: 'Languages', name: 'Python', icon: 'python', text: '[TODO: what I have built with it]' },
  { group: 'Languages', name: 'Java', icon: 'openjdk', text: '[TODO: what I have built with it]' },
  { group: 'Languages', name: 'Bash', icon: 'gnubash', text: 'Shell scripting on Linux and FreeBSD.' },
  { group: 'Languages', name: 'C', icon: 'c', text: '[TODO: what I have built with it]' },
  { group: 'Tools', name: 'Git', icon: 'git', text: 'Self-hosted Git server, mirroring my GitHub.' },
  { group: 'Tools', name: 'Docker', icon: 'docker', text: 'Ran my previous Debian server: Nextcloud, Jellyfin, Immich, Vaultwarden and more.' },
  { group: 'Tools', name: 'Jira', icon: 'jira', text: 'Ticketing on the service desk.' },
  { group: 'Tools', name: 'SendGrid', icon: 'sendgrid', text: 'Sent the phishing simulation to 200+ employees.' },
  { group: 'Tools', name: 'Clonezilla', icon: 'disc-copy', text: 'Imaged and deployed the OS for a Linux-to-Windows migration.' },
  { group: 'Tools', name: 'Ollama', icon: 'ollama', text: 'Local LLM hosting for willbot, my voice assistant.' },
  { group: 'Network', name: 'WireGuard', icon: 'wireguard', text: 'My VPN: the only way into my server for admin.' },
  { group: 'Network', name: 'Tailscale', icon: 'tailscale', text: 'Remote access to my devices.' },
  { group: 'Network', name: 'OpenWrt', icon: 'openwrt', text: 'Router set up as a routed wireless client, with separate zones for servers, personal devices and IoT.' },
  { group: 'Hardware', name: 'Raspberry Pi', icon: 'raspberrypi', text: 'Wake-word activation for willbot.' },
  { group: 'Hardware', name: 'Arduino', icon: 'arduino', text: '[TODO: what I have built with it]' },
  { group: 'Hardware', name: 'SolidWorks', icon: 'cube', text: '3D modelling.' },
  { group: 'Hardware', name: 'PC building', icon: 'pc-tower', text: 'Built and sold 5 custom gaming PCs for local customers.' },
];

// ===== EDIT HERE: the "Journal" tab: hobbies and interests. =====
export const JOURNAL = [
  { title: 'Brazilian Jiu-Jitsu', kind: 'Activity', icon: 'belt', text: '[TODO: a few lines about it]' },
  { title: 'Rock climbing', kind: 'Activity', icon: 'carabiner', text: '[TODO: a few lines about it]' },
  { title: 'Skiing', kind: 'Activity', icon: 'mountain', text: '[TODO: a few lines about it]' },
  { title: 'Weightlifting', kind: 'Activity', icon: 'dumbbell', text: '[TODO: a few lines about it]' },
  { title: 'Cybersecurity', kind: 'Interest', icon: 'mark-shield', text: '[TODO: a few lines about it]' },
  { title: 'Self-hosting', kind: 'Interest', icon: 'mark-server', text: '[TODO: a few lines about it]' },
  { title: 'Vintage electronics', kind: 'Interest', icon: 'tube', text: '[TODO: a few lines about it]' },
];
