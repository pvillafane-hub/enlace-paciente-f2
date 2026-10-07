export function appUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : '')
  if (!value) throw new Error('NEXT_PUBLIC_APP_URL is required')
  const url = new URL(value)
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
      !(url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.hostname === 'localhost' && url.protocol === 'http:'))) {
    throw new Error('Invalid application origin')
  }
  return url.origin
}
