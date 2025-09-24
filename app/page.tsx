"use client"

import { useState, useCallback } from "react"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatArea } from "@/components/chat-area"
import { LoginModal } from "@/components/login-modal"
import { AdminPage } from "@/components/admin-page"
import { ThemeProvider } from "@/components/theme-provider"

interface User {
  userid: string
  username: string
  password?: string
  role: "user" | "admin"
}

const sampleUsers: User[] = [
  {
    userid: "1",
    username: "admin",
    password: "Admin123!",
    role: "admin",
  },
  {
    userid: "2",
    username: "demo",
    password: "Password123!",
    role: "user",
  },
  {
    userid: "3",
    username: "user",
    password: "User123!",
    role: "user",
  },
  {
    userid: "4",
    username: "john_doe",
    password: "Password123!",
    role: "user",
  },
  {
    userid: "5",
    username: "jane_smith",
    password: "Password456!",
    role: "user",
  },
  {
    userid: "6",
    username: "bob_wilson",
    password: "Password789!",
    role: "user",
  },
  {
    userid: "7",
    username: "alice_brown",
    password: "Password321!",
    role: "user",
  },
]

const sampleChats = [
  {
    id: "1",
    title: "Getting started with AI",
    lastMessage: "How can I help you today?",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    conversations: [
      {
        id: "1-1",
        content: "Hello! I'm new to AI. Can you help me understand the basics?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 35),
      },
      {
        id: "1-2",
        content:
          "Of course! I'd be happy to help you understand AI basics. AI, or Artificial Intelligence, refers to computer systems that can perform tasks that typically require human intelligence.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 34),
      },
      {
        id: "1-3",
        content: "What are the main types of AI?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 33),
      },
      {
        id: "1-4",
        content:
          "There are three main types: Narrow AI (designed for specific tasks), General AI (human-level intelligence), and Super AI (exceeds human intelligence).",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 32),
      },
      {
        id: "1-5",
        content: "Can you give me examples of narrow AI?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 31),
      },
      {
        id: "1-6",
        content:
          "Examples include voice assistants like Siri, recommendation systems on Netflix, image recognition in photos, and chatbots like me!",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
      },
    ],
  },
  {
    id: "2",
    title: "React development tips",
    lastMessage: "Here are some best practices...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    conversations: [
      {
        id: "2-1",
        content: "What are the best practices for React development?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2 - 1000 * 60 * 5),
      },
      {
        id: "2-2",
        content:
          "Here are some key React best practices: 1) Use functional components with hooks, 2) Keep components small and focused, 3) Use proper state management, 4) Implement error boundaries.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2 - 1000 * 60 * 4),
      },
      {
        id: "2-3",
        content: "How should I structure my React project?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2 - 1000 * 60 * 3),
      },
      {
        id: "2-4",
        content:
          "A good structure includes: components/, hooks/, utils/, pages/, and assets/ folders. Group related files together and use index files for cleaner imports.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
    ],
  },
  {
    id: "3",
    title: "Python programming help",
    lastMessage: "Let me explain list comprehensions...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    conversations: [
      {
        id: "3-1",
        content: "Can you help me understand Python list comprehensions?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4 - 1000 * 60 * 10),
      },
      {
        id: "3-2",
        content:
          "List comprehensions are a concise way to create lists. The syntax is: [expression for item in iterable if condition]",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4 - 1000 * 60 * 9),
      },
      {
        id: "3-3",
        content: "Can you give me an example?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4 - 1000 * 60 * 8),
      },
      {
        id: "3-4",
        content: "Here's an example: squares = [x**2 for x in range(10)] creates a list of squares from 0 to 81.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
      },
    ],
  },
  {
    id: "4",
    title: "Machine Learning basics",
    lastMessage: "Supervised learning involves...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
    conversations: [
      {
        id: "4-1",
        content: "What's the difference between supervised and unsupervised learning?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6 - 1000 * 60 * 15),
      },
      {
        id: "4-2",
        content:
          "Supervised learning uses labeled data to train models, while unsupervised learning finds patterns in unlabeled data.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6 - 1000 * 60 * 14),
      },
      {
        id: "4-3",
        content: "Can you give examples of each?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6 - 1000 * 60 * 13),
      },
      {
        id: "4-4",
        content:
          "Supervised: email spam detection, image classification. Unsupervised: customer segmentation, anomaly detection.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
      },
    ],
  },
  {
    id: "5",
    title: "Web design principles",
    lastMessage: "Good design follows these principles...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    conversations: [
      {
        id: "5-1",
        content: "What are the fundamental principles of good web design?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8 - 1000 * 60 * 20),
      },
      {
        id: "5-2",
        content:
          "Key principles include: visual hierarchy, consistency, simplicity, accessibility, and responsive design.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8 - 1000 * 60 * 19),
      },
      {
        id: "5-3",
        content: "How do I create good visual hierarchy?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8 - 1000 * 60 * 18),
      },
      {
        id: "5-4",
        content:
          "Use size, color, contrast, and spacing to guide the user's eye. Most important elements should be largest and most prominent.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
      },
    ],
  },
  {
    id: "6",
    title: "JavaScript ES6 features",
    lastMessage: "Arrow functions are great for...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
    conversations: [
      {
        id: "6-1",
        content: "What are the most important ES6 features I should know?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12 - 1000 * 60 * 25),
      },
      {
        id: "6-2",
        content:
          "Key ES6 features: arrow functions, destructuring, template literals, const/let, classes, modules, and promises.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12 - 1000 * 60 * 24),
      },
      {
        id: "6-3",
        content: "Can you explain destructuring?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12 - 1000 * 60 * 23),
      },
      {
        id: "6-4",
        content:
          "Destructuring lets you extract values from arrays/objects: const {name, age} = person; const [first, second] = array;",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
      },
    ],
  },
  {
    id: "7",
    title: "Database design concepts",
    lastMessage: "Normalization helps reduce redundancy...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    conversations: [
      {
        id: "7-1",
        content: "What is database normalization?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 - 1000 * 60 * 30),
      },
      {
        id: "7-2",
        content:
          "Normalization is organizing data to reduce redundancy and improve data integrity through normal forms (1NF, 2NF, 3NF).",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 - 1000 * 60 * 29),
      },
      {
        id: "7-3",
        content: "What's the difference between SQL and NoSQL?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 - 1000 * 60 * 28),
      },
      {
        id: "7-4",
        content:
          "SQL databases are relational with fixed schemas, while NoSQL databases are flexible with various data models (document, key-value, graph).",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
    ],
  },
  {
    id: "8",
    title: "CSS Grid vs Flexbox",
    lastMessage: "Use Grid for 2D layouts...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36),
    conversations: [
      {
        id: "8-1",
        content: "When should I use CSS Grid vs Flexbox?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36 - 1000 * 60 * 35),
      },
      {
        id: "8-2",
        content:
          "Use Flexbox for 1D layouts (rows or columns) and CSS Grid for 2D layouts (rows and columns together).",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36 - 1000 * 60 * 34),
      },
      {
        id: "8-3",
        content: "Can you give me a practical example?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36 - 1000 * 60 * 33),
      },
      {
        id: "8-4",
        content:
          "Flexbox: navigation bars, centering items. Grid: page layouts, card grids, complex responsive designs.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36),
      },
    ],
  },
  {
    id: "9",
    title: "API design best practices",
    lastMessage: "RESTful APIs should follow...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    conversations: [
      {
        id: "9-1",
        content: "What are REST API best practices?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48 - 1000 * 60 * 40),
      },
      {
        id: "9-2",
        content:
          "Key practices: use HTTP methods correctly, meaningful URLs, consistent naming, proper status codes, and versioning.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48 - 1000 * 60 * 39),
      },
      {
        id: "9-3",
        content: "How should I handle errors in APIs?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48 - 1000 * 60 * 38),
      },
      {
        id: "9-4",
        content:
          "Return appropriate HTTP status codes (400, 404, 500) with descriptive error messages in a consistent format.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
      },
    ],
  },
  {
    id: "10",
    title: "Git workflow strategies",
    lastMessage: "Feature branches help organize...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
    conversations: [
      {
        id: "10-1",
        content: "What's the best Git workflow for a team?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72 - 1000 * 60 * 45),
      },
      {
        id: "10-2",
        content:
          "Popular workflows include Git Flow, GitHub Flow, and GitLab Flow. GitHub Flow is simpler: main branch + feature branches + pull requests.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72 - 1000 * 60 * 44),
      },
      {
        id: "10-3",
        content: "How do I write good commit messages?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72 - 1000 * 60 * 43),
      },
      {
        id: "10-4",
        content:
          "Use imperative mood, keep first line under 50 chars, explain 'what' and 'why' not 'how'. Example: 'Add user authentication middleware'",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
      },
    ],
  },
  {
    id: "11",
    title: "TypeScript benefits",
    lastMessage: "Type safety prevents many bugs...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96),
    conversations: [
      {
        id: "11-1",
        content: "Why should I use TypeScript over JavaScript?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96 - 1000 * 60 * 50),
      },
      {
        id: "11-2",
        content:
          "TypeScript adds static typing, better IDE support, early error detection, improved refactoring, and better documentation through types.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96 - 1000 * 60 * 49),
      },
      {
        id: "11-3",
        content: "Is there a learning curve?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96 - 1000 * 60 * 48),
      },
      {
        id: "11-4",
        content:
          "Yes, but it's gradual. You can start by adding basic types and gradually learn advanced features like generics and utility types.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96),
      },
    ],
  },
  {
    id: "12",
    title: "Performance optimization",
    lastMessage: "Lazy loading can improve...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 120),
    conversations: [
      {
        id: "12-1",
        content: "How can I optimize my web app's performance?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 120 - 1000 * 60 * 55),
      },
      {
        id: "12-2",
        content:
          "Key strategies: minimize bundle size, lazy loading, image optimization, caching, CDN usage, and code splitting.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 120 - 1000 * 60 * 54),
      },
      {
        id: "12-3",
        content: "What tools can help measure performance?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 120 - 1000 * 60 * 53),
      },
      {
        id: "12-4",
        content: "Use Lighthouse, WebPageTest, Chrome DevTools, and bundle analyzers like webpack-bundle-analyzer.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 120),
      },
    ],
  },
  {
    id: "13",
    title: "Security best practices",
    lastMessage: "Always validate user input...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 144),
    conversations: [
      {
        id: "13-1",
        content: "What are essential web security practices?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 144 - 1000 * 60 * 60),
      },
      {
        id: "13-2",
        content:
          "Key practices: input validation, HTTPS, authentication, authorization, CSRF protection, XSS prevention, and regular updates.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 144 - 1000 * 60 * 59),
      },
      {
        id: "13-3",
        content: "How do I prevent SQL injection?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 144 - 1000 * 60 * 58),
      },
      {
        id: "13-4",
        content:
          "Use parameterized queries, prepared statements, and ORM frameworks. Never concatenate user input directly into SQL queries.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 144),
      },
    ],
  },
  {
    id: "14",
    title: "Mobile app development",
    lastMessage: "React Native allows...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 168),
    conversations: [
      {
        id: "14-1",
        content: "Should I choose React Native or native development?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 168 - 1000 * 60 * 65),
      },
      {
        id: "14-2",
        content:
          "React Native: faster development, code sharing, good performance. Native: best performance, platform-specific features, larger team needed.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 168 - 1000 * 60 * 64),
      },
      {
        id: "14-3",
        content: "What about Flutter?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 168 - 1000 * 60 * 63),
      },
      {
        id: "14-4",
        content:
          "Flutter offers excellent performance, single codebase, and great UI consistency. Consider it if you're comfortable with Dart.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 168),
      },
    ],
  },
  {
    id: "15",
    title: "Cloud computing basics",
    lastMessage: "AWS, Azure, and GCP offer...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 192),
    conversations: [
      {
        id: "15-1",
        content: "What's the difference between IaaS, PaaS, and SaaS?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 192 - 1000 * 60 * 70),
      },
      {
        id: "15-2",
        content:
          "IaaS: Infrastructure (servers, storage), PaaS: Platform (runtime, databases), SaaS: Software (complete applications).",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 192 - 1000 * 60 * 69),
      },
      {
        id: "15-3",
        content: "Which cloud provider should I choose?",
        role: "user" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 192 - 1000 * 60 * 68),
      },
      {
        id: "15-4",
        content:
          "AWS has the most services, Azure integrates well with Microsoft tools, GCP excels in AI/ML and data analytics. Choose based on your needs.",
        role: "assistant" as const,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 192),
      },
    ],
  },
]

