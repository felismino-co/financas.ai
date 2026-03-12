/** Extrai mensagem de erro do Supabase ou Error. */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return fallback;
}

/** Retorna mensagem amigável para erros 500/JWT/RLS. */
export function getFriendlyError(msg: string, fallback: string): string {
  if (msg.includes('500') || msg.includes('JWT') || msg.includes('PGRST') || msg.includes('permission')) {
    return fallback;
  }
  return msg;
}
