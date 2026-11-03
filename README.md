# 新&怡 · 我们的小世界

双人恋爱记录网站，项目目录 E:\XinandYi。浅蓝与白色的简约界面，使用统一字体、单张封面与轻量卡片。

## 本地启动

使用 Node.js 22，安装依赖后在两个终端分别运行：

```powershell
cd E:\XinandYi
npm ci
npm run db:generate
npm run db:tunnel
```

```powershell
cd E:\XinandYi
npm run dev
```

打开 http://127.0.0.1:3000 。数据库通过 SSH 隧道连接服务器开发库，MySQL 不对公网开放。若隧道已开启，直接启动网页即可。初始账号与密码在受权限保护的 work/private/initial-accounts.json，已有账号的密码不会因重复 seed 被重置。

## 已实现

- 两个固定密码账号，关闭公开注册；安全会话、登录限流、退出、修改密码并退出其他设备。
- 首页恋爱天数与纪念日、共享设置、手记发布/编辑/删除/搜索/筛选、愿望清单及完成后生成手记。双方可分别保存阳历和农历生日，并选择首页展示及倒计时使用的一种。
- 手记作者由服务器确认，只有作者可以修改和删除；愿望与纪念日由两人共同管理。
- MySQL 8.4 + Prisma 7 迁移与持久化，版本冲突提示，愿望生成手记使用事务与唯一约束。
- 腾讯云 COS 私有照片上传，服务器校验、压缩、方向纠正与去除 EXIF；照片访问需要登录，签名仅有效 60 秒。
- 旧浏览器记录可手动导入、下载原始备份；原 localStorage 不被覆盖或删除。导入不包含示例，重复导入不产生重复记录；云端已有设置优先保留。
- 数据读取失败有重试入口，保存失败保留表单。打开页面、重新聚焦或每 30 秒读取共享记录。

日期使用北京时间；恋爱第一天按第 1 天计算。初始日期为空，带示例标记的内容均为虚构数据。静态 public/images 仅存放公开风景素材，不能放真实私密照片。

农历生日只需填写月份和日期；可标记闰月。选择闰月生日时，无对应闰月的年份按普通月份计算；农历三十遇到只有二十九天的月份时按二十九计算。

## 开发检查

```powershell
npm run typecheck
npm run build
npm run test:integration
npx tsx scripts/test-birthdays.mts
node scripts/test-birthday-api.mjs
npm run photos:cleanup
```

集成测试需要开发服务器和数据库隧道。测试仅使用开发库及开发照片前缀，自动清理本次测试数据。photos:cleanup 默认只显示候选数量；加 -- --execute 才清理超过 24 小时且没有记录引用的开发照片，每次最多 50 张。
生日 API 测试仅使用开发库，测试后恢复原有设置；运行期间不要同时修改设置。农历计算测试不需要数据库。

生产构建使用 Webpack、一个 worker，输出 .next-production；开发输出 .next。启动生产预览前需停止同端口开发服务。

## 文件与凭据

- src/app：登录、私有页面和鉴权 API。
- src/lib/server：认证、数据库、权限、照片与业务事务。
- prisma：数据库模型及迁移；src/generated/prisma 为本地生成文件。
- scripts：数据库隧道、备份、开发数据、集成测试、照片维护。
- docs/SERVER.md：服务器与备份恢复；docs/APP-QA.md：本阶段验收。

实际配置在 .env.local；.env.example 仅含占位符。密钥、初始账号文件、SSH 私钥、备份和构建产物均忽略提交。

## 下一阶段

ICP备案仍在审核，正式网站已暂停公网内容访问，域名和 HTTPS 配置已保留。后续优化在开发环境进行；正式库与开发库隔离。恢复和备份说明见 docs/DEPLOYMENT.md。
