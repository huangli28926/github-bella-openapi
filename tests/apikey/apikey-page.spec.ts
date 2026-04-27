import { expect, test, type Page, type Route } from '@playwright/test'

type ApiKeyItem = {
  code: string
  akDisplay: string
  name: string
  serviceId: string
  monthQuota: number
  safetyLevel: number
  remark: string
}

type PageResponse = {
  data: ApiKeyItem[]
  has_more: boolean
}

const mockUser = {
  userId: 9527,
  userName: 'Playwright User',
  email: 'playwright@example.com',
  tenantId: null,
  spaceCode: 'space-playwright',
  source: 'cas',
  sourceId: '9527',
  managerAk: 'manager-ak',
  optionalInfo: {},
}

const firstPageItems: ApiKeyItem[] = [
  {
    code: 'ak-code-001',
    akDisplay: 'sk-live-001',
    name: '主密钥',
    serviceId: 'svc-core',
    monthQuota: 50,
    safetyLevel: 20,
    remark: '主环境',
  },
  {
    code: 'ak-code-002',
    akDisplay: 'sk-live-002',
    name: '备用密钥',
    serviceId: 'svc-backup',
    monthQuota: 80,
    safetyLevel: 30,
    remark: '备份环境',
  },
]

const renamedFirstPageItems: ApiKeyItem[] = [
  {
    ...firstPageItems[0],
    name: '已更新名称',
  },
  firstPageItems[1],
]

const balances = {
  'ak-code-001': { akCode: 'ak-code-001', month: '2026-04', cost: 12, quota: 50, balance: 38 },
  'ak-code-002': { akCode: 'ak-code-002', month: '2026-04', cost: 7, quota: 80, balance: 73 },
}

function pagePayload(items: ApiKeyItem[], hasMore = false): PageResponse {
  return { data: items, has_more: hasMore }
}

async function fulfillJson(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: 200, data }),
  })
}

async function setupCommonMocks(page: Page, options?: {
  pageHandler?: (searchParam: string, pageNumber: number) => PageResponse
  applyKey?: string
  resetKey?: string
}) {
  const pageHandler = options?.pageHandler ?? ((searchParam: string, pageNumber: number) => {
    if (searchParam === 'missing') {
      return pagePayload([], false)
    }

    if (pageNumber === 2) {
      return pagePayload([
        {
          code: 'ak-code-003',
          akDisplay: 'sk-live-003',
          name: '第二页密钥',
          serviceId: 'svc-page-2',
          monthQuota: 100,
          safetyLevel: 40,
          remark: '第二页',
        },
      ], false)
    }

    return pagePayload(firstPageItems, true)
  })

  await page.route('**/openapi/userInfo', async (route) => {
    await fulfillJson(route, mockUser)
  })

  await page.route('**/console/apikey/page**', async (route) => {
    const url = new URL(route.request().url())
    const searchParam = url.searchParams.get('searchParam') ?? ''
    const pageNumber = Number(url.searchParams.get('page') ?? '1')
    await fulfillJson(route, pageHandler(searchParam, pageNumber))
  })

  await page.route('**/console/apikey/balance/*', async (route) => {
    const akCode = route.request().url().split('/').pop() ?? ''
    await fulfillJson(route, balances[akCode as keyof typeof balances] ?? {
      akCode,
      month: '2026-04',
      cost: 0,
      quota: 0,
      balance: 0,
    })
  })

  await page.route('**/console/apikey/apply', async (route) => {
    await fulfillJson(route, options?.applyKey ?? 'sk-created-001')
  })

  await page.route('**/console/apikey/reset', async (route) => {
    await fulfillJson(route, options?.resetKey ?? 'sk-reset-001')
  })

  await page.route('**/console/apikey/inactivate', async (route) => {
    await fulfillJson(route, true)
  })

  await page.route('**/console/apikey/rename', async (route) => {
    await fulfillJson(route, true)
  })

  await page.route('**/console/apikey/bindService', async (route) => {
    await fulfillJson(route, true)
  })
}

async function gotoApiKeyPage(page: Page) {
  await page.goto('/zh-CN/apikey')
  await expect(page.getByRole('heading', { name: '我的密钥' })).toBeVisible()
}

