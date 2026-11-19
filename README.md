# OpenHands 远程 · iOS

用 Capacitor 把网页壳包成 iOS App，通过局域网连你电脑上跑着的 agent-canvas。
未签名 IPA，配巨魔（TrollStore）安装。

## 它是什么

一个壳。页面上只有一件事：填电脑地址 → 连上 → 整页打开电脑上那份完整的 OpenHands 界面。
所以 UI 永远和你电脑上的一致，App 不用跟着升级。

**地址可改**是核心设计。换了 WiFi、电脑 IP 变了，改一下就行；懒得看 IP 就点「扫描」，它会扫一遍本网段把开着的端口找出来。

## 怎么编译

IPA 里的可执行文件只能在 macOS 上编，所以用 GitHub 免费的 macOS 机器编。

1. 新建一个 **Public** 仓库（公开仓库的 Release 直链下载不需要登录）。
2. 把这个目录的全部内容推上去（含 `.github/`、`www/`、`assets/`）。
3. 仓库 → **Actions** → **构建 iOS 安装包** → **Run workflow**。
4. 等 8~12 分钟变绿。IPA 会自动发到 **Releases**，直链固定为：
   ```
   https://github.com/<你的用户名>/<你的仓库>/releases/download/v1.0/oh-ios.ipa
   ```
5. Actions 页面里的 `oh-ios-ipa` 附件也能下载，但那个需要登录，用 Release 直链更省事。

## 怎么装

1. 手机 Safari 打开上面的直链 → 下载 `oh-ios.ipa`。
2. 「文件」App → 长按该文件 → 共享 → TrollStore（或开巨魔点右上角 `+` 选文件）。
3. 巨魔里点 **Install**，桌面出现图标。

## 电脑这边要怎么起服务

默认只监听 `127.0.0.1`，手机连不进来。要让它监听局域网：

```powershell
# 1) 起服务时绑所有网卡，并进入 public 模式（密钥不注入页面）
$env:LOCAL_BACKEND_API_KEY = '<自己定一个足够长的随机串>'
npx @openhands/agent-canvas --host 0.0.0.0 --public
```

> ⚠️ **`--host 0.0.0.0` 等于把这台能跑任意命令的机器暴露给整个 WiFi。**
> 所以配 `--public`：密钥不写进 HTML，谁打开页面都得先粘密钥。
> 不要用 `--allow-lan-session-key`——它会把密钥注入页面，同网段任何人打开就能直接用。

**放行防火墙**（只放你手机的 IP，不要整个网段）：

```powershell
New-NetFirewallRule -DisplayName "OpenHands LAN" -Direction Inbound `
  -Protocol TCP -LocalPort 8000 -RemoteAddress 192.168.0.50 -Action Allow
```

**查电脑当前 IP**（换网后跑这个，填进 App）：

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object IPAddress, InterfaceAlias
```

`169.254.*` 是没拿到 DHCP 的地址，那个网卡没在用，忽略。

**首次连接**：App 里粘贴密钥，之后会存在 `localStorage` 里，不用再输。

## 验证

```powershell
node test/normurl.test.mjs   # 地址解析的单元测试，11 个用例
```

## 实现要点

- **`server.iosScheme: "http"`**：页面 origin 变成 `http://localhost`。这个 origin 既是安全上下文
  （`capacitor://` 下的 localStorage 在 iOS 上有被清的历史问题），又因为本身是 http
  而不会把发往 `http://192.168.x.x` 的请求判定成混合内容。两个坑一起躲开。
- **ATS 例外**：iOS 默认禁明文 HTTP。workflow 里往 `Info.plist` 写了
  `NSAllowsArbitraryLoads`、`NSLocalNetworkUsageDescription`、`NSBonjourServices`，
  少了这些连接会失败且没有可读的报错。
- **启动先探测再跳转**：不探测直接跳上次的地址，一换 WiFi 就停在系统报错页、回不到设置界面。
  `www/error.html` 是兜底页，导航失败时 Capacitor 会显示它。
- **扫描**用 `fetch(mode:'no-cors')`：响应读不到，但 promise resolved 就证明端口通了，
  24 并发扫 254 个地址。

## 已知取舍

- 用的是整页跳转，不是 iframe。iframe 里那份 UI 的 `localStorage` 会被当作第三方存储分区，
  登录态容易出问题。
- 明文 HTTP。同一个 WiFi 上抓包能看见内容。要更安全就上 Tailscale（`tailscale serve`
  还能给 `*.ts.net` 签真证书，那时 App 里填 `https://xxx.ts.net` 即可，443 是默认端口）。
- 未签名。这正是巨魔的用法，不会过期；但不能上架，也不能装到没巨魔的设备。
