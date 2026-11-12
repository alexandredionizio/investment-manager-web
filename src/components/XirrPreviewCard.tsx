import { useEffect, useState } from 'react';
import type { XirrPreview } from '../types/xirrPreview';

interface Props {
  portfolioId: number | null | undefined;
  loadPreview: (portfolioId: number) => Promise<XirrPreview>;
}

const rateFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2,
});

function formatRate(value: number | null | undefined): string | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? rateFormatter.format(value)
    : null;
}

function unavailableReason(preview: XirrPreview): string {
  const notice = preview.notice?.trim();
  if (notice) return notice;
  switch (preview.status) {
    case 'INSUFFICIENT_OR_AMBIGUOUS_FLOWS':
      return 'Não há fluxos externos suficientes ou inequívocos para calcular a XIRR.';
    default:
      return 'Não foi possível determinar a XIRR com os dados disponíveis.';
  }
}

export function XirrPreviewCard({ portfolioId, loadPreview }: Props) {
  // A requisição mantém a carteira de origem; respostas antigas nunca aparecem
  // durante uma troca de carteira, sem setState síncrono dentro do efeito.
  const [request, setRequest] = useState<{
    portfolioId: number;
    data: XirrPreview | null;
    error: boolean;
  } | null>(null);
  const validPortfolioId = typeof portfolioId === 'number'
    && Number.isSafeInteger(portfolioId) && portfolioId > 0;
  const currentRequest = validPortfolioId && request?.portfolioId === portfolioId ? request : null;
  const data = currentRequest?.data ?? null;
  const error = currentRequest?.error ?? false;
  const loading = validPortfolioId && !currentRequest;

  useEffect(() => {
    if (typeof portfolioId !== 'number' || !Number.isSafeInteger(portfolioId) || portfolioId <= 0) return;
    let active = true;
    loadPreview(portfolioId)
      .then(result => {
        if (active) setRequest({ portfolioId, data: result, error: false });
      })
      .catch(() => {
        if (active) setRequest({ portfolioId, data: null, error: true });
      });
    return () => { active = false; };
  }, [portfolioId, loadPreview]);

  const annualRate = data?.status === 'PROVISIONAL_XIRR'
    ? formatRate(data.annualRate)
    : null;

  return (
    <article aria-label="XIRR anualizada" className="dashboard-metric-card">
      <span>XIRR anualizada</span>
      {!portfolioId ? (
        <p>Selecione uma carteira para consultar a XIRR.</p>
      ) : loading ? (
        <p role="status">Consultando XIRR…</p>
      ) : error ? (
        <p>Não foi possível consultar a XIRR no momento.</p>
      ) : !data ? (
        <p>Sem dados para apresentação.</p>
      ) : annualRate !== null ? (
        <>
          <strong>{annualRate} ao ano</strong>
        </>
      ) : (
        <p>{unavailableReason(data)}</p>
      )}
      {annualRate !== null && data && (
        <details style={{ position: 'relative', display: 'inline-block', alignSelf: 'flex-start' }}>
          <summary
            aria-label="Informações sobre XIRR"
            title="Informações sobre XIRR"
            style={{ cursor: 'pointer', listStyle: 'none', width: 'fit-content' }}
          >ⓘ</summary>
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 'min(310px, 75vw)', boxSizing: 'border-box',
            padding: '12px 14px', background: '#fff', color: '#142e50',
            border: '1px solid #d8e0ea', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)', zIndex: 20,
            fontSize: 14, lineHeight: 1.5,
          }}>
            <p>Indicador provisório. Saldos, taxas, impostos e fluxos financeiros dependem de conciliação.</p>
            <p>Confira os extratos antes de considerar a taxa definitiva.</p>
          </div>
        </details>
      )}
    </article>
  );
}
