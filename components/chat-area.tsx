"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PaperAirplaneIcon, UserIcon, SparklesIcon, Bars3Icon, ChevronDownIcon } from "@heroicons/react/24/outline"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

interface Chat {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
  conversations?: Message[]
}

interface ChatAreaProps {
  currentChatId: string | null
  chats: Chat[]
  isLoggedIn: boolean
  onLogin: () => void
  onToggleSidebar: () => void
  onUpdateChat: (chatId: string, messages: Message[]) => void // Added callback prop
  userId?: string
  focusInputSignal?: number
  messagesLoading?: boolean
  // Persist user's draft for local-only new chat
  setUsernewchat?: (value: string) => void
  // Promote a local chat to server chat (create-chat) and return server id
  promoteLocalChat?: (localChatId: string, chatTitle: string) => Promise<string | null>
}

export function ChatArea({ currentChatId, chats, isLoggedIn, onLogin, onToggleSidebar, onUpdateChat, userId, focusInputSignal, messagesLoading, setUsernewchat, promoteLocalChat }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
  }

  const formatBasicMarkdown = (text: string) => {
    const escaped = escapeHtml(text)
    // Basic support for markdown headings: lines starting with ### become bold headings
    const withHeadings = escaped.replace(/^###\s+(.+)$/gm, "<strong>$1</strong>")
    const withBold = withHeadings.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    const withLineBreaks = withBold.replace(/\n/g, "<br/>")
    return withLineBreaks
  }

  useEffect(() => {
    if (currentChatId) {
      const currentChat = chats.find((chat) => chat.id === currentChatId)
    if (currentChat && currentChat.conversations) {
      setMessages(currentChat.conversations)
    } else {
      setMessages([])
    }
    } else {
      setMessages([])
    }
  }, [currentChatId, chats])

  // Focus input when page asks (e.g., after New chat)
  useEffect(() => {
    if (focusInputSignal && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [focusInputSignal])

  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollButton(!isNearBottom && messages.length > 0)
    }
  }

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }

  const handleSendMessage = async () => {
    if (!isLoggedIn) {
      onLogin()
      return
    }

    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: "user",
      timestamp: new Date(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    if (currentChatId) {
      onUpdateChat(currentChatId, newMessages)
      // Notify parent that first message is sent for this chat with text
   
    }

    const messageContent = inputValue
    if (setUsernewchat && (!currentChatId || /^local-/.test(currentChatId))) {
      setUsernewchat(messageContent)
      console.log("[NEW CHAT][usernewchat]", messageContent)
    }
    setInputValue("")
    setIsLoading(true)

    try {
      let effectiveChatId = currentChatId
      // If this is a local-only chat, promote it using the first message as title
      if ((!effectiveChatId || /^local-/.test(effectiveChatId)) && promoteLocalChat) {
        const title = userMessage.content.trim()
        const serverId = await promoteLocalChat(effectiveChatId || `local-${Date.now()}`, title)
        if (serverId) {
          effectiveChatId = serverId
        }
      }

      // Call backend chat endpoint with form data
      // Only send when chat id is a server numeric id. 'local-*' placeholders should not send.
      const numericChatId = effectiveChatId && /^\d+$/.test(effectiveChatId) ? effectiveChatId : ""
      if (!numericChatId) {
        // Could not resolve a backend chat id yet; avoid sending to prevent duplicate chat creation
        setIsLoading(false)
        return
      }
      // Backend expects application/x-www-form-urlencoded
      const body = new URLSearchParams()
      if (userId) body.set("userID", String(userId))
      if (numericChatId) body.set("chatID", String(numericChatId))
      body.set("text", messageContent)

      console.log("[CHAT SEND] userID=", userId, "chatID=", numericChatId, "text=", messageContent)
      const response = await fetch("https://backend-.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      })
      console.log("[CHAT SEND][RESP] status=", response.status, "ok=", response.ok)
      try {
        const debugPayload = await response.clone().json()
        console.log("[CHAT SEND][RESP JSON]", debugPayload)
      } catch (e) {
        try {
          const debugText = await response.clone().text()
          console.log("[CHAT SEND][RESP TEXT]", debugText)
        } catch {}
      }
      debugger;
      
      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      // Sync messages with backend to ensure persistence (tolerate eventual consistency)
      try {
        const maxAttempts = 3
        const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
        let synced: Message[] | null = null
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const msgRes = await fetch(`https://backend-08yt.onrender.com/getchatmessages?chat_id=${encodeURIComponent(numericChatId)}`)
          if (msgRes.ok) {
            const data: Array<{ sender: string; content: string; timestamp: string }> = await msgRes.json()
            const serverMessages = data.map((m, idx) => ({
              id: String(idx + 1),
              content: m.content,
              role: m.sender === "bot" ? ("assistant" as const) : ("user" as const),
              timestamp: new Date(m.timestamp),
            }))
            // If server already contains the just-sent user message, accept it; else retry once
            const containsUser = serverMessages.some((m) => m.content === userMessage.content)
            if (containsUser || attempt === maxAttempts - 1) {
              synced = serverMessages
              break
            }
          }
          await delay(350)
        }
        if (synced) {
          // Merge if server list is missing the optimistic assistant response
          setMessages(synced)
          if (effectiveChatId) onUpdateChat(effectiveChatId, synced)
        }
      } catch {
        // ignore sync errors; UI already shows user message
      }
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble responding right now. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      }
      const errorMessages = [...newMessages, errorMessage]
      setMessages(errorMessages)
      if (currentChatId) {
        onUpdateChat(currentChatId, errorMessages)
      }
    } finally {
      setIsLoading(false)
    }
  }
  // Focus input when signal changes (e.g., after creating a new chat)
  useEffect(() => {
    if (focusInputSignal && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [focusInputSignal])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (!currentChatId) {
    return (
      <div className="flex-1 flex flex-col bg-background">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="text-foreground">
            <Bars3Icon className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">REC ChatBot</h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <SparklesIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">Welcome to REC ChatBot</h2>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base">
              Start a new conversation or select an existing chat from the sidebar to begin.
            </p>
            {!isLoggedIn && (
              <Button onClick={onLogin} variant="outline">
                Sign in to save your conversations
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background relative h-full">
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="text-foreground">
          <Bars3Icon className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">REC ChatBot</h1>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-2 sm:p-4" ref={scrollAreaRef} onScroll={handleScroll}>
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
            {messagesLoading && (
              <div className="flex gap-2 sm:gap-4 justify-start">
                <div className="bg-muted text-foreground rounded-lg p-3 sm:p-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 sm:gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                      AI
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-3 sm:p-4 ${
                    message.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted text-foreground"
                  }`}
                >
                  <div
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatBasicMarkdown(message.content) }}
                  />
                  <p
                    className={`text-xs mt-2 ${
                      message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {message.role === "user" && (
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      <UserIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 sm:gap-4 justify-start">
                <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">AI</AvatarFallback>
                </Avatar>
                <div className="bg-muted text-foreground rounded-lg p-3 sm:p-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          size="sm"
          className="absolute bottom-20 left-1/2 transform -translate-x-1/2 rounded-full h-10 w-10 p-0 shadow-lg z-10"
          variant="secondary"
        >
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      )}

      {/* Input Area */}
      <div className="border-t border-border p-2 sm:p-4">
        <div className="max-w-3xl mx-auto">
          {!isLoggedIn ? (
            <div className="text-center py-4 sm:py-8">
              <div className="bg-muted rounded-lg p-4 sm:p-6 max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Sign in required</h3>
                <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                  Please sign in to start chatting with the AI assistant.
                </p>
                <Button onClick={onLogin} className="w-full">
                  Sign In
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message REC ChatBot..."
                  className="min-h-[50px] sm:min-h-[60px] max-h-[150px] sm:max-h-[200px] pr-12 resize-none bg-background border-input text-sm sm:text-base"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  size="sm"
                  className="absolute bottom-2 right-2 h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <PaperAirplaneIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                REC ChatBot can make mistakes. Consider checking important information.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
