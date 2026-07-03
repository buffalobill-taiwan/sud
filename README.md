# HTMLTerm + SUD (Single User Dungeon)

[![Live Demo](https://img.shields.io/badge/demo-online-44cc11?style=flat-square)](https://buffalobill-taiwan.github.io/sud/)

一個純 HTML+CSS+JS 實現的 80×25 終端機模擬器，執行 **SUD**（Single User Dungeon，
單人 MUD 風格地城遊戲）。完全透過 DOM `<span>` 元素搭配 CSS 顏色類別渲染，無需 Canvas。

## 特色

### 終端機核心

- 完整 ANSI 跳脫序列支援（SGR 顏色、游標定位、滾動區域等）
- 16 色 ANSI 調色盤，支援粗體增亮
- 支援 256 色與真彩色
- CJK 雙倍寬度字元處理（緩衝區 + 渲染 + 輸入/刪除）
- 視口自動縮放（保持 80×25 寬高比）
- 回滾緩衝區（2000 行）
- 基於 rAF 的打字機動畫，用於遊戲文字輸出

### SUD 遊戲

- **標題畫面** — SUD ASCII 藝術字，提供「新遊戲」/「讀取存檔」
- **10+ 個房間** — 地城、聖所、監獄、寶庫等
- **戰鬥系統** — 回合制，支援 `attack`、`run`、`use <item>`；HP 血條、暴擊、升級
- **怪物** — 老鼠、哥布林、骷髏、黑暗騎士（Boss）
- **NPC** — 與 NPC 對話，分支劇情；解救囚犯支線任務
- **物品** — 藥水、火把、銀鑰匙、武器、盾牌；背包管理
- **ID 系統** — 實體顯示為 `名稱[ID]`（如 `老人[OldMan]`、`火把[Torch]`）；
  透過顯示 ID 定位目標（不區分大小寫，如 `OldMan`、`old_man`、`Torch`）
- **裝備系統** — 裝備武器與盾牌獲得屬性加成
- **存檔/讀檔** — 透過 `localStorage` 持久化儲存
- **完整 CJK 支援** — 支援中文或英文遊玩

## 架構

| 元件 | 方案 |
|-----------|----------|
| **核心拆分** | `Screen.js`（緩衝區）· `Parser.js`（VT100）· `Renderer.js`（DOM 網格）· `terminal.js`（協調器） |
| **渲染** | 預先建立 80×25 `<span>` 網格；髒行更新 |
| **覆疊層** | Widget（z=10）、對話框（z=100）各自擁有獨立緩衝區；渲染時合成 |
| **Shell** | `SystemManager` + `sys.js`（Proxy 匯出） + `SyncCmdFrame(SudCmd)` |
| **輸入** | `document` 上的 `keydown` + 隱藏 `<textarea>` 用於輸入法 |
| **游標** | 絕對定位 `<div>`，CSS `blink` 動畫 |
| **輸出** | rAF 打字機動畫輸出；`term.write()` 同步輸出 |

詳細架構、框架堆疊生命週期與遊戲系統文件請參閱 [AGENTS.md](AGENTS.md)。

## 字型

使用 [Unifont](https://unifoundry.com/unifont/) 點陣字型，拆分為五個 WOFF2 檔案：

- **eascii-core** — 基本拉丁字母 + 常用符號（8px 寬度）
- **eascii-ext** — 擴充符號（⏎ ✓ ✖，16px 寬度）
- **ja** — 平假名 + 片假名
- **zh-common** — 常用漢字
- **zh-rare** — 生僻漢字

## 使用說明

在現代瀏覽器中開啟 `index.html`，或造訪線上展示：

<https://buffalobill-taiwan.github.io/sud/>

### 遊戲指令

| 指令 | 說明 |
|---------|-------------|
| `n` / `s` / `e` / `w` / `u` / `d` | 移動（北/南/東/西/上/下） |
| `look` / `l` | 查看當前房間 |
| `attack` / `kill` | 開始或繼續戰鬥 |
| `talk` / `say` | 與 NPC 對話（如 `talk OldMan`） |
| `take` / `get` | 拾取物品（如 `take Torch`） |
| `drop` | 丟棄物品 |
| `use` | 使用物品（如 `use HealthPotion`） |
| `inventory` / `i` | 查看背包 |
| `equip` / `un` | 裝備 / 卸下物品 |
| `status` / `st` | 查看角色狀態（HP、MP、等級、裝備） |
| `save` | 儲存遊戲 |
| `quit` | 返回標題畫面 |
| `help` / `h` | 顯示說明 |

### 鍵盤操作

| 按鍵 | 動作 |
|-----|--------|
| 輸入指令 | 遊戲操作輸入 |
| `Enter` | 執行指令 |
| `Backspace` | 刪除字元 |
| `Ctrl+C` | 清除當前輸入（遊戲中，不會中斷） |

## 專案結構

```
js/
├── main.js
├── terminal/          Screen.js Parser.js Renderer.js terminal.js   # VT100 核心
├── system/            sys.js system.js CmdFrame.js LineEditor.js    # Shell 系統
├── util/              sgr.js unicode-width.js constants.js           # 工具函式
├── sud/               SUD 遊戲檔案（參見 AGENTS.md）
├── cmd/               SudCmd.js（透過 index.js 註冊）
├── dialog/           對話框框架
css/style.css
index.html
```

## 授權條款

MIT
