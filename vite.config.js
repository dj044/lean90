import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/lean90/", // <-- change to your repo name (e.g., "/lean90/")
});
