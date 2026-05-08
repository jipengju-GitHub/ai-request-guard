import htmlTemplate from './gui-html.generated'

/** Builds the self-contained HTML string for the GUI page. */
export function buildGuiHtml(opts: { aiConfigured: boolean; adaptersDir: string; fileType?: string }): string {
  const configScript = `<script>window.__AI_GUARD_CONFIG__=${JSON.stringify({ fileType: 'ts', ...opts })}<\/script>`
  return htmlTemplate.replace('<!--__AI_GUARD_CONFIG__-->', configScript)
}
