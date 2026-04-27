"use client"

import { useEffect, useState } from "react"
import { Github, Mail as MailIcon, Twitter, Facebook, type LucideIcon } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/common/button"
import type { OAuthProvider } from "@/lib/types/auth"
import { toast } from "sonner"

interface OAuthButtonsProps {
  redirect?: string
}

const providerIcons: Record<string, LucideIcon> = {
  google: MailIcon,
  github: Github,
  twitter: Twitter,
  facebook: Facebook,
}

const providerNames: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  twitter: 'Twitter',
  facebook: 'Facebook',
}

export function OAuthButtons({ redirect = '/' }: OAuthButtonsProps) {
  const [providers, setProviders] = useState<OAuthProvider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { getOAuthConfig } = useAuth()

  useEffect(() => {
    loadOAuthProviders()
  }, [redirect])

  const loadOAuthProviders = async () => {
    try {
      const config = await getOAuthConfig(redirect)
      setProviders(config)
    } catch (error) {
      console.error('Failed to load OAuth config:', error)
      toast.error('OAuth配置加载失败')
      setProviders([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthLogin = (authUrl: string) => {
    window.location.href = authUrl
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Button variant="outline" className="w-full" disabled>
          加载中...
        </Button>
      </div>
    )
  }

  if (providers.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        没有可用的登录选项
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {providers.map((provider) => {
        const providerType = provider.type.toLowerCase()
        const Icon = providerIcons[providerType] || MailIcon
        const providerName = providerNames[providerType] || provider.type

        return (
          <Button
            key={provider.type}
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthLogin(provider.authUrl)}
          >
            <Icon className="h-4 w-4" />
            <span className="ml-2">使用 {providerName} 登录</span>
          </Button>
        )
      })}
    </div>
  )
}
