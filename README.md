# STT Demo

这是一个可本地启动的实时语音转写演示项目，包含可选 SSO 登录、无 SSO guest 模式、Web 多人语聊房、实时字幕、翻译字幕、移动端扫码字幕查看和 VTT 字幕下载能力。

## 快速启动

1. 安装 Bun。建议使用 Bun 1.2+ 和 Node.js 22+。
2. 安装依赖：

```bash
bun install
```

3. 创建本地环境变量文件：

```bash
cp env.example .env
```

4. 按下面的参数说明填写 `.env`。
5. 启动开发服务：

```bash
bun run dev
```

默认访问地址是 <http://localhost:3000>。

## 常用命令

```bash
bun run dev      # 本地开发
bun run build    # 生产构建
bun run preview  # 预览生产构建
```

## Guest Mode 必填参数

SSO 不是必需项。先填写这些参数，项目即可用本地 guest session 完成入房和 STT 启动。

```dotenv
APP_ENV="dev"
AUTH_SESSION_SECRET="替换为本地 session 签名密钥，建议至少 32 位随机字符串"
VITE_LOCALE="zh-CN"

SSO_BASE_URL=""
SSO_CLIENT_ID=""
SSO_CLIENT_SECRET=""
SSO_SCOPE=""
SSO_OPEN_API_BASE_URL=""

VITE_AGORA_RTC_APP_ID="替换为 RTC App ID，RTC 和 STT 都使用它"
AGORA_RTC_APP_CERTIFICATE="替换为 RTC App Certificate；如果项目启用无证书模式可留空"
VITE_AGORA_RTM_APP_ID="替换为 RTM App ID；如果 RTM 和 RTC 使用同一个项目，可留空"
AGORA_RTM_APP_CERTIFICATE="替换为 RTM App Certificate；如果 RTM 和 RTC 使用同一个项目，可留空"

AGORA_STT_REST_BASE_URL="https://api.sd-rtn.com/cn/api/speech-to-text/v1"
MOBILE_VIEWER_TOKEN_SECRET="替换为移动端 viewerToken 签名密钥"
```

## 可选 SSO 参数

如需接入 SSO，需要完整配置下面这些 provider 参数；只配置其中一部分会进入配置错误状态。

```dotenv
VITE_SSO_REDIRECT_URI="http://localhost:3000/api/sso/callback"
SSO_BASE_URL="https://sso.shengwang.cn"
SSO_CLIENT_ID="console"
SSO_CLIENT_SECRET="替换为 SSO client secret"
SSO_SCOPE="basic_info"
SSO_OPEN_API_BASE_URL="https://sso-open.shengwang.cn"
```

## 参数说明

### 基础运行参数

| 参数 | 说明 |
| --- | --- |
| `APP_ENV` | 当前环境名。推荐本地填 `dev`，可选值通常是 `dev`、`staging`、`preprod`、`prod`。它会影响本地登录 cookie 名称。 |
| `ENVIRONMENT` | 可选环境标记。没有特殊需求可留空。 |
| `HOST` | 可选监听地址。本地通常不填。 |
| `PORT` | 可选监听端口。开发服务默认使用 `3000`。 |
| `AUTH_SESSION_SECRET` | 本地 session JWT 签名密钥。SSO 和 guest mode 都必须配置，建议使用随机长字符串。 |

### 认证模式

| 配置状态 | 行为 |
| --- | --- |
| SSO provider 变量全部为空或未配置 | 进入 guest mode，`/api/auth/session` 创建本地 guest session。 |
| SSO provider 变量全部配置 | 进入 SSO mode。 |
| SSO provider 变量只配置一部分 | 返回配置错误，避免误放开访问。 |

### SSO 登录参数

| 参数 | 说明 |
| --- | --- |
| `VITE_SSO_REDIRECT_URI` | SSO 回调地址。本地一般填 `http://localhost:3000/api/sso/callback`，必须和 SSO 后台配置一致。 |
| `SSO_BASE_URL` | SSO 登录服务地址。中国区通常是 `https://sso.shengwang.cn`，Global 通常是 `https://sso2.agora.io`。 |
| `SSO_CLIENT_ID` | SSO client id。 |
| `SSO_CLIENT_SECRET` | SSO client secret。只放在服务端环境变量里，不要提交到 Git。 |
| `SSO_SCOPE` | SSO scope。本项目通常使用 `basic_info`。 |
| `SSO_OPEN_API_BASE_URL` | SSO OpenAPI 地址。中国区通常是 `https://sso-open.shengwang.cn`，Global 通常是 `https://sso-open.agora.io`。 |
| `SSO_COMPANY_ID_WHITELIST_ENABLED` | 是否启用公司 ID 白名单。默认建议填 `false`。 |
| `SSO_COMPANY_ID_WHITELIST` | 公司 ID 白名单，启用时填写逗号分隔的 company id。 |

### 产品语言参数

| 参数 | 说明 |
| --- | --- |
| `VITE_LOCALE` | 首次访问默认产品语言。支持 `zh-CN` 和 `en-US`。用户切换语言后会优先使用浏览器 cookie。 |

### Agora RTC/RTM 参数

