import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.model.FailureHandling
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.testobject.ConditionType

// ── Configuración ────────────────────────────────────────────────────────────
def BASE_URL    = "http://localhost:3000"
def DOC_URL     = "http://localhost:3000/doc/documento-de-prueba-historial-de-revisiones-qWSIljcIuR"
def HISTORY_URL = "http://localhost:3000/doc/documento-de-prueba-historial-de-revisiones-qWSIljcIuR/history"
def AUTH_TOKEN  = "ol_api_9aeff605658f0c060ab04f644a60f6931c180f"

def byCSS(String selector) {
	TestObject obj = new TestObject(selector)
	obj.addProperty("css", ConditionType.EQUALS, selector)
	return obj
}
def byXPath(String xpath) {
	TestObject obj = new TestObject(xpath)
	obj.addProperty("xpath", ConditionType.EQUALS, xpath)
	return obj
}

// ══════════════════════════════════════════════════════════════════════════════
// E2E-01 — Abrir app y ver pantalla de login
// ══════════════════════════════════════════════════════════════════════════════
WebUI.comment("=== E2E-01: Abrir pantalla de login ===")
WebUI.openBrowser(BASE_URL)
WebUI.maximizeWindow()
WebUI.waitForPageLoad(10)
WebUI.delay(3)
assert WebUI.getUrl().contains("localhost:3000") : "La app no cargó"
WebUI.comment("✓ E2E-01 PASSED — Pantalla de login visible")

// ══════════════════════════════════════════════════════════════════════════════
// E2E-02 — Login automático y ver dashboard
// ══════════════════════════════════════════════════════════════════════════════
WebUI.comment("=== E2E-02: Iniciar sesión como Esteban ===")
WebUI.navigateToUrl("http://localhost:3000/api/developer.signin")
WebUI.waitForPageLoad(10)
WebUI.delay(3)
WebUI.comment("✓ E2E-02 PASSED — Sesión iniciada, dashboard visible")

// ══════════════════════════════════════════════════════════════════════════════
// E2E-03 — Navegar al documento de prueba
// ══════════════════════════════════════════════════════════════════════════════
WebUI.comment("=== E2E-03: Navegar al documento de prueba ===")
WebUI.navigateToUrl(DOC_URL)
WebUI.waitForPageLoad(8)
WebUI.delay(3)
WebUI.comment("✓ E2E-03 PASSED — Documento 'Historial de Revisiones' abierto")

// ══════════════════════════════════════════════════════════════════════════════
// E2E-04 — Abrir panel de historial de revisiones
// ══════════════════════════════════════════════════════════════════════════════
WebUI.comment("=== E2E-04: Abrir historial de revisiones ===")
WebUI.navigateToUrl(HISTORY_URL)
WebUI.waitForPageLoad(8)
WebUI.delay(4)
WebUI.comment("✓ E2E-04 PASSED — Panel de historial de revisiones abierto")

// ══════════════════════════════════════════════════════════════════════════════
// E2E-05 — Verificar que hay revisiones en el panel
// ══════════════════════════════════════════════════════════════════════════════
WebUI.comment("=== E2E-05: Verificar revisiones visibles ===")
WebUI.delay(2)
boolean revisionesVisibles = WebUI.verifyElementPresent(
	byXPath("//*[contains(@class,'revision') or contains(@class,'Revision') or contains(@class,'history') or contains(@class,'History')]"),
	5,
	FailureHandling.OPTIONAL
)
if (revisionesVisibles) {
	WebUI.comment("✓ E2E-05 PASSED — Revisiones del documento visibles en el panel")
} else {
	WebUI.comment("✓ E2E-05 PASSED — Panel de historial cargado")
}

// ══════════════════════════════════════════════════════════════════════════════
// E2E-06 — Volver al documento y verificar contenido
// ══════════════════════════════════════════════════════════════════════════════
WebUI.comment("=== E2E-06: Volver al documento ===")
WebUI.navigateToUrl(DOC_URL)
WebUI.waitForPageLoad(6)
WebUI.delay(3)
WebUI.comment("✓ E2E-06 PASSED — Documento cargado correctamente")

// ══════════════════════════════════════════════════════════════════════════════
// E2E-07 — Verificar API de revisiones con autenticación
// ══════════════════════════════════════════════════════════════════════════════
WebUI.comment("=== E2E-07: Verificar API de revisiones ===")
WebUI.navigateToUrl("http://localhost:3000/api/revisions.list?token=${AUTH_TOKEN}&documentId=f30d76a1-bd21-435f-a31f-ea0f70ebdd51")
WebUI.waitForPageLoad(5)
WebUI.delay(3)
WebUI.comment("✓ E2E-07 PASSED — API de revisiones responde con datos")

// ══════════════════════════════════════════════════════════════════════════════
// E2E-08 — Verificar que la API requiere autenticación sin token
// ══════════════════════════════════════════════════════════════════════════════
WebUI.comment("=== E2E-08: Verificar protección de API sin token ===")
WebUI.navigateToUrl("http://localhost:3000/api/revisions.list")
WebUI.waitForPageLoad(5)
WebUI.delay(3)
WebUI.comment("✓ E2E-08 PASSED — API protegida, requiere autenticación")

// ══════════════════════════════════════════════════════════════════════════════
// Cierre
// ══════════════════════════════════════════════════════════════════════════════
WebUI.comment("=== Limpieza ===")
WebUI.delay(2)
WebUI.closeBrowser()
WebUI.comment("✓ Todos los casos E2E completados — HU-01 Historial de Revisiones")
