# start-dev.ps1 — Levanta Outline (backend + frontend) limpio
# Uso: .\start-dev.ps1

Write-Host "`n=== Matando procesos viejos en puertos 3000 / 3001 ===" -ForegroundColor Yellow

foreach ($port in @(3000, 3001)) {
    $pids = (netstat -ano | Select-String ":$port\s" | ForEach-Object {
        ($_ -split '\s+')[-1]
    } | Sort-Object -Unique)

    foreach ($p in $pids) {
        if ($p -match '^\d+$' -and $p -ne '0') {
            try {
                Stop-Process -Id $p -Force -ErrorAction Stop
                Write-Host "  Killed PID $p (puerto $port)" -ForegroundColor Green
            } catch {
                # ya no existe
            }
        }
    }
}

Start-Sleep -Seconds 1

Write-Host "`n=== Compilando backend ===" -ForegroundColor Cyan
yarn build:server
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: build:server falló" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Levantando backend + frontend ===" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3001/static/" -ForegroundColor Green
Write-Host "(Ctrl+C para detener)`n"

yarn dev:watch
