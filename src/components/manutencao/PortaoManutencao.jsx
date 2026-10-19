import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useManutencao } from '@/contexts/ManutencaoContext';
import { manutencaoService } from '@/services/manutencaoService';
import { ehEquipe } from '@/utils/permissoes';
import ManutencaoPage from '@/pages/manutencao/ManutencaoPage';
import { Carregando } from '@/components/ui/Estados';
import styles from './PortaoManutencao.module.css';

/*
 * "Portão" do modo manutenção (o MaintenanceMiddleware do Anexo 2, no front).
 *
 *   em manutenção + cliente      → página de manutenção (no lugar de qualquer rota)
 *   em manutenção + equipe       → app normal + faixa avisando + registro de acesso (RF105)
 *   /login                       → sempre liberado (senão o admin não consegue entrar!)
 *
 * De novo: no front isso é experiência. Quem barra de verdade é a API
 * respondendo 503 para quem não é da equipe.
 */

const SEMPRE_LIBERADAS = ['/login', '/manutencao/previa'];

export default function PortaoManutencao({ children }) {
  const { status } = useManutencao();
  const { usuario, verificando } = useAuth();
  const { pathname } = useLocation();
  const equipe = ehEquipe(usuario);
  const ativa = Boolean(status?.em_manutencao);

  useEffect(() => {
    if (ativa && equipe) manutencaoService.registrarAcessoDuranteManutencao();
  }, [ativa, equipe, pathname]);

  // Enquanto o login e o status são conferidos, ainda não sabemos o que mostrar.
  // Esperar o status evita que o visitante seja levado ao /login (liberado) antes de saber da manutenção.
  if (status === null) return <Carregando texto="Ligando a radiola..." />;
  if (verificando) return children;
  if (ativa && !equipe && !SEMPRE_LIBERADAS.includes(pathname)) return <ManutencaoPage />;
  return children;
}

/**
 * Faixas no topo do conteúdo:
 * - equipe durante a manutenção: lembra que os clientes estão bloqueados;
 * - todo mundo, se há manutenção AGENDADA nas próximas 24h (RF109). Dá para dispensar.
 */
export function AvisoManutencao() {
  const { status } = useManutencao();
  const { usuario } = useAuth();
  const chaveDispensa = status?.inicio ? `radiola.aviso-manutencao.${status.inicio}` : null;
  const [dispensado, setDispensado] = useState(false);

  useEffect(() => {
    try {
      setDispensado(Boolean(chaveDispensa && localStorage.getItem(chaveDispensa)));
    } catch {
      setDispensado(false);
    }
  }, [chaveDispensa]);

  if (!status) return null;

  if (status.em_manutencao && !ehEquipe(usuario)) {
    // Só aparece no /login (as outras telas já estão trocadas pela página de manutenção)
    return (
      <div className={`${styles.faixa} ${styles.ativa}`} role="status">
        <span>
          <strong>Sistema em manutenção.</strong> Agora só a equipe consegue entrar.
        </span>
      </div>
    );
  }

  if (status.em_manutencao && ehEquipe(usuario)) {
    return (
      <div className={`${styles.faixa} ${styles.ativa}`} role="status">
        <strong>Modo manutenção ativo.</strong> Os clientes estão vendo a página de manutenção; só a equipe navega.
        {usuario?.permissoes?.includes('*') && <Link to="/admin/manutencao">Gerenciar</Link>}
      </div>
    );
  }

  const inicio = status.inicio ? new Date(status.inicio).getTime() : 0;
  const em24h = status.agendada && inicio - Date.now() < 24 * 3600000;
  if (!em24h || dispensado) return null;

  const fmt = (iso) => new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const dispensar = () => {
    try {
      localStorage.setItem(chaveDispensa, '1');
    } catch {
      /* sem storage: só some nesta visita */
    }
    setDispensado(true);
  };

  return (
    <div className={styles.faixa} role="status">
      <span>
        <strong>Manutenção programada:</strong> {fmt(status.inicio)} até {fmt(status.fim_previsto)}. {status.motivo}
      </span>
      <button type="button" onClick={dispensar} aria-label="Dispensar aviso">✕</button>
    </div>
  );
}
