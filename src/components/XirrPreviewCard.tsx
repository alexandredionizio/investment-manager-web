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
  const [data, setData] = useState<XirrPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(false);
    setLoading(false);
    if (!portfolioId || !Number.isSafeInteger(portfolioId) || portfolioId <= 0) return;

    setLoading(true);
    loadPreview(portfolioId)
      .then((result) => { if (active) setData(result); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [portfolioId, loadPreview]);

  const annualRate = data?.status === 'PROVISIONAL_XIRR'
    ? formatRate(data.annualRate)
    : null;

  return (
    <section aria-label="XIRR anualizada — prévia" className="dashboard-card dashboard-return-section">
      <h3>XIRR anualizada — prévia</h3>
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
          <p className="xirr-preview-rate">{annualRate} ao ano</p>
          <p>{data.notice?.trim() || 'Cálculo provisório, sujeito à conciliação dos fluxos.'}</p>
        </>
      ) : (
        <p>{unavailableReason(data)}</p>
      )}
      <small>Indicador provisório. Não substitui a rentabilidade atual da carteira.</small>
    </section>
  );
}