export default function ChatApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showAdminPage, setShowAdminPage] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [chats, setChats] = useState(sampleChats)
  const [users, setUsers] = useState<User[]>(sampleUsers)
  const loadUserChats = async (userId: string, username: string) => {
    try {
      const res = await fetch(`http://localhost:8000/getuserchats/${userId}`)
      if (!res.ok) {
        return
      }
      const data: Array<{ message_id: number; sender: string; content: string; timestamp: string }> = await res.json()
      const messages = data.map((m, idx) => ({
        id: String(m.message_id ?? idx + 1),
        content: m.content,
        role: m.sender === "bot" ? ("assistant" as const) : ("user" as const),
        timestamp: new Date(m.timestamp),
      }))

      const newChat = {
        id: `user-${userId}-chat-1`,
        title: `${username}'s chat history`,
        lastMessage: messages.length ? messages[messages.length - 1].content : "",
        timestamp: messages.length ? messages[messages.length - 1].timestamp : new Date(),
        conversations: messages,
      }
      setChats([newChat])
      setCurrentChatId(newChat.id)
    } catch (e) {
      // silently ignore and keep existing sample chats
    }
  }

  const getTotalChats = () => {
    // In a real app, this would query the database for all chats across all users
    // For demo purposes, we'll simulate this by multiplying current chats by number of users
    // and adding some variation to make it more realistic
    const baseChats = chats.length
    const userMultiplier = users.length
    const simulatedTotalChats = Math.floor(baseChats * userMultiplier * 0.8) + Math.floor(Math.random() * 20)
    return simulatedTotalChats
  }

  const handleLogin = async (username: string, password: string) => {
    try {
      const formData = new FormData()
      formData.append("username", username)
      formData.append("password", password)

      const res = await fetch("http://localhost:8000/authenticate", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        return false
      }

      const data = await res.json()
      // Expected response:
      // { status: "200 OK", userID: number, role: "admin" | "user" }
      if (data && data.status && String(data.status).startsWith("200")) {
        const loggedInUser: User = {
          userid: String(data.userID ?? ""),
          username,
          role: data.role === "admin" ? "admin" : "user",
        }
        setCurrentUser(loggedInUser)
        setIsLoggedIn(true)
        setShowLoginModal(false)
        // Load user's chat history
        if (loggedInUser.userid) {
          loadUserChats(loggedInUser.userid, username)
        }
        return true
      }
      return false
    } catch (e) {
      return false
    }
  }

  const handleSignOut = () => {
    setIsLoggedIn(false)
    setCurrentUser(null)
    setCurrentChatId(null)
    setShowAdminPage(false)
  }

  const handleAdminPage = () => {
    setShowAdminPage(true)
    setIsSidebarOpen(false)
  }

  const handleBackToChat = () => {
    setShowAdminPage(false)
  }

  const handleCreateUser = (userData: Omit<User, "userid">) => {
    const newUser: User = {
      ...userData,
      userid: Date.now().toString(),
    }
    setUsers([...users, newUser])
  }

  const handleUpdateUser = (userid: string, userData: Partial<User>) => {
    setUsers(users.map((user) => (user.userid === userid ? { ...user, ...userData } : user)))
  }

  const handleDeleteUser = (userid: string) => {
    if (currentUser && currentUser.userid === userid) {
      return // Silently prevent deletion
    }
    setUsers(users.filter((user) => user.userid !== userid))
  }

  const handleNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: "New conversation",
      lastMessage: "",
      timestamp: new Date(),
      conversations: [] as { id: string; content: string; role: "user" | "assistant"; timestamp: Date }[],
    }
    setChats([newChat, ...chats])
    setCurrentChatId(newChat.id)
    setIsSidebarOpen(false)
  }

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId)
    setIsSidebarOpen(false)
  }

  const handleUpdateChat = useCallback(
    (chatId: string, newMessages: { id: string; content: string; role: "user" | "assistant"; timestamp: Date }[]) => {
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                conversations: newMessages,
                lastMessage: newMessages[newMessages.length - 1]?.content || "",
                timestamp: new Date(),
              }
            : chat,
        ),
      )
    },
    [],
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="flex h-screen bg-background overflow-hidden">
        {showAdminPage ? (
          <AdminPage
            users={users}
            totalChats={getTotalChats()} // Use calculated total instead of just chats.length
            currentUser={currentUser}
            onCreateUser={handleCreateUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onBackToChat={handleBackToChat}
          />
        ) : (
          <>
            <ChatSidebar
              chats={chats}
              currentChatId={currentChatId}
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
              onLogin={() => setShowLoginModal(true)}
              onSignOut={handleSignOut}
              onAdminPage={handleAdminPage}
              isLoggedIn={isLoggedIn}
              user={currentUser}
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />
            <ChatArea
              currentChatId={currentChatId}
              chats={chats}
              isLoggedIn={isLoggedIn}
              onLogin={() => setShowLoginModal(true)}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              onUpdateChat={handleUpdateChat}
            />
          </>
        )}
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLogin={handleLogin} />
      </div>
    </ThemeProvider>
  )
}
