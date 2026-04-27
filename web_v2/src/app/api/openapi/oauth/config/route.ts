import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getBackendOrigin } from '@/lib/config/backend';
import { getOAuthConfigByScenario, currentScenario } from '@/mocks/login/authData';
import type { OAuthProvider } from '@/lib/types/auth';

function getDisplayName(name: string): string {
  const normalized = name.toLowerCase();
  switch (normalized) {
    case 'github':
      return 'GitHub';
    case 'google':
      return 'Google';
    case 'twitter':
      return 'Twitter';
    case 'facebook':
      return 'Facebook';
    default:
      return name;
  }
}

function normalizeProviders(input: unknown): OAuthProvider[] {
  if (Array.isArray(input)) {
    return input
      .map((provider: any) => {
        const name = provider?.name || provider?.type;
        const authUrl = provider?.authUrl;

        if (!name || !authUrl) {
          return null;
        }

        return {
          name,
          displayName: provider?.displayName || getDisplayName(name),
          authUrl,
        } satisfies OAuthProvider;
      })
      .filter((provider): provider is OAuthProvider => provider !== null);
  }

  if (input && typeof input === 'object' && Array.isArray((input as any).providers)) {
    return normalizeProviders((input as any).providers);
  }

  return [];
}

/**
 * API: 获取 OAuth 配置
 * GET /api/openapi/oauth/config
 *
 * 查询参数:
 * - redirect: 登录成功后的跳转地址（可选）
 *
 * 返回:
 * {
 *   "providers": [
 *     {
 *       "name": "github",
 *       "displayName": "GitHub",
 *       "authUrl": "https://github.com/login/oauth/authorize?..."
 *     }
 *   ]
 * }
 *
 * 用途:
 * - 登录页面加载时获取可用的 OAuth 提供商
 *
 * Mock模式:
 * - 设置 NEXT_PUBLIC_USE_MOCK=true 启用
 * - 通过 authData.ts 中的 currentScenario 切换场景
 */
export async function GET(request: NextRequest) {
  // Mock 模式
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  if (useMock) {
    console.log('[Mock] GET /api/openapi/oauth/config - Scenario:', currentScenario);
    const mockData = getOAuthConfigByScenario(currentScenario);

    // 模拟网络延迟（可选）
    await new Promise(resolve => setTimeout(resolve, 300));

    return NextResponse.json({ providers: normalizeProviders(mockData) }, { status: 200 });
  }

  // 真实后端模式
  try {
    // 构造后端 API URL
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const backendUrl = `${getBackendOrigin()}/openapi/oauth/config${queryString ? `?${queryString}` : ''}`;

    // 转发 Cookie
    const cookie = request.headers.get('cookie') || '';

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-BELLA-CONSOLE': 'true',
        'Cookie': cookie,
      },
      credentials: 'include',
    });

    const data = await response.json();

    return NextResponse.json(
      { providers: normalizeProviders(data) },
      {
        status: response.status,
      }
    );
  } catch (error) {
    console.error('[Backend GET /openapi/oauth/config Error]', error);
    return NextResponse.json(
      {
        code: 500,
        message: '后端 API 调用失败',
        data: null,
        stacktrace: null,
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
