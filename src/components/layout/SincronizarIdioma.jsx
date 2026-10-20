import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';

/*
 * Ao entrar, aplica o idioma salvo no perfil (idioma_preferido).
 * Assim quem escolheu "English" no notebook vê em inglês também no celular.
 * Componente "invisível": não desenha nada, só sincroniza dois contextos.
 */
export default function SincronizarIdioma() {
  const { usuario } = useAuth();
  const { idioma, setIdioma } = useI18n();
  const preferido = usuario?.idioma_preferido;

  useEffect(() => {
    if (preferido && preferido !== idioma) setIdioma(preferido);
    // só quando o usuário (ou a preferência dele) muda — não a cada troca local
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferido, usuario?.id]);

  return null;
}
