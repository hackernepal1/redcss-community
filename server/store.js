const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'db.json');

/* DEFAULT DATABASE */

const seed = {
  posts: [
    {
      id: 'social-engineering',
      title: 'Understanding Social Engineering',
      category: 'Awareness',
      date: 'October 06, 2026',
      excerpt: 'Learn how phishing and social engineering work.',
      content: 'Social engineering manipulates people into sharing information or taking unsafe actions. Use multi-factor authentication and report suspicious messages.'
    },
    {
      id: 'wireshark',
      title: 'How to Analyze Network Traffic Using Wireshark',
      category: 'Network Security',
      date: 'October 06, 2026',
      excerpt: 'Explore packet analysis and network troubleshooting.',
      content: 'Wireshark is a network protocol analyzer used to inspect traffic in authorized environments.'
    },
    {
      id: 'owasp-top-10',
      title: 'Introduction to OWASP Top 10',
      category: 'Web Security',
      date: 'October 06, 2026',
      excerpt: 'Understand common web application security risks.',
      content: 'Build secure applications with server-side authorization, input validation and secure session handling.'
    },
    {
      id: 'brute-force',
      title: 'What is a Brute Force Attack?',
      category: 'Web Security',
      date: 'October 06, 2026',
      excerpt: 'Understand password attacks and their defenses.',
      content: 'Defenses include rate limiting, multi-factor authentication and strong unique passwords.'
    },
    {
      id: 'nmap',
      title: 'How to Use Nmap for Network Security Auditing',
      category: 'Network Security',
      date: 'October 06, 2026',
      excerpt: 'Learn authorized network auditing fundamentals.',
      content: 'Nmap helps administrators discover hosts and services on networks they are authorized to assess.'
    }
  ],

  courses: [
    {
      id: 'regular-practical',
      title: 'REDCSS Regular Cybersecurity Practical Course',
      duration: '3 months',
      description: 'A practical cybersecurity learning program.',
      modules: [
        'Nmap fundamentals',
        'Burp Suite and web security basics',
        'Cybersecurity fundamentals',
        'Practical assessment and responsible reporting'
      ],
      type: 'paid',
      active: true
    }
  ],

  messages: [],
  settings: {},
  sections: [],
  products: [],
  services: [],
  profiles: [],
  labs: [],
  banners: []
};

/* CREATE SAFE DEFAULT COPY */

function createDefaultData() {
  return JSON.parse(JSON.stringify(seed));
}

/* READ DATABASE */

function read() {
  if (!fs.existsSync(file)) {
    const initialData = createDefaultData();
    write(initialData);
    return initialData;
  }

  try {
    const savedData = JSON.parse(
      fs.readFileSync(file, 'utf8')
    );

    if (
      !savedData ||
      typeof savedData !== 'object' ||
      Array.isArray(savedData)
    ) {
      throw new Error('Invalid database format');
    }

    const defaults = createDefaultData();

    // Add missing fields without deleting existing data.
    Object.keys(defaults).forEach(key => {
      if (
        !Object.prototype.hasOwnProperty.call(savedData, key) ||
        savedData[key] === undefined ||
        savedData[key] === null
      ) {
        savedData[key] = defaults[key];
      }
    });

    return savedData;

  } catch (error) {
    console.error('Database read error:', error.message);

    // Keep a backup of corrupted database before recovery.
    try {
      fs.copyFileSync(
        file,
        file + '.corrupt-backup'
      );
    } catch (backupError) {
      console.error('Database backup failed:', backupError.message);
    }

    const recoveredData = createDefaultData();
    write(recoveredData);

    return recoveredData;
  }
}

/* WRITE DATABASE */

function write(data) {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    throw new Error('Invalid database data.');
  }

  fs.mkdirSync(path.dirname(file), {
    recursive: true
  });

  const tempFile = file + '.tmp';

  fs.writeFileSync(
    tempFile,
    JSON.stringify(data, null, 2),
    'utf8'
  );

  fs.renameSync(tempFile, file);
}

module.exports = {
  read,
  write
};
