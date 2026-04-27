1. 在根目录下执行
```
npm install
```
2. 然后打开Claude code界面
3. 输入：调用planner规划登录全流程
4. 输入：根据生产的md文档，调用generator生成测试文件
5. 测试失败
输入：调用healer智能体，修复当前错误
 
# 快速启动
- 在项目根目录下启动./start.sh
- 同时在项目根目录下启动make tese-docker


# 查看测试报告
open playwright-report/index.html
```

## 使用场景示例

# ⚠️ 前置条件：必须先启动 Docker 环境
# 测试环境依赖 start.sh 启动的服务(MySQL/Redis/API/Web)
./start.sh


## 登录测试说明

本项目支持两种登录测试方式：

### 1. 系统密钥登录 (推荐用于自动化测试)
- 测试文件: `tests/e2e/seed.spec.ts`
- 前置条件: 必须先运行 `./start.sh` 启动 Docker 环境
- 登录方式: 读取 `system-apikey.txt` 中的密钥自动登录
- 优点: 不依赖外部认证服务，适合 CI/CD
- 测试命令: make test-docker

### 2. CAS 企业员工登录
- 测试文件: `tests/e2e/login-flow/cas-login.spec.ts`
- 前置条件: 需要配置 CAS 认证服务器
- 登录方式: 使用企业员工账号和密码
- 适用场景: 本地环境测试
- 配置方式: 需要在根目录下创建一个.env文件，设置BASE_URL=xxx，xxx为你浏览器访问的前端页面地址

### 3. 如何想在宿主机上用headed查看某个测试
```
npx playwright test tests/e2e/settings-flow/en-to-zh-switch.spec.ts --headed
```

- 如果不想配置env文件，又想使用本地环境，可以用BASE_URL配置本地环境
```
BASE_URL=http://xxx npx playwright test tests/e2e/settings-flow/en-to-zh-switch.spec.ts --headed

```
