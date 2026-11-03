# 正式部署记录

截至 2026-10-30（北京时间），ICP备案审核期间正式网站已暂停公网内容访问。服务器 Nginx 对普通请求返回 503；域名、证书、正式数据和原配置保留，恢复后主地址为 https://example.com。

## 架构与隔离

- 阿里云 ECS 上的 Nginx 对外监听 80/443，将请求转发给仅监听 127.0.0.1:3000 的 Next.js 应用；systemd 服务为 xinanyi-web.service。
- 当前发布链接为 /srv/xinanyi/current，指向 /srv/xinanyi/releases/20261026T145529Z。部署运维脚本位于本机 deploy/app。
- MySQL 仅监听服务器 127.0.0.1:3306；正式库为 xinanyi_prod，本地开发使用隔离的 xinanyi_dev。
- 照片保存在腾讯云私有 COS，正式照片前缀为 xinanyi/production，开发使用 xinanyi/development。照片访问需要登录。
- 正式环境凭据保留在服务器受 root 保护的目录；不要把密钥、数据库备份或带签名的照片链接写入文档或提交版本库。

## 账号与现有数据

线上使用已有的两个账号，初始账号文件位于本机 E:\XinandYi\work\private\initial-accounts.json。两人可登录后修改各自密码。正式库包含上线时复制的现有记录和照片；正式库与开发库后续独立变化。

此前保存在旧浏览器地址 localStorage 中、尚未手动导入的记录不会自动跨地址同步。需由用户确认后通过网站提供的导入入口操作，先下载原始备份。

## 证书和备份

- 域名 HTTPS 使用 Let's Encrypt 证书，覆盖 example.com 和 www.example.com，到期日为 2027-01-28；IP 跳转仍使用独立的短期 IP 证书。xinanyi-certbot-renew.timer 每日两次检查所有证书，域名证书已完成模拟续期。
- MySQL 每日备份到服务器本机，保留约 14 天；服务器本机备份并非独立异地备份。照片位于私有 COS，不能将其视为已完成独立照片备份。
- 如需查看服务、续期和备份状态，可在服务器运行：

```bash
systemctl status xinanyi-web nginx
systemctl list-timers xinanyi-certbot-renew.timer xinanyi-backup.timer
journalctl -u xinanyi-certbot-renew.service --no-pager -n 30
```

恢复操作应先备份现有数据并在隔离环境演练，不要重新初始化或覆盖正式库。

## 上线验证

部署时已验证公网 HTTPS、两个账号登录、未登录访问限制、私有照片读取、新增记录及测试记录清理；正式库与上线时开发库的业务数据经过只读比对。最终还需两人使用真实设备和网络检查页面显示及操作体验。

## 域名切换后的部署注意事项

- 生产 APP_URL 为 https://example.com，应用的登录与写入来源校验依赖该值。旧 IP 和 www 仅跳转到主域名。
- 域名切换前的服务器 Nginx 和应用环境配置已备份到 /etc/xinanyi/domain-transition-20261030，包含敏感配置，仅限 root 访问。
- 原 deploy/app 下的初次部署脚本及服务器 /opt/xinanyi/server 中的旧模板仍可能使用 IP 地址；下次重新部署前必须先检查并更新这些模板，避免覆盖当前域名配置。不要运行初始部署或生产数据初始化脚本来处理普通更新。
- 2026-10-30 验证了公网域名 HTTPS、www 和 IP 跳转、匿名访问限制、一个账号登录及读取数据、域名证书模拟续期。另一个账号的初始密码验证失败，不代表账号被重置。

## 备案审核期间的暂停状态

- 2026-10-30 按用户意愿暂停正式站公网内容访问。暂停前的 Nginx 配置备份在服务器 /etc/xinanyi/nginx-before-public-pause-20261030T034744Z.conf，恢复前先确认备案状态，再检查备份并验证 Nginx 配置。
- 网站进程仍仅在服务器本机监听，开发环境和正式数据库保持独立；定时备份与证书续期定时器仍启用。
- 当前公网域名请求出现 HTTP 403 / HTTPS 连接重置，服务器本机的对应请求则返回预期的 503。拦截的具体原因尚未确认。公网 ACME 验证路径也出现 403，域名证书自动续期能否成功尚未验证；备案通过后须重新检查公网访问和续期。
