import { i18n } from "@/shared/i18n/i18n.config";

export function renderErrorPage(error?: unknown): string {
	let errorDetail = "";
	if (error) {
		const errorMessage =
			error instanceof Error ? error.stack || error.message : String(error);
		// Escape HTML
		const safeMessage = errorMessage
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
		errorDetail = `
      <div class="error-detail">
        <p class="error-detail-title">${i18n.t("error_page.technical_details")}</p>
        <code>${safeMessage}</code>
      </div>`;
	}

	return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>Halaman tidak dapat dimuat</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; }
      body { 
        font-family: 'Inter', system-ui, -apple-system, sans-serif; 
        background: #fafafa; /* neutral-50 */
        color: #171717; /* neutral-900 */
        display: flex; 
        flex-direction: column;
        align-items: center; 
        justify-content: center; 
        min-height: 100vh; 
        margin: 0; 
        padding: 3rem;
        text-align: center;
      }
      .visual-wrapper {
        margin-bottom: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .illustration {
        width: 12rem;
        height: 12rem;
        object-fit: contain;
        mix-blend-mode: multiply;
        opacity: 0.9;
      }
      .icon-wrapper {
        width: 5rem;
        height: 5rem;
        border-radius: 9999px;
        background-color: #fff1f2; /* rose-50 */
        display: none; /* hidden by default, shown if image fails */
        align-items: center;
        justify-content: center;
      }
      .icon-svg {
        width: 2.5rem;
        height: 2.5rem;
        color: #f43f5e; /* rose-500 */
      }
      .content {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 32rem;
      }
      h1 { 
        font-size: 1.5rem; 
        font-weight: 700;
        letter-spacing: -0.025em;
        margin: 0; 
      }
      p { 
        font-size: 0.9375rem;
        color: #737373; /* neutral-500 */
        line-height: 1.625;
        margin: 0; 
        padding: 0 1.5rem;
      }
      .error-detail {
        margin-top: 1rem;
        padding: 1rem;
        border-radius: 0.5rem;
        background-color: #f8fafc; /* slate-50 */
        border: 1px solid #f1f5f9; /* slate-100 */
        font-size: 0.75rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        color: #94a3b8; /* slate-400 */
        text-align: left;
        overflow: auto;
        max-height: 8rem;
        width: 100%;
      }
      .error-detail-title {
        font-weight: 700;
        margin: 0 0 0.25rem 0;
        padding: 0;
        opacity: 0.8;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 0.5625rem;
      }
      .error-detail code {
        white-space: pre-wrap;
      }
      .actions { 
        display: flex; 
        gap: 1rem; 
        justify-content: center; 
        flex-wrap: wrap; 
        margin-top: 2.5rem;
      }
      a, button { 
        height: 3rem;
        padding: 0 2rem;
        border-radius: 0.5rem; 
        font-family: inherit;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer; 
        text-decoration: none; 
        border: 1px solid transparent; 
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      .primary { 
        background: #0c8c5e; /* mint-green */
        color: #fff; 
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
      }
      .primary:hover {
        background: rgba(12, 140, 94, 0.9); /* hover:bg-mint-green/90 */
      }
      .secondary { 
        background: #fff; 
        color: #171717; 
        border-color: #e5e5e5; /* neutral-200 */
      }
      .secondary:hover {
        background: #f5f5f5; /* neutral-100 */
      }
    </style>
  </head>
  <body>
    <div class="visual-wrapper">
      <img 
        src="/assets/empty/error.webp" 
        alt="Error Illustration" 
        class="illustration"
        onerror="this.style.display='none'; document.getElementById('fallback-icon').style.display='flex';"
      />
      <div id="fallback-icon" class="icon-wrapper">
        <svg class="icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
    </div>
    <div class="content">
      <h1>Halaman tidak dapat dimuat</h1>
      <p>Terjadi kesalahan pada sistem kami. Anda dapat mencoba memuat ulang halaman atau kembali ke beranda.</p>
      ${errorDetail}
    </div>
    <div class="actions">
      <button class="primary" onclick="location.reload()">Coba Lagi</button>
      <a class="secondary" href="/">Kembali ke Beranda</a>
    </div>
  </body>
</html>`;
}
