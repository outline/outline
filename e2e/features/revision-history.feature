# language: es
# HU-01: Filtrado del historial de revisiones por colaborador y rango de fechas
# Proyecto: Outline — Wiki colaborativo
# Patrón: Gherkin BDD + Screenplay

Característica: Filtrado del historial de revisiones
  Como usuario de Outline con acceso a un documento
  Quiero filtrar el historial de revisiones por colaborador y rango de fechas
  Para encontrar rápidamente los cambios que me interesan

  Antecedentes:
    Dado que existe un documento llamado "Manual de Bienvenida"
    Y el documento tiene 3 revisiones registradas

  # ── Escenarios de filtrado por colaborador ────────────────────────────────

  Esquema del escenario: Filtrar revisiones por colaborador
    Dado que el colaborador "<colaborador>" realizó cambios en el documento
    Cuando el usuario filtra el historial por el colaborador "<colaborador>"
    Entonces debe ver solo "<cantidad>" revisión(es) en el historial

    Ejemplos:
      | colaborador | cantidad |
      | Ana García  | 2        |
      | Luis Pérez  | 1        |

  # ── Escenarios de filtrado por rango de fechas ───────────────────────────

  Escenario: Filtrar revisiones desde una fecha específica
    Dado que existen revisiones antes y después del "2026-03-01"
    Cuando el usuario filtra el historial desde la fecha "2026-03-01"
    Entonces debe ver solo las revisiones posteriores al "2026-03-01"

  Escenario: Filtrar revisiones hasta una fecha específica
    Dado que existen revisiones antes y después del "2026-03-01"
    Cuando el usuario filtra el historial hasta la fecha "2026-03-01"
    Entonces debe ver solo las revisiones anteriores al "2026-03-01"

  Escenario: Filtrar por rango de fechas completo
    Dado que existen revisiones en enero, marzo y junio de 2026
    Cuando el usuario filtra desde "2026-02-01" hasta "2026-05-31"
    Entonces debe ver solo las revisiones de marzo de 2026

  # ── Escenarios de filtrado combinado ─────────────────────────────────────

  Escenario: Filtrar por colaborador y rango de fechas simultáneamente
    Dado que "Ana García" hizo revisiones en enero y abril de 2026
    Y que "Luis Pérez" hizo una revisión en abril de 2026
    Cuando el usuario filtra por "Ana García" desde "2026-03-01" hasta "2026-06-30"
    Entonces debe ver solo 1 revisión de "Ana García" en el rango

  Escenario: Filtro sin coincidencias retorna lista vacía
    Dado que el documento no tiene revisiones de "Carlos Ruiz"
    Cuando el usuario filtra por el colaborador "Carlos Ruiz"
    Entonces debe ver un mensaje indicando que no hay revisiones

  # ── Escenarios de validación ─────────────────────────────────────────────

  Escenario: Rango de fechas invertido es rechazado
    Cuando el usuario intenta filtrar desde "2026-06-01" hasta "2026-01-01"
    Entonces debe ver un error indicando que el rango de fechas es inválido

  Escenario: Sin filtros se muestran todas las revisiones
    Cuando el usuario abre el historial sin aplicar ningún filtro
    Entonces debe ver las 3 revisiones del documento
