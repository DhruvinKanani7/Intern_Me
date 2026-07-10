import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Internship from '../models/Internship.js';

// Builds a single syllabus task. Description/instructions follow a consistent,
// professional template personalized by title + category so every task reads
// naturally while staying maintainable across 140 total tasks.
const makeTask = (task_number, title, categoryName, resources, deadline_days) => ({
  task_number,
  title,
  description: `Work through ${title.toLowerCase()} as part of the ${categoryName} internship track. You'll apply the concept through a focused, hands-on exercise and produce a concrete output you can showcase publicly.`,
  instructions:
    '1) Review the linked resources for this topic. 2) Complete the hands-on exercise described in the task brief on your dashboard. 3) Document what you built or learned in a short write-up. 4) Post your work publicly on LinkedIn using the required internship code format and submit the post link.',
  resources,
  deadline_days
});

// Given a full 14-task master list, derive the 1m (first 4), 3m (first 8),
// and 5m (all 14) syllabi, renumbering tasks 1..N for each duration.
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
    category_code: 'PY',
    category_name: 'Python Programming',
    icon: '🐍',
    description: 'Learn Python from the ground up and build real, working programs.',
    price_1m: 999,
    price_3m: 2499,
    price_5m: 3999,
    resources: [
      'https://docs.python.org/3/tutorial/',
      'https://www.freecodecamp.org/learn/scientific-computing-with-python/',
      'https://realpython.com/'
    ],
    titles: [
      'Python Setup and Basics',
      'Control Flow and Loops',
      'Functions and Modules',
      'Data Structures: Lists, Tuples, Dictionaries, Sets',
      'File Handling and Exception Handling',
      'Object-Oriented Programming in Python',
      'Working with Libraries and Virtual Environments',
      'Regular Expressions and String Manipulation',
      'Working with APIs using Requests',
      'Introduction to Web Scraping',
      'Database Connectivity with SQLite',
      'Building a Command-Line Application',
      'Testing with unittest and pytest',
      'Capstone Project: End-to-End Python Application'
    ]
  },
  {
    category_code: 'DS',
    category_name: 'Data Science',
    icon: '📊',
    description: 'Master the data science workflow from raw data to machine learning models.',
    price_1m: 1499,
    price_3m: 3499,
    price_5m: 5499,
    resources: [
      'https://www.kaggle.com/learn',
      'https://pandas.pydata.org/docs/',
      'https://scikit-learn.org/stable/tutorial/index.html'
    ],
    titles: [
      'Python Foundations for Data Science',
      'Data Wrangling with Pandas and NumPy',
      'Data Visualization with Matplotlib and Seaborn',
      'Exploratory Data Analysis (EDA) Project',
      'Introduction to Machine Learning',
      'Supervised Learning: Regression and Classification',
      'Unsupervised Learning: Clustering',
      'Feature Engineering and Model Evaluation',
      'Introduction to Deep Learning',
      'Time Series Analysis',
      'Natural Language Processing Basics',
      'Working with SQL for Data Science',
      'Model Deployment Basics',
      'Capstone Project: End-to-End Data Science Pipeline'
    ]
  },
  {
    category_code: 'HC',
    category_name: 'HTML & CSS',
    icon: '🌐',
    description: 'Build responsive, accessible websites with modern HTML and CSS.',
    price_1m: 799,
    price_3m: 1999,
    price_5m: 2999,
    resources: [
      'https://developer.mozilla.org/en-US/docs/Web/HTML',
      'https://developer.mozilla.org/en-US/docs/Web/CSS',
      'https://www.freecodecamp.org/learn/responsive-web-design/'
    ],
    titles: [
      'Introduction to HTML Structure',
      'Text, Links, and Lists in HTML',
      'Images, Tables, and Forms',
      'CSS Basics: Selectors and Styling',
      'Box Model and Layout Fundamentals',
      'Flexbox Layout',
      'CSS Grid Layout',
      'Responsive Design and Media Queries',
      'CSS Animations and Transitions',
      'Building a Multi-Page Website',
      'CSS Preprocessors Basics (Sass)',
      'Accessibility in Web Design',
      'Cross-Browser Compatibility and Testing',
      'Capstone Project: Fully Responsive Portfolio Website'
    ]
  },
  {
    category_code: 'ME',
    category_name: 'MERN Stack',
    icon: '⚛️',
    description: 'Build full-stack web applications using MongoDB, Express, React, and Node.js.',
    price_1m: 1999,
    price_3m: 4999,
    price_5m: 7999,
    resources: [
      'https://react.dev/learn',
      'https://expressjs.com/en/starter/guide.html',
      'https://www.mongodb.com/docs/manual/tutorial/getting-started/'
    ],
    titles: [
      'Setting up MongoDB and Node.js',
      'Building a REST API with Express',
      'MongoDB Schemas with Mongoose',
      'Authentication with JWT',
      'React Fundamentals and Components',
      'State Management with Hooks',
      'React Router and Navigation',
      'Connecting React to an Express API',
      'Form Handling and Validation',
      'File Uploads and Image Handling',
      'Deploying Backend Services',
      'Deploying Frontend Applications',
      'Testing MERN Applications',
      'Capstone Project: Full-Stack MERN Application'
    ]
  },
  {
    category_code: 'JV',
    category_name: 'Java Programming',
    icon: '☕',
    description: 'Learn core Java and build backend applications with Spring Boot.',
    price_1m: 999,
    price_3m: 2499,
    price_5m: 3999,
    resources: [
      'https://docs.oracle.com/javase/tutorial/',
      'https://www.baeldung.com/',
      'https://spring.io/guides'
    ],
    titles: [
      'Java Basics: Syntax and Data Types',
      'Control Flow and Loops in Java',
      'Object-Oriented Programming: Classes and Objects',
      'Inheritance and Polymorphism',
      'Interfaces and Abstract Classes',
      'Exception Handling in Java',
      'Collections Framework',
      'File I/O in Java',
      'Multithreading Basics',
      'Working with JDBC and Databases',
      'Introduction to Spring Boot',
      'Building REST APIs with Spring Boot',
      'Unit Testing with JUnit',
      'Capstone Project: Java Backend Application'
    ]
  },
  {
    category_code: 'DM',
    category_name: 'Digital Marketing',
    icon: '📱',
    description: 'Learn to plan, run, and measure digital marketing campaigns across channels.',
    price_1m: 1299,
    price_3m: 2999,
    price_5m: 4999,
    resources: [
      'https://skillshop.exceedlms.com/student/catalog',
      'https://blog.hubspot.com/marketing',
      'https://moz.com/beginners-guide-to-seo'
    ],
    titles: [
      'Introduction to Digital Marketing',
      'Search Engine Optimization (SEO) Basics',
      'Content Marketing Strategy',
      'Social Media Marketing Fundamentals',
      'Email Marketing Campaigns',
      'Google Ads and PPC Basics',
      'Google Analytics and Data Tracking',
      'Facebook and Instagram Ads',
      'Influencer and Affiliate Marketing',
      'Marketing Automation Tools',
      'Conversion Rate Optimization',
      'Brand Building and Positioning',
      'Marketing Analytics and Reporting',
      'Capstone Project: Full Digital Marketing Campaign'
    ]
  },
  {
    category_code: 'UX',
    category_name: 'UI/UX Design',
    icon: '🎨',
    description: 'Design user-centered digital products from research through to prototype.',
    price_1m: 1499,
    price_3m: 3499,
    price_5m: 5499,
    resources: [
      'https://www.interaction-design.org/literature',
      'https://help.figma.com/hc/en-us',
      'https://www.nngroup.com/articles/'
    ],
    titles: [
      'Introduction to UX Design Principles',
      'User Research Methods',
      'Information Architecture',
      'Wireframing Basics',
      'Prototyping with Figma',
      'Visual Design Principles',
      'Typography and Color Theory',
      'Design Systems and Component Libraries',
      'Usability Testing',
      'Interaction Design and Micro-interactions',
      'Mobile-First Design',
      'Accessibility in UX Design',
      'Design Handoff to Developers',
      'Capstone Project: End-to-End App Design'
    ]
  },
  {
    category_code: 'CC',
    category_name: 'Cloud Computing',
    icon: '☁️',
    description: 'Learn cloud infrastructure fundamentals and deploy scalable applications.',
    price_1m: 1999,
    price_3m: 4999,
    price_5m: 7999,
    resources: [
      'https://aws.amazon.com/getting-started/',
      'https://kubernetes.io/docs/tutorials/',
      'https://developer.hashicorp.com/terraform/intro'
    ],
    titles: [
      'Introduction to Cloud Computing Concepts',
      'AWS Fundamentals: EC2 and S3',
      'Cloud Networking Basics (VPC)',
      'Identity and Access Management (IAM)',
      'Cloud Storage and Databases',
      'Introduction to Docker',
      'Container Orchestration Basics with Kubernetes',
      'Serverless Computing with AWS Lambda',
      'CI/CD Pipelines in the Cloud',
      'Cloud Monitoring and Logging',
      'Cloud Security Fundamentals',
      'Infrastructure as Code with Terraform',
      'Cost Optimization in the Cloud',
      'Capstone Project: Deploying a Scalable Cloud Application'
    ]
  },
  {
    category_code: 'AI',
    category_name: 'AI & Machine Learning',
    icon: '🤖',
    description: 'Build and deploy machine learning and deep learning models from scratch.',
    price_1m: 2499,
    price_3m: 5999,
    price_5m: 9999,
    resources: [
      'https://www.tensorflow.org/tutorials',
      'https://www.deeplearning.ai/',
      'https://scikit-learn.org/stable/tutorial/index.html'
    ],
    titles: [
      'Python for AI and Machine Learning',
      'Mathematics for Machine Learning (Linear Algebra & Stats)',
      'Introduction to Supervised Learning',
      'Regression Algorithms',
      'Classification Algorithms',
      'Model Evaluation and Cross-Validation',
      'Introduction to Neural Networks',
      'Deep Learning with TensorFlow and Keras',
      'Convolutional Neural Networks (CNNs)',
      'Natural Language Processing with AI',
      'Introduction to Reinforcement Learning',
      'Model Deployment and MLOps Basics',
      'Ethics and Bias in AI',
      'Capstone Project: End-to-End AI Application'
    ]
  },
  {
    category_code: 'CS',
    category_name: 'Cybersecurity',
    icon: '🔒',
    description: 'Learn to identify, assess, and defend against real-world cyber threats.',
    price_1m: 1999,
    price_3m: 4999,
    price_5m: 7999,
    resources: [
      'https://owasp.org/www-project-top-ten/',
      'https://www.cybrary.it/',
      'https://www.wireshark.org/docs/'
    ],
    titles: [
      'Introduction to Cybersecurity Fundamentals',
      'Networking Basics for Security',
      'Understanding Common Cyber Threats',
      'Cryptography Basics',
      'Web Application Security (OWASP Top 10)',
      'Ethical Hacking and Penetration Testing Basics',
      'Security Tools: Nmap and Wireshark',
      'Vulnerability Assessment',
      'Incident Response Fundamentals',
      'Security in Cloud Environments',
      'Identity and Access Management',
      'Malware Analysis Basics',
      'Security Compliance and Standards',
      'Capstone Project: Security Assessment Report'
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

  console.log('Seeding complete.');
  await mongoose.disconnect();
  process.exit(0);
};

seedInternships().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
