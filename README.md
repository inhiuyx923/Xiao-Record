# 杨潇童年录音馆

这是一个给家里人使用的移动端优先录音网站。音频放在 `小时候录音` 目录里，网站会读取 `audio-catalog.json` 展示三组 MP3。

## 更新录音目录

添加或替换 MP3 后，运行：

```bash
node scripts/generate-catalog.mjs
```

## 本地预览

```bash
python3 -m http.server 4173
```

然后打开 `http://localhost:4173`。

## 上线到 GitHub Pages

当前音频总量约 368MB，单个文件都小于 GitHub 的单文件限制，可以直接通过 GitHub Pages 发布。

建议用 GitHub Desktop：

1. Add Existing Repository，选择这个文件夹。
2. Publish repository。
3. 在 GitHub 网页进入仓库 Settings -> Pages。
4. Source 选择 `Deploy from a branch`，Branch 选择 `main` 和 `/root`。
5. 保存后等待几分钟，GitHub 会生成一个 `github.io` 网址。

项目里已经加了 `robots.txt`，用来提醒搜索引擎不要索引这个家庭站点。
