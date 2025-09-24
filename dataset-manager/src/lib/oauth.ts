export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  scope?: string;
  state: string;
}): string {
  const scope = params.scope ?? 'public';
  const q = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope,
    state: params.state,
  });
  return `https://dribbble.com/oauth/authorize?${q.toString()}`;
}

export function validateState(received: string | null, expected: string): boolean {
  return !!received && received === expected;
}


