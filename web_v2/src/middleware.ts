import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

/**
 * 公开路径（无需登录）
 * 这些路径可以在未登录状态下访问
 */
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/api/github/oauth',
]

/**
 * 跳过认证检查的路径模式
 * 包括API、静态资源等
 */
const SKIP_AUTH_PATTERNS = [
  '/_next',
  '/_vercel',
  '/api/',
  '/v1/',
  '/console/',
  '/openapi/',
  /\..+$/, // 包含点的路径（如 favicon.ico）
]

/**
 * 检查路径是否应该跳过认证
 */
function shouldSkipAuth(pathname: string): boolean {
  return SKIP_AUTH_PATTERNS.some(pattern => {
    if (typeof pattern === 'string') {
      return pathname.startsWith(pattern)
    }
    return pattern.test(pathname)
  })
}

/**
 * 认证中间件
 * 在请求到达页面前检查用户登录状态
 *
 * 功能：
 * 1. 跳过API和静态资源的认证检查
 * 2. 公开路径（如登录页）直接通过
 * 3. 受保护路径检查Cookie中的session
 * 4. 未登录用户重定向到登录页
 * 5. 保留原有的国际化处理
 *
 * 防护策略：
 * - 服务端第一道防线（middleware）
 * - 阻止未登录用户访问受保护页面
 * - 减少客户端渲染开销
 */
export default async function middleware(request: NextRequest) {
  const handleI18n = createMiddleware(routing)
  const { pathname, search } = request.nextUrl

  // 1. 跳过API和静态资源
  if (shouldSkipAuth(pathname)) {
    return handleI18n(request)
  }

  // 2. 提取locale后的真实路径
  // pathname可能是: /zh-CN/dashboard, /en-US/settings, 或 /dashboard
  const localeMatch = pathname.match(/^\/(zh-CN|en-US)(.*)$/)
  const locale = localeMatch?.[1]
  const realPath = localeMatch ? localeMatch[2] || '/' : pathname

  // 3. 公开路径直接通过（但仍需处理国际化）
  if (PUBLIC_PATHS.some(path => realPath === path || realPath.startsWith(path + '/'))) {
    return handleI18n(request)
  }

  // 4. 检查session cookie（认证守卫）
  const sessionCookie = request.cookies.get('BELLA-SESSION')

  if (!sessionCookie) {
    const loginPath = locale ? `/${locale}/login` : '/login'
    const redirect = `${pathname}${search}`
    const loginUrl = new URL(loginPath, request.url)
    loginUrl.searchParams.set('redirect', redirect)
    return NextResponse.redirect(loginUrl)
  }

  // 5. 已登录，继续处理国际化
  return handleI18n(request)
}

export const config = {
  matcher: [
    '/((?!api/|_next|_vercel|v1|console|openapi|.*\\..*).*)',
  ]
}
