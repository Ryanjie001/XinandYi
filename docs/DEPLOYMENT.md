# 正式部署记录

截至 2026-11-02（北京时间），用户确认 ICP 备案完成，正式网站已恢复公网访问，主地址为 https://example.com。2026-10-30 的暂停状态及恢复记录保留在下文。

## 架构与隔离

- 阿里云 ECS 上的 Nginx 对外监听 80/443，将请求转发给仅监听 127.0.0.1:3000 的 Next.js 应用；systemd 服务为 xinanyi-web.service。
- 当前发布链接为 /srv/xinanyi/current，指向 /srv/xinanyi/releases/20261102T114539Z。部署运维脚本位于本机 deploy/app。
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

## 2026-11-02 恢复访问与新版发布

- 用户确认备案完成后发布新版，正式数据库应用 `20261030120000_lunar_birthdays` 增量迁移，保留原有账号、手记、愿望及照片记录。正式库和开发库的数据没有互相覆盖。
- 迁移前备份为 /opt/xinanyi/backups/xinanyi-20261102T114544702706654Z.sql.gz；迁移后备份为 /opt/xinanyi/backups/xinanyi-20261102T122052472206869Z.sql.gz，均通过 SHA-256 与 gzip 校验。备份仍位于同一服务器，并非独立异地备份。
- 公网验证了主域名 HTTPS 登录页及静态资源、www 与 IP 跳转、匿名访问限制、一个账号登录并读取生日字段、私有照片读取与退出；域名证书模拟续期成功。另一个账号未在本次使用真实密码验证。
- 上次 `npm ci` 时云盘读写受限，服务器短暂失联；重启后改为限制 CPU、内存和 I/O 优先级，并复用哈希一致的旧版 Linux 依赖。当前版本的 node_modules 是指向 /srv/xinanyi/releases/20261026T145529Z/node_modules 的符号链接。**不要删除或修改旧版本依赖目录**；未来发布应先设计独立共享依赖目录或使用隔离构建环境，验证后再调整。
- 旧 deploy/app 初次部署模板仍包含 IP 访问配置，不要直接执行以免覆盖域名。新版发布时应保留生产环境配置并使用独立发布目录。
- 切换后首次登录检查遇到一次数据库连接超时，之后两次公网登录及读取成功；需持续关注应用日志、云盘 IOPS/延迟及备份状态。


## 2026-11-03 新版发布

- 发布目录 `/srv/xinanyi/releases/20261103T013830Z`，保留原域名、HTTPS 和生产环境配置；继续复用 `/srv/xinanyi/releases/20261026T145529Z/node_modules`，不要删除该依赖目录。
- 正式库增量应用 `20261102130000_interactions_albums_moods_drafts` 与 `20261102150000_anniversaries_future_letters`；未使用开发库覆盖正式数据。
- 迁移前备份 `/opt/xinanyi/backups/xinanyi-20261103T013853966866206Z.sql.gz`，迁移后备份 `/opt/xinanyi/backups/xinanyi-20261103T014159919844268Z.sql.gz`，均已通过 SHA-256 和 gzip 完整性检查。备份在同一服务器，不属于异地备份。
- 公网验证 HTTPS 登录页、www 跳转、两套心情表情资源以及匿名数据、照片和信件接口的访问限制；网站服务和备份、证书定时器运行中。用户反馈已登录，自动浏览器检查因无法识别当前浏览器地址而中断，登录后的页面、私有照片和信件权限仍需实际检查。


## 2026-11-03 备案号更新

- 发布目录 `/srv/xinanyi/releases/20261103T020349Z`；首页和登录页加入备案号及工信部链接，未修改数据库和 Nginx 配置。依赖继续复用 `/srv/xinanyi/releases/20261026T145529Z/node_modules`。
- 公网 HTTPS 登录页返回 200，HTML 中包含备案号和工信部链接；匿名数据接口返回 401。应用、Nginx、数据库备份及证书续期定时器运行中。首页备案号已在开发预览验证，本次线上未重新验证登录后首页。
