import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'node:path';

// O alias "@" aponta para /src. Assim você importa
// "@/components/ui/Button" em vez de "../../../components/ui/Button".
//
// "npm run dev:celular" sobe o servidor em HTTPS e visível na rede local.
// Por quê? O navegador só libera a CÂMERA (scanner) em HTTPS ou em localhost,
// e no celular você acessa pelo IP do computador (ex.: https://192.168.0.10:5173).
// O certificado é autoassinado: o celular vai avisar, é só aceitar.
export default defineConfig(({ mode }) => ({
  plugins: [react(), mode === 'celular' && basicSsl()].filter(Boolean),
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
}));
