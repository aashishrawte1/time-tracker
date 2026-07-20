import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Repo name is "time-tracker" -> GitHub Pages serves it at /time-tracker/
export default defineConfig({
  plugins: [react()],
  base: "/time-tracker/",
});