| 参数 | 说明 |
| --- | --- |
| `VITE_AGORA_RTC_APP_ID` | RTC 和 STT 使用的 App ID。新接入优先填写这个参数。 |
| `AGORA_RTC_APP_CERTIFICATE` | RTC 和 STT 使用的证书。留空表示 RTC/STT 链路使用静态 App ID 模式。 |
| `VITE_AGORA_RTM_APP_ID` | RTM 使用的 App ID。如果 RTM 和 RTC 使用同一个 Agora 项目，可以留空，系统会回退到 `VITE_AGORA_RTC_APP_ID`。 |
| `AGORA_RTM_APP_CERTIFICATE` | RTM 使用的证书。如果 RTM 和 RTC 使用同一个 Agora 项目，可以留空，系统会回退到 `AGORA_RTC_APP_CERTIFICATE`。 |

### STT 参数

| 参数 | 说明 |
| --- | --- |
| `AGORA_STT_REST_BASE_URL` | STT RESTful API 地址。中国区通常使用 `https://api.sd-rtn.com/cn/api/speech-to-text/v1`。 |
| `AGORA_STT_SUB_BOT_UID` | STT 订阅 bot UID，默认可填 `1000`。 |
| `AGORA_STT_PUB_BOT_UID` | STT 发布 bot UID，默认可填 `2000`。 |
| `AGORA_STT_MAX_IDLE_TIME_SECONDS` | STT 最大空闲时间，默认可填 `600`。 |
| `AGORA_STT_KEYWORDS` | 识别热词，多个词用逗号分隔，例如 `声网,Agora,实时互动`。 |
| `AGORA_STT_FORCE_TRANSLATE_INTERVAL_SECONDS` | 强制翻译间隔，默认可填 `2`。 |
| `AGORA_STT_BASIC_AUTH` | 可选。服务方提供完整 Basic Auth 时填写，例如 `Basic base64-key-secret`。填写后优先级高于 key/secret 组合。 |
| `AGORA_CUSTOMER_KEY` | 可选 STT REST Basic Auth key。 |
| `AGORA_CUSTOMER_SECRET` | 可选 STT REST Basic Auth secret。 |
| `AGORA_STT_GRAPH_ID` | 可选 STT graph id，没有专项配置可留空。 |
| `VITE_STT_VENDOR_OPTIONS` | 可选开发模式 STT vendor 列表，例如 `default,aliyun`。没有专项配置可留空。 |

### 字幕文件存储参数

这些参数用于服务端读取 STT 生成的 VTT 字幕文件。如果不使用 VTT 下载能力，可以先留空。

| 参数 | 说明 |
| --- | --- |
| `AGORA_STT_CAPTION_PROVIDER` | 字幕存储提供商，例如 `aliyun` 或 S3 兼容存储。 |
| `AGORA_STT_CAPTION_REGION` | 存储区域。 |
| `AGORA_STT_CAPTION_BUCKET` | 存储 bucket。 |
| `AGORA_STT_CAPTION_ACCESS_KEY` | 存储 access key。不要提交到 Git。 |
| `AGORA_STT_CAPTION_SECRET_KEY` | 存储 secret key。不要提交到 Git。 |
| `AGORA_STT_CAPTION_PREFIX_ROOT` | 字幕文件根前缀，例如 `stt-demo/captions`。 |
| `AGORA_STT_CAPTION_SLICE_DURATION` | 字幕切片时长，默认可填 `300`。 |

### 移动端扫码字幕参数

| 参数 | 说明 |
| --- | --- |
| `MOBILE_VIEWER_TOKEN_SECRET` | 移动端 viewer token 签名密钥。必须填写随机长字符串。 |
| `MOBILE_VIEWER_TOKEN_MAX_AGE_SECONDS` | viewer token 有效期。可选，不填时使用应用默认值。 |

## 中国区和 Global 配置

中国区本地验证通常使用：

```dotenv
SSO_BASE_URL="https://sso.shengwang.cn"
SSO_OPEN_API_BASE_URL="https://sso-open.shengwang.cn"
VITE_LOCALE="zh-CN"
```

Global 环境通常使用：

```dotenv
SSO_BASE_URL="https://sso2.agora.io"
SSO_OPEN_API_BASE_URL="https://sso-open.agora.io"
VITE_LOCALE="en-US"
```

## 安全注意事项

- 不要提交 `.env`、真实 secret、证书、Basic Auth、Access Key 或 Secret Key。
- 浏览器可见变量必须以 `VITE_` 开头。不要把服务端 secret 写进 `VITE_` 变量。
- 如果 certificate 留空，对应 RTC/RTM 链路会按静态 App ID 模式运行；如果填写 certificate，服务端会签发动态 token。

## 导出说明

这份代码包由上游仓库的 `bun run export:runtime` 生成，包含以下运行所需文件：

- `.gitignore`
- `biome.json`
- `bun.lock`
- `env.example`
- `package.json`
- `server.mjs`
- `tsconfig.json`
- `vite.config.ts`
- `src`
- `public`
- `README.md`，也就是当前启动说明

导出包不包含 `.env`、`.git/`、`node_modules/`、`dist/`、`deploy/`、`docs/`、测试文件和 agent 专用说明。导出的 `.gitignore` 复制自上游仓库，会继续防止目标 repo 误提交本地 `.env`。
