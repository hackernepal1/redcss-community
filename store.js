const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'data', 'db.json');
const seed = {
  posts: [
    { id: 'social-engineering', title: 'Understanding Social Engineering: How to Protect Your Team from Phishing', category: 'Awareness', date: 'October 06, 2026', excerpt: 'Learn how phishing and social engineering work, how to recognize suspicious messages, and how to protect your accounts and organization.', content: 'Social engineering manipulates people into sharing information or taking unsafe actions. Watch for urgent language, mismatched domains, unexpected attachments, and requests for credentials. Verify requests through a trusted channel, use multi-factor authentication, and report suspicious messages.' },
    { id: 'wireshark', title: 'How to Analyze Network Traffic Using Wireshark for Cyber Defense', category: 'Network Security', date: 'October 06, 2026', excerpt: 'Explore packet analysis, network troubleshooting, suspicious traffic detection, and encryption checks with Wireshark.', content: 'Wireshark is a network protocol analyzer used to inspect traffic in authorized environments. It can help troubleshoot latency, identify unusual communication patterns, and verify that sensitive data is protected in transit.' },
    { id: 'owasp-top-10', title: 'Introduction to OWASP Top 10: Essential Web Application Security Standards', category: 'Web Security', date: 'October 06, 2026', excerpt: 'Understand common web application risks such as broken access control, cryptographic failures, and injection.', content: 'The OWASP Top 10 is an awareness document describing major web application security risks. Build secure applications with server-side authorization, safe cryptography, input validation, secure session handling, and regular testing.' },
    { id: 'brute-force', title: 'What is a Brute Force Attack and How to Protect Your Website from It?', category: 'Web Security', date: 'October 06, 2026', excerpt: 'Understand password-guessing attacks and practical defensive measures such as rate limiting and strong authentication.', content: 'A brute-force attack repeatedly tries credential combinations. Defenses include rate limiting, multi-factor authentication, strong unique passwords, breached-password checks, monitoring, and secure account recovery.' },
    { id: 'nmap', title: 'How to Use Nmap for Network Security Auditing: A Beginner’s Guide', category: 'Network Security', date: 'October 06, 2026', excerpt: 'Learn the foundations of host discovery, service identification, and responsible network auditing.', content: 'Nmap helps administrators discover hosts and services on networks they are authorized to assess. Always obtain permission, define scope, document findings, and avoid scanning systems you do not own or have permission to test.' }
  ],
  courses: [
    { id: 'regular-practical', title: 'REDCSS Regular Cybersecurity Practical Course', duration: '3 months', description: 'A structured practical learning program with guided exercises, learning resources, and an online practical examination.', modules: ['Nmap fundamentals and authorized network reconnaissance', 'Burp Suite and web application security basics', 'Cybersecurity fundamentals and defensive practices', 'Practical assessment and responsible reporting'] }
  ],
  messages: []
};
function read() {
  if (!fs.existsSync(file)) write(seed);
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { write(seed); return structuredClone(seed); }
}
function write(data) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
module.exports = { read, write };
