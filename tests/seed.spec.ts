/**
 * Seed 测试文件 - 统一登录并保存认证状态
 *
 * 职责:
 * - 使用系统密钥完成登录流程
 * - 保存登录后的认证状态(cookies/localStorage)到文件
 * - 为其他测试用例提供可复用的登录态
 *
 * 设计说明:
 * 1. 执行系统密钥登录流程
 * 2. 登录成功后使用 page.context().storageState() 保存认证状态
 * 3. 将状态保存到 .auth/user.json 文件
 * 4. 其他测试用例通过配置 storageState 加载此文件,跳过登录
 * 5. 使用 test.describe.serial 确保 seed 测试优先执行
 *
 * 避免 re-render:
 * - 本文件不涉及 React 组件,无 re-render 问题
 */

import { test, expect } from '@playwright/test';
import { getSystemApiKey } from './utils/read-system-apikey';
import * as fs from 'fs';
import * as path from 'path';

// 定义认证状态存储路径
const authDir = path.join(__dirname, '.auth');
const authFile = path.join(authDir, 'user.json');

test.describe.serial('登录态初始化', () => {
  test.beforeAll(() => {
    // 确保 .auth 目录存在
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
  });

  test('系统密钥登录并保存认证状态', async ({ page }) => {
    // 读取系统密钥
    const systemApiKey = getSystemApiKey();

    // 访问登录页(不带语言前缀,避免 CAS 重定向)
    await page.goto('/');

    // 在密钥输入框中输入系统密钥
    const apikeyInput = page.getByPlaceholder('请输入您的密钥');
    await apikeyInput.fill(systemApiKey);

    // 验证密钥已输入
    await expect(apikeyInput).toHaveValue(systemApiKey);

    // 点击登录按钮
    await page.getByRole('button', { name: '登录' }).click();

    // 验证跳转到 overview 界面
    await expect(page).toHaveURL(/\/overview/);

    // 验证登录成功 - 检查侧边栏是否显示
    await expect(page.getByRole('button', { name: /设置|Settings/ })).toBeVisible();

    // 保存认证状态到文件
    await page.context().storageState({ path: authFile });

    console.log(`✅ 认证状态已保存到: ${authFile}`);
  });
});
