import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getBackendOrigin } from '@/lib/config/backend';
import { mockSecretLogin } from '@/mocks/login/authData';

/**
 * API: 密钥登录
 * POST /api/openapi/login
 *
 * 请求体:
 * {
 *   "secret": "用户密钥"
 * }
 *
 * 返回:
 * - 成功: { code: 200, data: { userId, userName, ... }, message: "登录成功" }
 * - 失败: { code: 401, data: null, message: "错误信息" }
 *
 * Mock模式:
 * - 设置 NEXT_PUBLIC_USE_MOCK=true 启用
 * - 有效的测试密钥: test-secret-123, demo-key-456, mock-password
 */
export async function POST(request: NextRequest) {
  // Mock 模式
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  if (useMock) {
    try {
      const body = await request.json();
      const { secret } = body;

      console.log('[Mock] POST /api/openapi/login - Secret:', secret);

      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockUser = mockSecretLogin(secret);

      if (mockUser) {
        const response = NextResponse.json({
          code: 200,
          data: mockUser,
          message: '登录成功',
        }, { status: 200 });
        response.cookies.set('BELLA-SESSION', 'mock-session-token-' + Date.now(), {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        });
        return response;
      }

      return NextResponse.json({
        code: 401,
        data: null,
        message: '密钥无效，请重试',
      }, { status: 401 });
    } catch (error) {
      console.error('[Mock] POST /api/openapi/login Error:', error);
      return NextResponse.json(
        {
          code: 500,
          data: null,
          message: 'Mock 登录失败',
        },
        { status: 500 }
      );
    }
  }

  // 真实后端模式
  try {
    // 解析请求体
    const body = await request.json();

    // 构造后端 API URL
    const backendUrl = `${getBackendOrigin()}/openapi/login`;

    // 转发 Cookie
    const cookie = request.headers.get('cookie') || '';

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BELLA-CONSOLE': 'true',
        'Cookie': cookie,
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const data = await response.json();

    // 转发 Set-Cookie 头（登录成功后后端会设置 Session Cookie）
    const setCookie = response.headers.get('set-cookie');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (setCookie) {
      headers['Set-Cookie'] = setCookie;
    }

    return NextResponse.json(data, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('[Backend POST /openapi/login Error]', error);
    return NextResponse.json(
      {
        code: 500,
        data: null,
        message: '后端 API 调用失败',
      },
      { status: 500 }
    );
  }
}
