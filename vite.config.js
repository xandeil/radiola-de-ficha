import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// O alias "@" aponta para /src. Assim você importa
// "@/components/ui/Button" em vez de "../../../components/ui/Button".
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
