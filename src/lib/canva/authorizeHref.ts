export function getCanvaAuthorizeHref() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  return baseUrl ? `${baseUrl}/api/canva/authorize` : '/api/canva/authorize';
}
