"use client"

import { toast } from "sonner"

interface ToastOptions {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const toastFn = ({ title, description, variant = "default" }: ToastOptions) => {
    const message = title || "Notification"
    const desc = description
    
    if (variant === "destructive") {
      toast.error(message, { description: desc })
    } else {
      toast.success(message, { description: desc })
    }
  }

  return { toast: toastFn }
}