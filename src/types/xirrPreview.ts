/** Contrato da prévia XIRR. Os campos conhecidos estão tipados; valores ausentes não são presumidos. */
export type XirrPreviewStatus = 'PROVISIONAL_XIRR' | 'INSUFFICIENT_OR_AMBIGUOUS_FLOWS' | string;

export interface XirrPreview {
  status: XirrPreviewStatus;
  asOf?: string | null;
  annualRate?: number | null;
  terminalEquity?: number | null;
  cashBalance?: number | null;
  positionsValue?: number | null;
  externalMovements?: number | null;
  notice?: string | null;
}
