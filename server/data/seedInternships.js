import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Internship from '../models/Internship.js';

// Builds a single syllabus task with realistic briefs and deliverables
const makeTask = (task_number, title, categoryName, resources, deadline_days) => ({
  task_number,
  title,
  description: `Work through "${title}" as part of the ${categoryName} track. Build a concrete, functional project milestone and document your architectural decisions.`,
  instructions:
    '1) Review the recommended architectural guides and documentation. 2) Implement the required feature set described in the milestone specification. 3) Push your code to GitHub with a clean README and live preview link. 4) Submit your deliverable link for peer & mentor review.',
  resources,
  deadline_days
});

const buildSyllabus = (masterTasks) => {
  const slice = (n) => masterTasks.slice(0, n).map((t, i) => ({ ...t, task_number: i + 1 }));
  return {
    '1m': slice(4),
    '3m': slice(8),
    '5m': slice(14)
  };
};

const deadlineForIndex = (i) => 5 + i * 2; // task 1 -> 7 days, task 14 -> 33 days

const categories = [
  {
    category_code: 'FSWD',
    category_name: 'Full-Stack Web Development (React & Node.js)',
    icon: '💻',
    description:
      'Master modern full-stack web architecture. Build responsive React client apps, scalable Node.js/Express REST APIs, secure JWT auth, MongoDB databases, and cloud deployments.',
    price_1m: 999,
    price_3m: 2499,
    price_5m: 3999,
    resources: [
      'https://react.dev/learn',
      'https://expressjs.com/en/starter/guide.html',
      'https://www.mongodb.com/docs/manual/tutorial/getting-started/',
      'https://developer.mozilla.org/en-US/docs/Web/JavaScript'
    ],
    titles: [
      'Modern JavaScript (ES6+) & Async Programming',
      'Building Interactive User Interfaces with React',
      'State Management, Hooks & Component Architecture',
      'Responsive Web Styling with TailwindCSS',
      'Node.js Runtime & Express Server Setup',
      'RESTful API Architecture & Request Handling',
      'Database Modeling & CRUD Operations with MongoDB',
      'Authentication, Authorization & JWT Token Rotation',
      'File Uploads & Media CDN Integration',
      'Payment Gateway Integration (Razorpay/Stripe)',
      'Frontend & Backend Performance Optimization',
      'Automated API Testing & End-to-End Test Suites',
      'CI/CD Pipelines, Dockerization & Production Deployment',
      'Capstone Project: Production-Ready SaaS Application'
    ]
  },
  {
    category_code: 'DSML',
    category_name: 'Data Science & Applied Machine Learning',
    icon: '📊',
    description:
      'Extract insights from complex datasets and train predictive ML models. Master exploratory data analysis, feature engineering, statistical modeling with Python, Pandas, and Scikit-Learn.',
    price_1m: 1199,
    price_3m: 2999,
    price_5m: 4499,
    resources: [
      'https://pandas.pydata.org/docs/',
      'https://scikit-learn.org/stable/tutorial/index.html',
      'https://numpy.org/doc/stable/',
      'https://matplotlib.org/stable/tutorials/index.html'
    ],
    titles: [
      'Python Programming & Scientific Computing Essentials',
      'Data Wrangling & Cleaning with Pandas and NumPy',
      'Exploratory Data Analysis (EDA) & Data Visualization',
      'Statistical Foundations & Hypothesis Testing',
      'Feature Engineering, Encoding & Data Preprocessing',
      'Supervised Learning: Regression Models & Metrics',
      'Supervised Learning: Classification & Confusion Matrix',
      'Unsupervised Learning: Clustering (K-Means & PCA)',
      'Ensemble Learning: Random Forests & XGBoost',
      'Model Evaluation, Cross-Validation & Hyperparameter Tuning',
      'Time Series Forecasting Basics',
      'Natural Language Processing (NLP) with Spacy & NLTK',
      'Building Interactive Dashboards with Streamlit',
      'Capstone Project: End-to-End Predictive Analytics Pipeline'
    ]
  },
  {
    category_code: 'DEVOPS',
    category_name: 'Cloud Computing & DevOps Engineering',
    icon: '☁️',
    description:
      'Architect resilient cloud infrastructure and automated release workflows. Master Docker containerization, Kubernetes orchestration, CI/CD pipelines, and Amazon Web Services (AWS).',
    price_1m: 1299,
    price_3m: 3199,
    price_5m: 4799,
    resources: [
      'https://aws.amazon.com/getting-started/',
      'https://docs.docker.com/get-started/',
      'https://kubernetes.io/docs/tutorials/',
      'https://developer.hashicorp.com/terraform/intro'
    ],
    titles: [
      'Linux Fundamentals & Shell Scripting for DevOps',
      'Version Control with Git & Trunk-Based Development',
      'Containerization Essentials with Docker',
      'Multi-Stage Docker Builds & Image Optimization',
      'AWS Core Services: EC2, S3, and VPC Networking',
      'Identity & Access Management (IAM) & Security Best Practices',
      'Automated CI/CD Workflows with GitHub Actions',
      'Infrastructure as Code (IaC) with Terraform',
      'Container Orchestration Fundamentals with Kubernetes',
      'Kubernetes Deployments, Services & Ingress Controllers',
      'Cloud Monitoring, Logging & Alerting with Prometheus & Grafana',
      'Serverless Architectures with AWS Lambda & API Gateway',
      'Site Reliability Engineering & Zero-Downtime Deployments',
      'Capstone Project: Automated High-Availability Cloud Infrastructure'
    ]
  },
  {
    category_code: 'UIUX',
    category_name: 'UI/UX Design & Product Strategy',
    icon: '🎨',
    description:
      'Craft intuitive, high-converting digital product experiences. Conduct qualitative user research, build scalable Figma design systems, wireframe user flows, and deliver interactive prototypes.',
    price_1m: 899,
    price_3m: 2199,
    price_5m: 3499,
    resources: [
      'https://help.figma.com/hc/en-us',
      'https://www.nngroup.com/articles/',
      'https://lawsofux.com/',
      'https://material.io/design'
    ],
    titles: [
      'User-Centered Design Principles & Design Thinking',
      'User Research, Persona Creation & Journey Mapping',
      'Information Architecture & Card Sorting Methods',
      'Low-Fidelity Wireframing & Rapid Sketching',
      'Figma Mastery: Auto Layout, Components & Variants',
      'Typography, Color Harmonies & Visual Hierarchy',
      'Building Comprehensive, Scalable Design Systems',
      'Interactive Prototyping & Micro-Animations',
      'Mobile-First Responsive Design Strategies',
      'Web Accessibility (WCAG 2.1) & Inclusive Design',
      'Usability Testing, Heatmap Analysis & User Feedback',
      'Conversion Rate Optimization (CRO) UX Patterns',
      'Design Handoff Documentation for Frontend Engineers',
      'Capstone Project: Complete Mobile & Web Product Case Study'
    ]
  },
  {
    category_code: 'CYBER',
    category_name: 'Cybersecurity & Ethical Hacking',
    icon: '🛡️',
    description:
      'Learn offensive and defensive security tradecraft. Conduct vulnerability assessments, web application penetration tests, exploit OWASP Top 10 weaknesses, and secure modern networks.',
    price_1m: 1099,
    price_3m: 2799,
    price_5m: 4299,
    resources: [
      'https://owasp.org/www-project-top-ten/',
      'https://www.cybrary.it/',
      'https://portswigger.net/web-security',
      'https://www.wireshark.org/docs/'
    ],
    titles: [
      'Computer Networking Essentials: TCP/IP, DNS & Firewalls',
      'Linux Security Essentials & Command-Line Reconnaissance',
      'Information Gathering & Open-Source Intelligence (OSINT)',
      'Network Scanning & Vulnerability Analysis with Nmap',
      'Packet Inspection & Traffic Analysis with Wireshark',
      'Web Application Vulnerabilities: OWASP Top 10 Deep Dive',
      'Cross-Site Scripting (XSS) & CSRF Exploitation & Mitigation',
      'SQL Injection (SQLi) Attacks & Defense Strategies',
      'Authentication Bypass & Session Hijacking Analysis',
      'Cryptography Fundamentals: Symmetric, Asymmetric & Hashes',
      'Endpoint Protection, Antivirus Evasion & Malware Analysis Basics',
      'Privilege Escalation Techniques in Linux & Windows',
      'Incident Response, Threat Hunting & Digital Forensics',
      'Capstone Project: Comprehensive Penetration Test Audit & Remediation'
    ]
  }
];

const seedInternships = async () => {
  await connectDB();

  for (const cat of categories) {
    const masterTasks = cat.titles.map((title, i) =>
      makeTask(i + 1, title, cat.category_name, cat.resources, deadlineForIndex(i))
    );

    const internshipDoc = {
      category_code: cat.category_code,
      category_name: cat.category_name,
      description: cat.description,
      icon: cat.icon,
      syllabus: buildSyllabus(masterTasks),
      price_1m: cat.price_1m,
      price_3m: cat.price_3m,
      price_5m: cat.price_5m,
      total_tasks_1m: 4,
      total_tasks_3m: 8,
      total_tasks_5m: 14,
      is_active: true
    };

    // eslint-disable-next-line no-await-in-loop
    await Internship.findOneAndUpdate(
      { category_code: cat.category_code },
      internshipDoc,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`Seeded: ${cat.category_code} — ${cat.category_name}`);
  }

  console.log('Seeding complete. 5 realistic ed-tech tracks seeded successfully.');
  await mongoose.disconnect();
  process.exit(0);
};

seedInternships().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
