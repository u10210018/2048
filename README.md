# 2048

一個以 `React + TypeScript + Vite` 製作的 2048 小遊戲，支援鍵盤與手機滑動操作，並補上了方塊移動、合併與新生成時的動畫效果。

## Features

- 經典 4x4 2048 規則
- 支援方向鍵與 `WASD`
- 支援手機滑動操作
- 方塊滑動補間動畫
- 合併與新方塊生成的 pop 動畫
- 勝利與失敗覆蓋層
- 可繼續挑戰 2048 以上分數
- `localStorage` 保留最佳分數
- 遊戲說明可收合，預設收起
- UI icon 統一使用 Iconify

## Demo

本機啟動後可在瀏覽器開啟 `http://localhost:5173` 預覽。

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Iconify
- Oxlint / Oxfmt

## Getting Started

先安裝依賴：

```bash
pnpm install
```

啟動開發環境：

```bash
pnpm run dev
```

建置正式版本：

```bash
pnpm run build
```

本機預覽正式版：

```bash
pnpm run preview
```

## Available Scripts

- `pnpm run dev`: 啟動 Vite 開發伺服器
- `pnpm run build`: TypeScript 編譯並輸出 production bundle
- `pnpm run preview`: 本機預覽 build 結果
- `pnpm run lint`: 執行 Oxlint
- `pnpm run lint:fix`: 自動修正可修復的 lint 問題
- `pnpm run format`: 執行 Oxfmt
- `pnpm run format:check`: 檢查格式是否一致
- `pnpm run deploy`: 將 `dist/` 發佈到 GitHub Pages

## Gameplay

1. 使用方向鍵、`WASD` 或手勢滑動移動所有方塊。
2. 相同數字的方塊碰撞後會合併成更大的數字。
3. 每次成功移動或合併後，棋盤會隨機生成一個新方塊。
4. 合成出 `2048` 後可以選擇繼續挑戰更高分。
5. 當棋盤沒有空位且無法再合併時，遊戲結束。

## Project Structure

```text
src/
  App.tsx      # 主要 UI、輸入處理、動畫狀態
  game.ts      # 2048 核心規則與移動計算
  index.css    # 全域樣式與棋盤動畫
  main.tsx     # 應用程式入口
```

## Implementation Notes

- 棋盤邏輯與 UI 分離，移動規則集中在 `src/game.ts`
- 動畫採用絕對定位 tile layer 搭配 CSS transform transition
- 最佳分數儲存在瀏覽器 `localStorage`
- Iconify 以本地註冊 icon 的方式使用，避免多餘 bundle 膨脹

## Deployment

專案已提供 GitHub Pages 發佈指令：

```bash
pnpm run deploy
```

部署前會先自動執行：

```bash
pnpm run build
```
