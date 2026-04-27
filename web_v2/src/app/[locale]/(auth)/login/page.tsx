"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { LoginLayout } from "./components/login-layout"
import { LoginForm } from "./components/login-form"
import { OAuthButtons } from "./components/oauth-buttons"
import { Separator } from "@/components/common/separator"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading, isInitialized } = useAuth()
  const redirect = searchParams.get('redirect') || '/'

  useEffect(() => {
    if (user && !isLoading) {
      router.push(redirect)
    }
  }, [user, isLoading, redirect, router])

  if (!isInitialized || isLoading) {
    return (
      <LoginLayout>
        <div className="flex items-center justify-center">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </LoginLayout>
    )
  }

  if (user) {
    return null
  }

  return (
    <LoginLayout>
      <div className="space-y-6 w-full max-w-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            登录 Bella OpenAPI
          </h1>
          <p className="text-sm text-muted-foreground">
            选择一种方式登录您的账户
          </p>
        </div>

        <OAuthButtons redirect={redirect} />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              或使用密钥登录
            </span>
          </div>
        </div>

        <LoginForm redirect={redirect} />
      </div>
    </LoginLayout>
  )
}
