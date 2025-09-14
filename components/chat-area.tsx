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
}

export function ChatArea({ currentChatId, chats, isLoggedIn, onLogin, onToggleSidebar, onUpdateChat }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (currentChatId) {
      const currentChat = chats.find((chat) => chat.id === currentChatId)
      if (currentChat && currentChat.conversations) {
        setMessages(currentChat.conversations)
      } else {
        // Fallback to default message if no conversations
        setMessages([
          {
            id: "1",
            content: "Hello! How can I help you today?",
            role: "assistant",
            timestamp: new Date(Date.now() - 1000 * 60 * 5),
          },
        ])
      }
    } else {
      setMessages([])
    }
  }, [currentChatId, chats])

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
    }

    const messageContent = inputValue
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageContent,
          chatId: currentChatId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.message,
        role: "assistant",
        timestamp: new Date(),
      }

      const finalMessages = [...newMessages, assistantMessage]
      setMessages(finalMessages)
      if (currentChatId) {
        onUpdateChat(currentChatId, finalMessages)
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
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
