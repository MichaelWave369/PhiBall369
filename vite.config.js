import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

// Relative paths work on both GitHub Pages subpaths and Netlify root domains.
export default defineConfig({plugins:[react()],base:"./"});