test.describe('apikey page', () => {
  test('renders page shell and requests first page list', async ({ page }) => {
    const pageRequests: string[] = []
    const balanceRequests: string[] = []

    await page.route('**/openapi/userInfo', async (route) => {
      await fulfillJson(route, mockUser)
    })

    await page.route('**/console/apikey/page**', async (route) => {
      pageRequests.push(route.request().url())
      await fulfillJson(route, pagePayload(firstPageItems, true))
    })

    await page.route('**/console/apikey/balance/*', async (route) => {
      balanceRequests.push(route.request().url())
      const akCode = route.request().url().split('/').pop() ?? ''
      await fulfillJson(route, balances[akCode as keyof typeof balances])
    })

    await gotoApiKeyPage(page)

    await expect(page.getByText('管理您直接持有的 API 密钥，设置额度和安全等级')).toBeVisible()
    await expect(page.getByRole('button', { name: '创建新密钥' })).toBeVisible()
    await expect(page.getByPlaceholder('搜索 API Key...')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '密钥代码' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '名称' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '服务名' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '月额度配置' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '安全等级' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '月额度使用' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '备注' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '操作' })).toBeVisible()
    await expect(page.getByText('主密钥')).toBeVisible()
    await expect(page.getByText('备用密钥')).toBeVisible()

    expect(pageRequests).toHaveLength(1)
    const firstRequest = new URL(pageRequests[0])
    expect(firstRequest.searchParams.get('page')).toBe('1')
    expect(firstRequest.searchParams.get('ownerCode')).toBe(String(mockUser.userId))
    expect(firstRequest.searchParams.get('searchParam')).toBe('')
    expect(balanceRequests).toHaveLength(2)
  })

  test('searches with debounce and clears search', async ({ page }) => {
    const requests: Array<{ page: string | null; searchParam: string | null }> = []

    await setupCommonMocks(page, {
      pageHandler: (searchParam, pageNumber) => {
        requests.push({ page: String(pageNumber), searchParam })
        if (searchParam === 'missing') {
          return pagePayload([], false)
        }
        return pagePayload(firstPageItems, pageNumber === 1)
      },
    })

    await gotoApiKeyPage(page)

    const searchInput = page.getByPlaceholder('搜索 API Key...')
    await searchInput.fill('missing')
    await expect(page.locator('svg.animate-spin')).toBeVisible()
    await page.waitForTimeout(650)

    await expect(page.getByText('未找到匹配').filter({ hasText: 'missing' })).toBeVisible()
    await expect(page.getByText('请尝试其他关键词或清空搜索查看所有数据')).toBeVisible()
    expect(requests.at(-1)).toEqual({ page: '1', searchParam: 'missing' })

    await page.getByRole('button').filter({ has: page.locator('svg.lucide-x') }).click()
    await page.waitForTimeout(650)

    await expect(searchInput).toHaveValue('')
    await expect(page.getByText('主密钥')).toBeVisible()
    expect(requests.at(-1)).toEqual({ page: '1', searchParam: '' })
  })

  test('creates a new api key and refreshes first page after closing dialog', async ({ page }) => {
    const applyPayloads: any[] = []
    const pageRequests: Array<{ page: string | null; searchParam: string | null }> = []

    await page.route('**/openapi/userInfo', async (route) => {
      await fulfillJson(route, mockUser)
    })

    await page.route('**/console/apikey/page**', async (route) => {
      const url = new URL(route.request().url())
      pageRequests.push({
        page: url.searchParams.get('page'),
        searchParam: url.searchParams.get('searchParam'),
      })
      await fulfillJson(route, pagePayload(firstPageItems, true))
    })

    await page.route('**/console/apikey/balance/*', async (route) => {
      const akCode = route.request().url().split('/').pop() ?? ''
      await fulfillJson(route, balances[akCode as keyof typeof balances] ?? balances['ak-code-001'])
    })

    await page.route('**/console/apikey/apply', async (route) => {
      applyPayloads.push(route.request().postDataJSON())
      await fulfillJson(route, 'sk-created-xyz')
    })

    await page.route('**/console/apikey/reset', async (route) => {
      await fulfillJson(route, 'sk-reset-001')
    })

    await page.route('**/console/apikey/inactivate', async (route) => {
      await fulfillJson(route, true)
    })

    await page.route('**/console/apikey/rename', async (route) => {
      await fulfillJson(route, true)
    })

    await page.route('**/console/apikey/bindService', async (route) => {
      await fulfillJson(route, true)
    })

    await gotoApiKeyPage(page)
    await page.getByRole('button', { name: '创建新密钥' }).click()

    await expect(page.getByRole('heading', { name: 'API Key 创建成功' })).toBeVisible()
    await expect(page.getByText('sk-created-xyz')).toBeVisible()
    await expect(page.getByRole('button', { name: '复制 API Key' })).toBeVisible()
    await expect(page.getByRole('button', { name: '确认并关闭' })).toBeVisible()
    expect(applyPayloads).toEqual([
      {
        ownerType: 'person',
        ownerCode: String(mockUser.userId),
        ownerName: mockUser.userName,
        monthQuota: 50,
      },
    ])

    await page.getByRole('button', { name: '确认并关闭' }).click()
    await expect(page.getByRole('heading', { name: 'API Key 创建成功' })).not.toBeVisible()
    expect(pageRequests.at(-1)).toEqual({ page: '1', searchParam: '' })
  })

  test('shows row actions and resets api key', async ({ page }) => {
    const resetPayloads: any[] = []

    await setupCommonMocks(page, {
      resetKey: 'sk-reset-new-key',
    })

    await page.route('**/console/apikey/reset', async (route) => {
      resetPayloads.push(route.request().postDataJSON())
      await fulfillJson(route, 'sk-reset-new-key')
    })

    await gotoApiKeyPage(page)

    await page.getByRole('row', { name: /主密钥/ }).getByRole('button').last().click()
    await expect(page.getByText('管理子AK')).toBeVisible()
    await expect(page.getByText('重置')).toBeVisible()
    await expect(page.getByText('转交')).toBeVisible()
    await expect(page.getByText('复制ak code')).toBeVisible()
    await expect(page.getByText('删除')).toBeVisible()

    await page.getByText('重置').click()
    await expect(page.getByRole('heading', { name: '重置 API Key' })).toBeVisible()
    await page.getByRole('button', { name: '确认' }).click()

    await expect(page.getByRole('heading', { name: 'API Key 创建成功' })).toBeVisible()
    await expect(page.getByText('sk-reset-new-key')).toBeVisible()
    expect(resetPayloads).toEqual([{ code: 'ak-code-001' }])
  })

  test('deletes api key and refreshes list', async ({ page }) => {
    const deletePayloads: any[] = []
    let deleted = false

    await setupCommonMocks(page, {
      pageHandler: () => (deleted ? pagePayload([firstPageItems[1]], false) : pagePayload(firstPageItems, false)),
    })

    await page.route('**/console/apikey/inactivate', async (route) => {
      deletePayloads.push(route.request().postDataJSON())
      deleted = true
      await fulfillJson(route, true)
    })

    await gotoApiKeyPage(page)

    await page.getByRole('row', { name: /主密钥/ }).getByRole('button').last().click()
    await page.getByText('删除').click()
    await expect(page.getByRole('heading', { name: '删除 API Key' })).toBeVisible()
    await page.getByRole('button', { name: '确认' }).click()

    await expect(page.getByText('主密钥')).not.toBeVisible()
    await expect(page.getByText('备用密钥')).toBeVisible()
    expect(deletePayloads).toEqual([{ code: 'ak-code-001' }])
  })

  test('edits api key name and refreshes list', async ({ page }) => {
    const renamePayloads: any[] = []
    let renamed = false

    await setupCommonMocks(page, {
      pageHandler: () => (renamed ? pagePayload(renamedFirstPageItems, false) : pagePayload(firstPageItems, false)),
    })

    await page.route('**/console/apikey/rename', async (route) => {
      renamePayloads.push(route.request().postDataJSON())
      renamed = true
      await fulfillJson(route, true)
    })

    await gotoApiKeyPage(page)

    await page.getByRole('row', { name: /主密钥/ }).getByRole('button').nth(0).click()
    await expect(page.getByRole('heading', { name: '修改名称' })).toBeVisible()

    const input = page.getByPlaceholder('请输入名称')
    await input.fill('已更新名称')
    await input.press('Enter')

    await expect(page.getByRole('heading', { name: '修改名称' })).not.toBeVisible()
    await expect(page.getByText('已更新名称')).toBeVisible()
    expect(renamePayloads).toEqual([{ code: 'ak-code-001', name: '已更新名称' }])
  })
})
