import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const base = "/2048/";

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      injectRegister: false,
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "screenshot-desktop.png",
        "screenshot-mobile.png",
      ],
      manifest: {
        lang: "zh-Hant",
        dir: "ltr",
        id: base,
        name: "2048!",
        short_name: "2048!",
        description: "2048! 是一款支援手機滑動、安裝成 App、離線遊玩的中文 2048 數字合併遊戲。",
        start_url: base,
        scope: base,
        display: "standalone",
        display_override: ["standalone", "browser"],
        orientation: "portrait",
        background_color: "#f6f1e7",
        theme_color: "#efe6d7",
        categories: ["games", "entertainment", "puzzle", "productivity"],
        prefer_related_applications: false,
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
        screenshots: [
          {
            src: "screenshot-mobile.png",
            sizes: "828x1792",
            type: "image/png",
            label: "2048! 手機版畫面預覽",
            form_factor: "narrow",
          },
          {
            src: "screenshot-desktop.png",
            sizes: "2880x1800",
            type: "image/png",
            label: "2048! 桌面版畫面預覽",
            form_factor: "wide",
          },
        ],
        shortcuts: [
          {
            name: "立即開玩",
            short_name: "開玩",
            description: "直接打開 2048! 棋盤開始挑戰",
            url: base,
            icons: [
              {
                src: "pwa-192x192.png",
                sizes: "192x192",
                type: "image/png",
              },
            ],
          },
          {
            name: "玩法說明",
            short_name: "玩法",
            description: "開啟 2048! 並直接展開玩法說明",
            url: `${base}?help=1`,
            icons: [
              {
                src: "pwa-192x192.png",
                sizes: "192x192",
                type: "image/png",
              },
            ],
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
      },
    }),
  ],
});
