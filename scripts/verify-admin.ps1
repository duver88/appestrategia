# Verificación de los criterios de aceptación del ajuste (panel super admin).
# Uso: powershell -File scripts/verify-admin.ps1 (con el server en :3100)
$base = "http://localhost:3100"
$results = @()

function Login($email, $pass) {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $csrf = (Invoke-RestMethod -Uri "$base/api/auth/csrf" -WebSession $s).csrfToken
  $body = "csrfToken=$([uri]::EscapeDataString($csrf))&email=$([uri]::EscapeDataString($email))&password=$([uri]::EscapeDataString($pass))"
  try {
    Invoke-WebRequest -Uri "$base/api/auth/callback/credentials" -Method POST -Body $body `
      -ContentType "application/x-www-form-urlencoded" -WebSession $s -UseBasicParsing `
      -MaximumRedirection 0 -ErrorAction Stop | Out-Null
  } catch {}
  return $s
}

function Check($name, $condition) {
  $script:results += [pscustomobject]@{ Test = $name; Ok = [bool]$condition }
}

function StatusOf($scriptblock) {
  try { $r = & $scriptblock; return [int]$r.StatusCode } catch { return [int]$_.Exception.Response.StatusCode }
}

# Sesiones
$cli = Login "cliente-e2e@test.local" "demo-pass-1234"
$adm = Login $env:ADMIN_EMAIL $env:ADMIN_PASS

# 1. CLIENT no accede a /api/admin/* (criterio 6)
Check "CLIENT /api/admin/clients = 403" ((StatusOf { Invoke-WebRequest -Uri "$base/api/admin/clients" -WebSession $cli -UseBasicParsing -ErrorAction Stop }) -eq 403)
Check "CLIENT /api/admin/settings = 403" ((StatusOf { Invoke-WebRequest -Uri "$base/api/admin/settings" -WebSession $cli -UseBasicParsing -ErrorAction Stop }) -eq 403)
Check "CLIENT /api/admin/usage = 403"    ((StatusOf { Invoke-WebRequest -Uri "$base/api/admin/usage" -WebSession $cli -UseBasicParsing -ErrorAction Stop }) -eq 403)

# 2. Regresión: el cliente sigue operando igual (criterio 1)
$projects = Invoke-RestMethod -Uri "$base/api/projects" -WebSession $cli
Check "CLIENT ve sus proyectos" (@($projects).Count -ge 1)
$pid1 = @($projects)[0].id
Check "CLIENT lee sus secciones" ((StatusOf { Invoke-WebRequest -Uri "$base/api/sections?projectId=$pid1" -WebSession $cli -UseBasicParsing -ErrorAction Stop }) -eq 200)

# 3. Admin: lista clientes y detalle
$clients = Invoke-RestMethod -Uri "$base/api/admin/clients" -WebSession $adm
Check "ADMIN lista clientes" (@($clients).Count -ge 2)
$clientA = @($clients) | Where-Object { $_.email -eq "cliente-e2e@test.local" }
Check "ADMIN ve fecha de membresia" ($null -ne $clientA.membershipExpiresAt)

# 4. Membresía: suspender bloquea con MEMBERSHIP_EXPIRED, reactivar restaura (criterio 2)
Invoke-RestMethod -Uri "$base/api/admin/clients/$($clientA.id)" -Method PATCH -WebSession $adm `
  -ContentType "application/json" -Body '{"status":"SUSPENDED"}' | Out-Null
$blockedStatus = StatusOf { Invoke-WebRequest -Uri "$base/api/chat" -Method POST -WebSession $cli `
  -ContentType "application/json" -Body "{`"projectId`":`"$pid1`",`"message`":`"hola`"}" -UseBasicParsing -ErrorAction Stop }
Check "Suspendido: chat = 403" ($blockedStatus -eq 403)
Invoke-RestMethod -Uri "$base/api/admin/clients/$($clientA.id)" -Method PATCH -WebSession $adm `
  -ContentType "application/json" -Body '{"status":"ACTIVE","extendDays":30}' | Out-Null
Check "Reactivado: secciones = 200" ((StatusOf { Invoke-WebRequest -Uri "$base/api/sections?projectId=$pid1" -WebSession $cli -UseBasicParsing -ErrorAction Stop }) -eq 200)

# 5. Prompts: guardar crea versión nueva activa; restaurar funciona (criterio 3)
$v = Invoke-RestMethod -Uri "$base/api/admin/prompts/master_rules" -WebSession $adm
$before = @($v)[0].version
$saved = Invoke-RestMethod -Uri "$base/api/admin/prompts/master_rules" -Method POST -WebSession $adm `
  -ContentType "application/json" -Body (@{action="save";content="# PRUEBA verificacion v$($before+1)"} | ConvertTo-Json)
Check "Prompt: guardar crea v$($before+1)" ($saved.version -eq ($before + 1))
$v2 = Invoke-RestMethod -Uri "$base/api/admin/prompts/master_rules" -WebSession $adm
$active = @($v2) | Where-Object { $_.isActive }
Check "Prompt: nueva version activa" ($active.version -eq $saved.version -and $active.content -like "*PRUEBA verificacion*")
Invoke-RestMethod -Uri "$base/api/admin/prompts/master_rules" -Method POST -WebSession $adm `
  -ContentType "application/json" -Body '{"action":"activate","version":1}' | Out-Null
$v3 = Invoke-RestMethod -Uri "$base/api/admin/prompts/master_rules" -WebSession $adm
Check "Prompt: restaurar v1" ((@($v3) | Where-Object { $_.isActive }).version -eq 1)

# 6. Credenciales: nunca en claro (criterio 4/11)
$fakeKey = "sk-test-veryfake-key-abcd1234WXYZ"
Invoke-RestMethod -Uri "$base/api/admin/credentials" -Method PUT -WebSession $adm `
  -ContentType "application/json" -Body (@{provider="deepseek";apiKey=$fakeKey} | ConvertTo-Json) | Out-Null
$creds = Invoke-RestMethod -Uri "$base/api/admin/credentials" -WebSession $adm
$ds = @($creds) | Where-Object { $_.provider -eq "deepseek" }
Check "Credencial guardada y enmascarada" ($ds.configured -and $ds.maskedKey -like "*····*")
Check "La key completa NO aparece en la respuesta" (-not (($creds | ConvertTo-Json -Depth 5) -like "*$fakeKey*"))
Invoke-RestMethod -Uri "$base/api/admin/credentials?provider=deepseek" -Method DELETE -WebSession $adm | Out-Null

# 7. Uso
$usage = Invoke-RestMethod -Uri "$base/api/admin/usage" -WebSession $adm
Check "Resumen de uso responde" ($null -ne $usage.total)

$results | Format-Table -AutoSize
$failed = @($results | Where-Object { -not $_.Ok }).Count
"`n$(@($results).Count - $failed)/$(@($results).Count) pruebas OK"
if ($failed -gt 0) { exit 1 }
