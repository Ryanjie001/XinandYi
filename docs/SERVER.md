# 服务器与 MySQL 运维

配置日期：2026-10-26，北京时间。

## 当前资源

- 阿里云 ECS：203.0.113.1，Ubuntu 24.04.5 LTS，2 vCPU，系统可见内存约 1.7 GiB。
- 服务器项目目录：/opt/xinanyi。
- 本地项目目录：E:\XinandYi。
- Docker Engine 29.9.2，Docker Compose v5.6.1。
- MySQL 8.4.13，官方镜像，数据绑定 /opt/xinanyi/data/mysql。
- MySQL 物理内存上限 640 MiB，CPU 上限 1 核，缓冲池 256 MiB，总连接上限 25。
- 2 GiB 交换空间，swappiness=10。交换空间用于应急，不能替代物理内存。

## 数据库与账号

| 数据库         | 用途                  | 应用账号                         | 迁移账号                             |
| -------------- | --------------------- | -------------------------------- | ------------------------------------ |
| xinanyi_dev    | 本地开发              | xinanyi_dev_app，最多 5 个连接   | xinanyi_dev_migrator，最多 2 个连接  |
| xinanyi_prod   | 正式运行              | xinanyi_prod_app，最多 10 个连接 | xinanyi_prod_migrator，最多 2 个连接 |
| xinanyi_shadow | Prisma 开发迁移辅助库 | 无                               | xinanyi_dev_migrator                 |

应用账号只有自身库的 SELECT、INSERT、UPDATE、DELETE 权限；迁移账号在对应库管理表结构。开发账号不能访问正式库。xinanyi_backup 只能读取两个业务库及备份所需的视图、触发器、事件、例程信息。

统一采用 utf8mb4 / utf8mb4_0900_ai_ci，MySQL 会话默认时区为 +08:00。账号密码在服务器随机生成，保存在 /opt/xinanyi/secrets，生产账号凭据没有下载到本地开发配置。

secrets 目录只有 root 可遍历；内部文件供容器 secret 挂载读取。不要将该目录、data、backups 或服务器 .env 提交 Git。

## 本地连接

在项目根目录运行：

```powershell
npm.cmd run db:tunnel
npm.cmd run db:check
```

连接路径：本机 127.0.0.1:13306 → 已验证指纹的 SSH → 服务器 127.0.0.1:3306 → MySQL。

数据库仅绑定服务器回环地址；公网 3306 端口已验证不可连接。隧道也仅监听本机回环地址。专用 SSH 配置位于 work/ssh/config，密钥和 known_hosts 均只存本机。保持 db:tunnel 所在终端运行，另开终端执行 db:check 或网站开发命令。脚本只管理其自身记录的 SSH 进程，端口若被其他进程占用会报错。

停止隧道：

```powershell
npm.cmd run db:tunnel:stop
```

重新获取开发环境凭据：

```powershell
npm.cmd run db:sync-env
```

该命令通过 SSH 获取开发应用账号、开发迁移账号和 shadow 库 URL，保存到受权限保护的 .env.local；会保留其他已有环境变量，不输出密码。换电脑时需先配置该电脑的专用 SSH 密钥。

当前前端仍使用浏览器 localStorage。数据库基础设施就绪不代表网站已经接入真实账号或云端数据；下一阶段需添加 Prisma 模型、服务端授权与数据接口。

## 镜像来源与固定版本

服务器不能直接访问 Docker Hub，因此从本机下载 docker.io/library/mysql:8.4.13 的 linux/amd64 官方镜像，校验 manifest 和每个 blob 的 SHA-256，再打包上传。服务器再次校验归档摘要、配置摘要和 RootFS 层摘要后才启动容器。

来源与摘要记录在 deploy/mysql/image-lock.json；服务器额外记录 mysql/runtime-image.json。Docker 29 的 containerd 存储在导入 Docker 归档时会生成新的运行时 manifest 摘要，已验证其 config 和文件系统层与官方来源一致。Compose 使用固定运行时 image ID，pull_policy=never，更新需明确下载并验证新版本。

镜像归档保留在本机 work/infra/mysql-image 和服务器 images 目录，便于重新部署。

## 服务管理

```bash
cd /opt/xinanyi
docker compose ps
docker compose logs --tail 80 mysql
docker stats --no-stream
docker compose up -d --wait --wait-timeout 120
```

Docker 开机启动，MySQL restart=unless-stopped。容器日志采用 local 驱动，单文件最多 10 MiB，最多 3 个；MySQL binlog 最长保留 3 天。初始化脚本只在空数据目录首次运行，重复启动不会重置数据库密码。

部署源文件在本机 deploy/compose.yaml、deploy/mysql、deploy/server 和 deploy/systemd。同步配置时保留服务器 secrets、data、backups 和 .env。

## 备份与恢复

- 每天北京时间 03:15 开始，随机延迟最多 5 分钟，systemd timer 为 xinanyi-backup.timer。
- 同时备份 xinanyi_dev 与 xinanyi_prod，采用一致性逻辑备份、gzip 与 SHA-256 校验，服务器保留 14 天。
- 本轮已完成恢复演练：在开发库写入临时中文/表情记录，备份并恢复到独立临时数据库，核对数据后清理临时库和临时表。
- 初始正式备份已下载本机 work/backups，并核验 SHA-256。
- 当前每日定时备份在同一台服务器；自动异地备份需后续接入 COS / OSS。本机副本通过下列命令更新。

```powershell
npm.cmd run db:backup
```

查看定时任务：

```bash
systemctl list-timers xinanyi-backup.timer
journalctl -u xinanyi-backup.service --no-pager -n 30
```

完整备份恢复应在新实例或隔离恢复环境中执行，先保留现有数据备份。备份包含两个业务库的建库与建表语句。项目提供的 deploy/server/verify-backup.py 用隔离临时库验证恢复能力，不覆盖正式库。

## 已完成的验收

- 本机 SSH 隧道下 MySQL 登录、utf8mb4 / emoji 和增删改查。
- 应用账号不能建表，开发应用账号与开发迁移账号不能访问正式库。
- 正式应用账号可以登录自身库，权限为业务 CRUD。
- 容器健康检查、资源限制、持久化与重启检查。
- 公网数据库端口不可访问。
- 压缩备份、校验、隔离恢复和本机副本下载。
