import { formatStudyDate } from '@/lib/study-date'

function escape(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

/** Render only escaped text from the authorized synthetic report; no scripts or external assets. */
export function syntheticReportHtml(report: string) {
  const lines = report.split('\n')
  const separator = lines.indexOf('')
  const details = lines.slice(1, separator < 0 ? lines.length : separator).map(line => {
    const index = line.indexOf(': ')
    return { label: index < 0 ? 'Detalle' : line.slice(0, index), value: index < 0 ? line : line.slice(index + 2) }
  })
  const observations = separator < 0 ? [] : lines.slice(separator + 1).filter(Boolean)
  const fields = details.map(({ label, value }) => {
    let display = value
    if (label.startsWith('Nacimiento') && /^\d{4}-\d{2}-\d{2}$/.test(value)) display = formatStudyDate(value)
    if (label === 'Emitido' && !Number.isNaN(Date.parse(value))) display = new Date(value).toLocaleString('es-PR', { timeZone: 'America/Puerto_Rico', dateStyle: 'long', timeStyle: 'short' }) + ' (Puerto Rico)'
    return `<div class="field"><dt>${escape(label)}</dt><dd>${escape(display)}</dd></div>`
  }).join('')
  const results = observations.map(line => {
    const index = line.indexOf(': ')
    const code = index < 0 ? '' : line.slice(0, index)
    const value = index < 0 ? line : line.slice(index + 2)
    return `<li class="result"><span class="code">${code ? 'Código de prueba: ' + escape(code) : 'Resultado'}</span><strong>${escape(value)}</strong></li>`
  }).join('')
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Resultado ficticio | Enlace Salud</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f6fb;color:#14213b;font:18px/1.6 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:860px;margin:auto;padding:24px 16px 48px}.brand{font-weight:750;color:#1d4ed8;font-size:24px}.notice{background:#fff4d5;border:2px solid #b77900;border-radius:14px;padding:16px;margin:20px 0;color:#663c00;font-weight:700}h1{font-size:clamp(28px,6vw,38px);line-height:1.2;margin:24px 0 12px}h2{font-size:25px;margin:0 0 16px}.panel{background:white;border:1px solid #cbd5e1;border-radius:18px;padding:20px;margin-top:20px;min-width:0}dl{margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:20px}.field{min-width:0}dt,.code{display:block;color:#475569;font-size:17px}dd{margin:4px 0 0;font-weight:600;overflow-wrap:anywhere}ul{list-style:none;padding:0;margin:0;display:grid;gap:16px}.result{background:#eff6ff;border-left:5px solid #2563eb;border-radius:10px;padding:18px;overflow-wrap:anywhere}.result strong{display:block;font-size:30px;margin-top:8px}p{margin:12px 0;overflow-wrap:anywhere}summary{cursor:pointer;min-height:48px;font-weight:700;padding:10px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:16px/1.6 system-ui,sans-serif}a{display:inline-block;padding:12px 18px;min-height:48px;color:#fff;background:#1d4ed8;border-radius:12px;font-weight:700;text-decoration:none}a:focus-visible,summary:focus-visible{outline:3px solid #b77900;outline-offset:4px}@media print{body{background:white}main{max-width:none}a{display:none}.panel{break-inside:avoid}}
</style></head><body><main><div class="brand">Enlace Salud</div><div class="notice" role="note">SOLO PRUEBAS — SIN VALIDEZ CLÍNICA</div><h1>Resultado de laboratorio ficticio</h1><p>Este documento contiene datos de prueba.</p><section class="panel" aria-labelledby="results"><h2 id="results">Resultados</h2>${results ? `<ul>${results}</ul>` : '<p>No hay valores disponibles.</p>'}</section><section class="panel" aria-labelledby="details"><h2 id="details">Datos del estudio</h2><dl>${fields}</dl></section><details class="panel"><summary>Ver texto original del resultado</summary><pre>${escape(report)}</pre></details><p><a href="/dashboard">Volver a Enlace Salud</a></p></main></body></html>`
}
