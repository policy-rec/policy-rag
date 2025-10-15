"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  ArrowLeftIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline"

interface User {
  userid: string
  username: string
  password?: string
  role: "user" | "admin"
  is_active?: boolean
}

interface AdminPageProps {
  users: User[]
  totalChats: number
  currentUser: User | null
  onCreateUser: (userData: Omit<User, "userid">) => void
  onUpdateUser: (userid: string, userData: Partial<User>) => void
  onDeleteUser: (userid: string) => void
  onBackToChat: () => void
  userFrequencyData?: Array<{ name: string; users: number }>
  onToggleActive?: (userid: string, makeActive: boolean) => void
}

const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return "Password must be at least 8 characters long"
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one capital letter"
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Password must contain at least one special character"
  }
  return null
}

export function AdminPage({
  users,
  totalChats,
  currentUser,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onBackToChat,
  userFrequencyData,
  onToggleActive,
}: AdminPageProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "", // Added password confirmation
    role: "user" as "user" | "admin",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({}) // Added error state

  const isEditDirty = !!editingUser && (
    formData.role !== editingUser.role || !!formData.password || !!formData.confirmPassword
  )

  // Upload document (PDF) state
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string>("")
  const [uploadError, setUploadError] = useState<string>("")

  const handleOpenFilePicker = () => {
    setUploadMessage("")
    setUploadError("")
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please select a PDF document.")
      e.target.value = ""
      return
    }

    setIsUploading(true)
    setUploadError("")
    setUploadMessage("")
    try {
      const form = new FormData()
      form.append("file", file)

      const res = await fetch("https://backend-08yt.onrender.com/upload-document", {
        method: "POST",
        body: form,
      })
      if (!res.ok) {
        throw new Error("Upload failed")
      }
      setUploadMessage("Document uploaded successfully.")
    } catch (err) {
      setUploadError("Failed to upload document. Please try again.")
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  // Fallback user frequency if not provided via props
  const fallbackUserFrequency = [
    { name: "Jan", users: 12 },
    { name: "Feb", users: 19 },
    { name: "Mar", users: 15 },
    { name: "Apr", users: 25 },
    { name: "May", users: 22 },
    { name: "Jun", users: 30 },
    { name: "Jul", users: 28 },
    { name: "Aug", users: 35 },
    { name: "Sep", users: 32 },
    { name: "Oct", users: 40 },
    { name: "Nov", users: 38 },
    { name: "Dec", users: 45 },
  ]

  const handleCreateUser = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.username.trim()) {
      newErrors.username = "Username is required"
    }
    if (!formData.password) {
      newErrors.password = "Password is required"
    } else {
      const passwordError = validatePassword(formData.password)
      if (passwordError) {
        newErrors.password = passwordError
      }
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }
    if (users.some((u) => u.username === formData.username.trim())) {
      newErrors.username = "Username already exists"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onCreateUser({
      username: formData.username.trim(),
      password: formData.password,
      role: formData.role,
    })
    setFormData({ username: "", password: "", confirmPassword: "", role: "user" })
    setErrors({})
    setShowCreateDialog(false)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: "",
      confirmPassword: "",
      role: user.role,
    })
    setErrors({})
    setShowEditDialog(true)
  }

  const handleUpdateUser = () => {
    const newErrors: { [key: string]: string } = {}

    // Username is locked in edit and not editable; no need to validate username non-empty here
    if (formData.password) {
      const passwordError = validatePassword(formData.password)
      if (passwordError) {
        newErrors.password = passwordError
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match"
      }
    }
    // Username cannot change in edit; skip duplicate check

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    if (editingUser) {
      // Build payload per requirement:
      // If password unchanged -> send empty password with role
      // If password changed and matches confirm -> send password and role
      const updateData: Partial<User> = {
        role: formData.role,
      }
      updateData.password = formData.password ? formData.password : ""

      onUpdateUser(editingUser.userid, updateData)
      setFormData({ username: "", password: "", confirmPassword: "", role: "user" })
      setErrors({})
      setEditingUser(null)
      setShowEditDialog(false)
    }
  }

  const handleDeleteUser = (userid: string) => {
    if (currentUser && currentUser.userid === userid) {
      alert("You cannot delete your own account!")
      return
    }

    if (confirm("Are you sure you want to delete this user?")) {
      onDeleteUser(userid)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBackToChat} className="flex items-center gap-2">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Chat
        </Button>
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground">
                  {users.filter((u) => u.role === "admin").length} admin(s),{" "}
                  {users.filter((u) => u.role === "user").length} user(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
                <ChatBubbleLeftRightIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalChats}</div>
                <p className="text-xs text-muted-foreground">Active conversations in the system</p>
              </CardContent>
            </Card>
          </div>

          {/* User Frequency Chart */}
          <Card>
            <CardHeader>
              <CardTitle>User Activity Frequency</CardTitle>
              <CardDescription>Monthly user engagement over the past year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userFrequencyData ?? fallbackUserFrequency}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#6b7280" opacity={0.3} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#374151", fontSize: 12 }}
                      axisLine={{ stroke: "#6b7280" }}
                      tickLine={{ stroke: "#6b7280" }}
                      className="dark:[&_.recharts-text]:fill-gray-300"
                    />
                    <YAxis
                      tick={{ fill: "#374151", fontSize: 12 }}
                      axisLine={{ stroke: "#6b7280" }}
                      tickLine={{ stroke: "#6b7280" }}
                      className="dark:[&_.recharts-text]:fill-gray-300"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        color: "#111827",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                      }}
                      labelStyle={{ color: "#111827" }}
                    />
                    <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Document Upload */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm font-medium">Upload Document</CardTitle>
                <CardDescription>Upload a PDF document to the backend</CardDescription>
              </div>
              <Button onClick={handleOpenFilePicker} disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload PDF"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFileSelected}
              />
            </CardHeader>
            <CardContent>
              {uploadMessage && <p className="text-sm text-green-600">{uploadMessage}</p>}
              {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
              {!uploadMessage && !uploadError && (
                <p className="text-xs text-muted-foreground">Only PDF files are supported.</p>
              )}
            </CardContent>
          </Card>

          {/* User Management Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage all users in the system</CardDescription>
                </div>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <PlusIcon className="h-4 w-4" />
                      Create User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new user to the system with their credentials and role.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <Label htmlFor="username" className="text-right">
                          Username
                        </Label>
                        <div>
                          <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className={errors.username ? "border border-red-500" : "border"}
                          />
                          {errors.username && <p className="text-sm text-red-500 mt-1">{errors.username}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <Label htmlFor="password" className="text-right">
                          Password
                        </Label>
                        <div>
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className={errors.password ? "border border-red-500" : "border"}
                          />
                          {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <Label htmlFor="confirmPassword" className="text-right">
                          Confirm Password
                        </Label>
                        <div>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className={`${errors.confirmPassword ? "border border-red-500" : "border"}`}
                        />
                        {errors.confirmPassword && (
                            <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>
                        )}
                      </div>
                      </div>
                      <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                        <Label htmlFor="role" className="text-right">
                          Role
                        </Label>
                        <div>
                          <Select
                            value={formData.role}
                            onValueChange={(value: "user" | "admin") => setFormData({ ...formData, role: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateUser}>Create User</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.userid}>
                      <TableCell className="font-mono text-sm">{user.userid}</TableCell>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === "admin"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                          }`}
                        >
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="h-8 w-8 p-0"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleActive && onToggleActive(user.userid, !(user.is_active ?? true))}
                            className={`h-8 px-2 text-xs ${
                              user.is_active ? "text-amber-600 hover:text-amber-700" : "text-emerald-600 hover:text-emerald-700"
                            }`}
                          >
                            {user.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.userid)}
                            className={`h-8 w-8 p-0 ${
                              (!!currentUser && currentUser.userid === user.userid) || user.role === "admin"
                                ? "text-muted-foreground cursor-not-allowed"
                                : "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            }`}
                            disabled={(!!currentUser && currentUser.userid === user.userid) || user.role === "admin"}
                            title={user.role === "admin" ? "Admin users cannot be deleted" : ""}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and role.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
              <Label htmlFor="edit-username" className="text-right">
                Username
              </Label>
              <div>
                <Input
                  id="edit-username"
                  value={formData.username}
                  disabled
                  className={errors.username ? "border border-red-500" : "border"}
                />
                {errors.username && <p className="text-sm text-red-500 mt-1">{errors.username}</p>}
              </div>
            </div>
            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
              <Label htmlFor="edit-password" className="text-right">
                New Password
              </Label>
              <div className="w-full">
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Leave empty to keep current password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full ${errors.password ? "border border-red-500" : "border"}`}
                />
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
              </div>
            </div>
            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
              <Label htmlFor="edit-confirmPassword" className="text-right">
                Confirm Password
              </Label>
              <div className="w-full">
              <Input
                id="edit-confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full ${errors.confirmPassword ? "border border-red-500" : "border"}`}
              />
              {errors.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>
              )}
            </div>
            </div>
            <div className="grid grid-cols-[150px_1fr] items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                Role
              </Label>
              <div>
                <Select
                  value={formData.role}
                  onValueChange={(value: "user" | "admin") => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateUser} disabled={!isEditDirty}>
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
