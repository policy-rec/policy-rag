"use client"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  PlusIcon,
  ChatBubbleLeftIcon,
  UserIcon,
  MoonIcon,
  SunIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  CogIcon,
} from "@heroicons/react/24/outline"
import { useTheme } from "next-themes"

interface Chat {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
  conversations?: Array<{
    id: string
    content: string
    role: "user" | "assistant"
    timestamp: Date
  }>
}

interface User {
  userid: string
  username: string
  role: "user" | "admin"
  password?: string
}

interface ChatSidebarProps {
  chats: Chat[]
  currentChatId: string | null
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  onLogin: () => void
  onSignOut: () => void
  onAdminPage: () => void
  isLoggedIn: boolean
  user: User | null
  isSidebarOpen: boolean
  onToggleSidebar: () => void
}

export function ChatSidebar({
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onLogin,
  onSignOut,
  onAdminPage,
  isLoggedIn,
  user,
  isSidebarOpen,
  onToggleSidebar,
}: ChatSidebarProps) {
  const { theme, setTheme } = useTheme()

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggleSidebar} />}

      <div
        className={`
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0 lg:relative fixed left-0 top-0 z-50
        w-80 sm:w-72 lg:w-80 bg-sidebar border-r border-sidebar-border 
        transition-transform duration-300 ease-in-out h-screen flex flex-col
      `}
      >
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-sidebar-foreground">REC ChatBot</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-sidebar-foreground hover:bg-sidebar-accent"
              >
                {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              </Button>
              {!isLoggedIn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogin}
                  className="text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <UserIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <Button
            onClick={onNewChat}
            disabled={!isLoggedIn}
            className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New chat
          </Button>
        </div>

        {isLoggedIn && (
          <ScrollArea className="flex-1 overflow-hidden">
            <div className="p-2">
              {chats.map((chat) => (
                <Button
                  key={chat.id}
                  variant="ghost"
                  onClick={() => onSelectChat(chat.id)}
                  className={`w-full p-3 mb-1 text-left justify-start h-auto hover:bg-sidebar-accent ${
                    currentChatId === chat.id ? "bg-sidebar-accent" : ""
                  }`}
                >
                  <div className="flex items-start gap-3 w-full">
                    <ChatBubbleLeftIcon className="h-5 w-5 text-sidebar-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-sidebar-foreground truncate text-sm">{chat.title}</h3>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {formatTime(chat.timestamp)}
                        </span>
                      </div>
                      {chat.lastMessage && <p className="text-xs text-muted-foreground truncate">{chat.lastMessage}</p>}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}

        {isLoggedIn && user && (
          <div className="p-4 border-t border-sidebar-border flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full p-0 h-auto justify-start">
                  <div className="flex items-center gap-3 w-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-sidebar-foreground">{user.username}</p>
                      <p className="text-xs text-muted-foreground">Free plan</p>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={onAdminPage}>
                    <CogIcon className="h-4 w-4 mr-2" />
                    Admin Page
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onSignOut} className="text-red-600 focus:text-red-600">
                  <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </>
  )
}
