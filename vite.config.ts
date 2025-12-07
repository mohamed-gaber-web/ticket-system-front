import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite';
import * as path from 'path'; // <-- Import the Node.js path module

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { // <-- Add this resolution block
      alias: {
        '@': path.resolve(__dirname, './src'), // <-- Map '@' to the './src' directory
      },
    },
})
