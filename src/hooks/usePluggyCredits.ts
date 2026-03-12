import { useMemo } from 'react';
import { useBankConnections } from './useBankConnections';

/** Controle interno de créditos Pluggy: 1 crédito por banco conectado */
export function usePluggyCredits() {
  const { connections } = useBankConnections();
  const creditsUsed = connections.length;
  const creditsRemaining = Math.max(0, 10 - creditsUsed); // exemplo: 10 créditos iniciais
  const isLow = creditsRemaining <= 2;
  return useMemo(
    () => ({
      creditsUsed,
      creditsRemaining,
      isLow,
    }),
    [creditsUsed, creditsRemaining, isLow]
  );
}
