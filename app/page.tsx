"use client"

import { useState, useCallback, useEffect, useRef } from "react"
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
  is_active?: boolean
}

function normalizeRole(value: unknown): "user" | "admin" {
  const v = String(value ?? "").toLowerCase()
  return v === "admin" ? "admin" : "user"
}

function truncateText(text: string, maxLength = 80) {
  if (!text) return ""
  return text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text
}

export default function ChatApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showAdminPage, setShowAdminPage] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [chats, setChats] = useState<{ id: string; title: string; lastMessage: string; timestamp: Date; conversations: { id: string; content: string; role: "user" | "assistant"; timestamp: Date }[] }[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [adminTotalChats, setAdminTotalChats] = useState<number | null>(null)
  const [adminUserFrequency, setAdminUserFrequency] = useState<Array<{ name: string; users: number }> | null>(null)
  const [pendingNewChatId, setPendingNewChatId] = useState<string | null>(null)
  const [focusInputSignal, setFocusInputSignal] = useState(0)
  const [isChatsLoading, setIsChatsLoading] = useState(false)
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  const [usernewchat, setUsernewchat] = useState("")
  const firstCreateLockRef = useRef(false)
  const createdChatIdRef = useRef<string | null>(null)

  // Restore user session on page load
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser')
    const savedLoginState = localStorage.getItem('isLoggedIn')
    
    if (savedUser && savedLoginState === 'true') {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)
        setIsLoggedIn(true)
        // Load user's chats
        if (user.userid) {
          loadUserChats(user.userid)
        }
      } catch (e) {
        // Clear invalid data
        localStorage.removeItem('currentUser')
        localStorage.removeItem('isLoggedIn')
      }
    }
  }, [])

  // Save user session when it changes
  useEffect(() => {
    if (currentUser && isLoggedIn) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser))
      localStorage.setItem('isLoggedIn', 'true')
    } else {
      localStorage.removeItem('currentUser')
      localStorage.removeItem('isLoggedIn')
    }
  }, [currentUser, isLoggedIn])
  
  // When drafting a new local chat, reflect the first message as the sidebar heading and lastMessage
  useEffect(() => {
    if (currentChatId && currentChatId.startsWith("local-") && usernewchat.trim()) {
      const truncatedTitle = truncateText(usernewchat, 20)
      const truncatedLast = truncateText(usernewchat)
      console.log("[NEW CHAT][truncatedTitle]", truncatedTitle)
      console.log("[NEW CHAT][truncatedLast]", truncatedLast)
      setChats((prev) =>
        prev.map((c) =>
          c.id === currentChatId
            ? {
                ...c,
                title: truncatedTitle,
                lastMessage: truncatedLast,
                timestamp: new Date(),
              }
            : c,
        ),
      )
    }
  }, [usernewchat, currentChatId])
  const loadUserChats = async (
    userId: string,
    options?: { preserveSelection?: boolean },
  ) => {
    try {
      setIsChatsLoading(true)
      const res = await fetch(`https://backend-ltzf.onrender.com/getuserchats?user_id=${encodeURIComponent(userId)}`)
      if (!res.ok) {
        return [] as {
          id: string
          title: string
          lastMessage: string
          timestamp: Date
          conversations: { id: string; content: string; role: "user" | "assistant"; timestamp: Date }[]
        }[]
      }
      const data: Array<{ chat_id: number; chat_name: string; last_msg: string; timestamp: string }> = await res.json()
      const fetchedChats = data.map((c) => ({
        id: String(c.chat_id),
        title: truncateText(c.chat_name ?? "", 20),
        lastMessage: truncateText(c.last_msg ?? ""),
        timestamp: new Date(c.timestamp),
        conversations: [] as { id: string; content: string; role: "user" | "assistant"; timestamp: Date }[],
      }))
      setChats(fetchedChats)
      if (!options?.preserveSelection) {
        setCurrentChatId(fetchedChats[0]?.id ?? null)
      }
      return fetchedChats
    } catch (e) {
      // silently ignore and keep existing sample chats
      return [] as any
    } finally {
      setIsChatsLoading(false)
    }
  }

  const loadChatMessages = async (chatId: string) => {
    setIsMessagesLoading(true)
    try {
      const res = await fetch(`https://backend-ltzf.onrender.com/getchatmessages?chat_id=${encodeURIComponent(chatId)}`)
      if (!res.ok) {
        return
      }
      const data: Array<{ sender: string; content: string; timestamp: string }> = await res.json()
      const messages = data.map((m, idx) => ({
        id: String(idx + 1),
        content: m.content,
        role: m.sender === "bot" ? ("assistant" as const) : ("user" as const),
        timestamp: new Date(m.timestamp),
      }))

      // Update the specific chat with its messages
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
        conversations: messages,
                lastMessage: truncateText(messages.length ? messages[messages.length - 1].content : ""),
        timestamp: messages.length ? messages[messages.length - 1].timestamp : new Date(),
      }
            : chat,
        ),
      )
    } catch (e) {
      // silently ignore errors
    } finally {
      setIsMessagesLoading(false)
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
      const res = await fetch("https://backend-ltzf.onrender.com/authenticate", {
        method: "POST",
        body: formData,
      })
      console.log(res.status)
     if (!res.ok ) {
        return false
      }

      const data = await res.json()
      // Expected response:
      // { status: "200 OK", userID: number, role: "admin" | "user" }
      if ((data && data.status === "200 OK") || (data && data.message === "User authentication successful") ){
        const loggedInUser: User = {
          userid: String(data.userID ?? ""),
          username,
          role: data.role === "admin" ? "admin" : "user",
        }
        setCurrentUser(loggedInUser)
        setIsLoggedIn(true)
        setShowLoginModal(false)
        // Load user's chats list
        if (loggedInUser.userid) {
          loadUserChats(loggedInUser.userid)
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
    setPendingNewChatId(null)
  }

  const handleAdminPage = async () => {
    setShowAdminPage(true)
    setIsSidebarOpen(false)
    try {
      const res = await fetch("https://backend-ltzf.onrender.com/get-all-users")
      if (!res.ok) return
      const data: {
        users: Array<{ user_id: number; username: string; role: string; last_login?: string }>
        total_users: number
        total_chats: number
      } = await res.json()
      const mappedUsers: User[] = data.users.map((u) => ({
        userid: String(u.user_id),
        username: u.username,
        role: u.role === "admin" ? "admin" : "user",
        is_active: (u as any).is_active ?? true,
      }))
      setUsers(mappedUsers)
      setAdminTotalChats(typeof data.total_chats === "number" ? data.total_chats : mappedUsers.length)

      // Build user activity frequency by month from last_login
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
      const counts = new Array(12).fill(0)
      for (const u of data.users) {
        if (u.last_login) {
          const d = new Date(u.last_login)
          if (!isNaN(d.getTime())) {
            counts[d.getMonth()] += 1
          }
        }
      }
      const freq = counts.map((c, i) => ({ name: months[i], users: c }))
      setAdminUserFrequency(freq)
    } catch (e) {
      // ignore; keep existing users and simulated total
    }
  }

  const handleBackToChat = () => {
    setShowAdminPage(false)
  }

  const handleCreateUser = (userData: Omit<User, "userid"> | undefined | null) => {
    if (!userData || !userData.username || userData.password === undefined || !userData.role) {
      return
    }
    // Optimistically add while also creating on backend
    const tempUser: User = { ...userData, userid: Date.now().toString(), role: normalizeRole(userData.role) }
    setUsers((prev) => [tempUser, ...prev])

    void (async () => {
      try {
        const body = new URLSearchParams()
        const roleValue = normalizeRole(userData.role)
        const passwordValue = String(userData.password ?? "")
        body.set("Username", userData.username)
        body.set("username", userData.username)
        body.set("password", passwordValue)
        body.set("Role", roleValue)
        body.set("role", roleValue)

        const res = await fetch("https://backend-ltzf.onrender.com/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        })
        if (!res.ok) return

        // Refresh users and totals from backend for accuracy
        const allRes = await fetch("https://backend-ltzf.onrender.com/get-all-users")
        if (!allRes.ok) return
        const data: {
          users: Array<{ user_id: number; username: string; role: string; last_login?: string }>
          total_users: number
          total_chats: number
        } = await allRes.json()
        const mappedUsers: User[] = data.users.map((u) => ({
          userid: String(u.user_id),
          username: u.username,
          role: u.role === "admin" ? "admin" : "user",
          is_active: (u as any).is_active ?? true,
        }))
        setUsers(mappedUsers)
        setAdminTotalChats(typeof data.total_chats === "number" ? data.total_chats : mappedUsers.length)

        // Recompute activity frequency as well
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        const counts = new Array(12).fill(0)
        for (const u of data.users) {
          if (u.last_login) {
            const d = new Date(u.last_login)
            if (!isNaN(d.getTime())) counts[d.getMonth()] += 1
          }
        }
        const freq = counts.map((c, i) => ({ name: months[i], users: c }))
        setAdminUserFrequency(freq)
      } catch (e) {
        // ignore network errors; UI already shows optimistic item
      }
    })()
  }

  const handleUpdateUser = async (userid: string, userData: Partial<User>) => {
    // Update local state optimistically
    setUsers(users.map((user) => (user.userid === userid ? { ...user, ...userData, role: normalizeRole(userData.role) } : user)))

    // Send to backend using the new change-user-details endpoint
    try {
      const body = new URLSearchParams()
      body.set("userID", userid)
      body.set("role", normalizeRole(userData.role))
      body.set("password", String(userData.password ?? ""))

      const res = await fetch("https://backend-ltzf.onrender.com/change-user-details", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      })
      
      if (!res.ok) {
        console.error("Failed to update user:", res.status)
      }
    } catch (e) {
      console.error("Error updating user:", e)
      // ignore network errors for now; UI already updated
    }
  }

  const handleDeleteUser = (userid: string) => {
    if (currentUser && currentUser.userid === userid) {
      return // Silently prevent deletion of current user
    }
    
    // Find the user to check if they are admin
    const userToDelete = users.find(user => user.userid === userid)
    if (userToDelete && userToDelete.role === "admin") {
      alert("Admin users cannot be deleted!")
      return
    }
    
    setUsers(users.filter((user) => user.userid !== userid))
  }

  const handleNewChat = async () => {
    const newChat = {
      id: `local-${Date.now()}`,
      title: "New conversation",
      lastMessage: "",
      timestamp: new Date(),
      conversations: [] as { id: string; content: string; role: "user" | "assistant"; timestamp: Date }[],
    }
    setChats([newChat, ...chats])
    setCurrentChatId(newChat.id)
    setIsSidebarOpen(false)
    setUsernewchat("")
    // Signal ChatArea to focus the message input
    setFocusInputSignal((n) => n + 1)
  }

  // Promote a local chat to a server chat: create on backend, update sidebar, and return server chat id
  const handlePromoteLocalChat = useCallback(
    async (localChatId: string, chatTitle: string): Promise<string | null> => {
      if (!currentUser?.userid) return null
      try {
        const body = new URLSearchParams()
        body.set("userID", String(currentUser.userid))
        body.set("chat_name", chatTitle)
        const res = await fetch("https://backend-ltzf.onrender.com/create-chat", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        })
        if (!res.ok) return null
        let serverId: string | null = null
        try {
          const json = await res.clone().json()
          serverId = json?.chat?.chat_id ? String(json.chat.chat_id) : null
        } catch {}
        // Fallback: fetch list and pick newest if id not in response
        if (!serverId) {
          const list = await fetch(`https://backend-ltzf.onrender.com/getuserchats?user_id=${encodeURIComponent(currentUser.userid)}`)
          if (list.ok) {
            const data: Array<{ chat_id: number; chat_name: string; last_msg: string; timestamp: string }> = await list.json()
            if (data.length) {
              const newest = data.reduce((latest, c) => (new Date(c.timestamp) > new Date(latest.timestamp) ? c : latest), data[0])
              serverId = String(newest.chat_id)
            }
          }
        }
        if (!serverId) return null
        // Update local placeholder to server id and title (truncate to 20 for heading)
        const truncated = truncateText(chatTitle, 20)
        setChats((prev) =>
          prev.map((c) =>
            c.id === localChatId
              ? { ...c, id: serverId!, title: truncated, lastMessage: truncateText(usernewchat || chatTitle), timestamp: new Date() }
              : c,
          ),
        )
        setCurrentChatId(serverId)
        return serverId
      } catch {
        return null
      }
    },
    [currentUser?.userid, usernewchat],
  )

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId)
    setIsSidebarOpen(false)
    // Load messages for the selected chat
    loadChatMessages(chatId)
  }

  const handleUpdateChat = useCallback(
    (chatId: string, newMessages: { id: string; content: string; role: "user" | "assistant"; timestamp: Date }[]) => {
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                conversations: newMessages,
                lastMessage: truncateText(newMessages[newMessages.length - 1]?.content || ""),
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
            totalChats={adminTotalChats ?? getTotalChats()}
            currentUser={currentUser}
            onCreateUser={handleCreateUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onBackToChat={handleBackToChat}
            userFrequencyData={adminUserFrequency ?? undefined}
            onToggleActive={async (userid, makeActive) => {
              // Find the user to check if they are admin
              const userToToggle = users.find(u => u.userid === userid)
              if (userToToggle && userToToggle.role === "admin") {
                alert("Admin users cannot be deactivated!")
                return
              }
              
              // optimistic update
              setUsers((prev) => prev.map(u => u.userid === userid ? { ...u, is_active: makeActive } : u))
              try {
                const body = new URLSearchParams()
                // Send both casings to satisfy backend variations
                body.set("UserId", userid)
                body.set("userID", userid)
                const endpoint = makeActive ? "activate-user" : "deactivate-user"
                const res = await fetch(`https://backend-ltzf.onrender.com/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body })
                if (!res.ok) return
                // Refresh users to sync is_active
                const allRes = await fetch("https://backend-ltzf.onrender.com/get-all-users")
                if (!allRes.ok) return
                const data: {
                  users: Array<{ user_id: number; username: string; role: string; last_login?: string; is_active?: boolean }>
                  total_users: number
                  total_chats: number
                } = await allRes.json()
                const mappedUsers: User[] = data.users.map((u) => ({
                  userid: String(u.user_id),
                  username: u.username,
                  role: u.role === "admin" ? "admin" : "user",
                  is_active: (u as any).is_active ?? true,
                }))
                setUsers(mappedUsers)
                setAdminTotalChats(typeof data.total_chats === "number" ? data.total_chats : mappedUsers.length)
              } catch {}
            }}
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
              userId={currentUser?.userid || undefined}
              focusInputSignal={focusInputSignal}
              messagesLoading={isMessagesLoading}
              setUsernewchat={setUsernewchat}
              promoteLocalChat={handlePromoteLocalChat}
            />
          </>
        )}
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLogin={handleLogin} />
      </div>
    </ThemeProvider>
  )
}
