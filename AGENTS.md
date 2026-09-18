# 前端设计约束

修改 UI 前先阅读 [视觉规范](docs/visual-design.md)，所有新页面和后台页面都遵守。

- 常规文字最小 14px；使用现有 `--font-*` 和 Tailwind 字号，不新增随意字号。
- 常规配色必须引用全局 CSS `--site-*` 变量；不得硬编码文字、背景、边框或链接颜色，不新增灰蓝色板。
- 普通标题统一 `--site-title`，说明使用 `--site-text-secondary`；保留规范中明确的蓝色栏目和深色作品首屏例外。
- Ant Design 的算法颜色从 `lib/visual-tokens.ts` 的 `siteColors` 取值，并同步 CSS 变量。不得直接向颜色算法传入 CSS var 字符串。
- 控件使用 Ant Design，圆角遵循全站 4px；轮播箭头和头像保留圆形。
- 本地验证使用生产构建，不运行 next dev。修改后检查移动端溢出、交互状态与涉及的后台界面。
- 保留工作区中其他未提交修改，不覆盖无关工作。
