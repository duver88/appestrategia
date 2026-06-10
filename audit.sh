#!/usr/bin/env bash
###############################################################################
# AUDITORÍA ESTRICTA — LIONSCORE CONTENT ENGINE
# Veredictos automáticos. Sin opinión. Exit code 1 si CUALQUIER check FALLA.
#
# Uso:
#   ./audit.sh                  → checks estáticos (código y schema)
#   ./audit.sh dynamic          → además, checks contra la app corriendo
#
# Para el modo dynamic, exportar antes:
#   export BASE_URL="https://tuapp.com"
#   export CLIENT_A_COOKIE="..."        # cookie de sesión de un cliente de prueba
#   export CLIENT_B_PROJECT_ID="..."    # id de un proyecto de OTRO cliente
#
# REGLA ANTI-TRAMPA: este archivo solo puede modificarlo el dueño del proyecto.
# Adaptar rutas/nombres requiere su aprobación explícita por cada línea.
# PROHIBIDO eliminar, comentar o suavizar checks para que pasen.
###############################################################################
set -uo pipefail

PASS=0; FAIL=0; WARN=0; CRITICAL_FAIL=0
declare -a FAILED_CHECKS

ok()   { PASS=$((PASS+1));  printf "  \033[32mPASA \033[0m  %s\n" "$1"; }
warn() { WARN=$((WARN+1));  printf "  \033[33mAVISO\033[0m  %s\n" "$1"; }
fail() { FAIL=$((FAIL+1));  FAILED_CHECKS+=("$2 — $1"); printf "  \033[31mFALLA\033[0m  [%s] %s\n" "$2" "$1"; }
crit() { CRITICAL_FAIL=$((CRITICAL_FAIL+1)); fail "$1" "$2"; }
section(){ printf "\n\033[1m== %s ==\033[0m\n" "$1"; }

# Directorios de código (ajustables SOLO con aprobación del dueño)
SRC_DIRS="app components lib"
TOKEN_FILE_HINT="tokens\|globals.css\|theme"

###############################################################################
section "S1 · SEGURIDAD ESTÁTICA (los FALLA de esta sección son CRÍTICOS)"
###############################################################################

# S1.1 — .env ignorado por git
if [ -f .gitignore ] && grep -qE "^\.env(\..*)?$|^\.env$" .gitignore; then
  ok "S1.1 .env está en .gitignore"
else
  crit "S1.1 .env NO está en .gitignore" "S1.1"
fi

# S1.2 — secretos commiteados en archivos rastreados
HITS=$(git grep -nIE "sk-ant-[A-Za-z0-9]|sk-proj-[A-Za-z0-9]|AKIA[0-9A-Z]{16}" -- ':!*.example' ':!audit.sh' 2>/dev/null | head -5)
if [ -z "$HITS" ]; then ok "S1.2 Sin API keys reales en el repositorio"
else crit "S1.2 Posibles keys commiteadas: $HITS" "S1.2"; fi

# S1.3 — keys en logs
HITS=$(grep -rnE "console\.(log|error|warn)\(.*([aA]pi[_]?[kK]ey|encryptedKey|decrypt)" $SRC_DIRS --include="*.ts" --include="*.tsx" 2>/dev/null | head -5)
if [ -z "$HITS" ]; then ok "S1.3 Ningún console.log expone keys/decrypt"
else crit "S1.3 Logs que pueden exponer keys: $HITS" "S1.3"; fi

# S1.4 — cifrado: existe módulo crypto con AES-256-GCM y sin algoritmos débiles
CRYPTO=$(grep -rln "aes-256-gcm" lib 2>/dev/null | head -1)
if [ -n "$CRYPTO" ]; then
  ok "S1.4 Cifrado AES-256-GCM presente en $CRYPTO"
  if grep -rqnE "aes-128|aes.*ecb|createCipher\(" lib 2>/dev/null; then
    crit "S1.4b Algoritmo débil o createCipher (deprecado) detectado en lib/" "S1.4b"
  else ok "S1.4b Sin algoritmos de cifrado débiles"; fi
else
  crit "S1.4 No se encontró 'aes-256-gcm' en lib/ — ¿las keys se cifran?" "S1.4"
fi

# S1.5 — toda ruta admin verifica SUPER_ADMIN dentro del handler
ADMIN_FILES=$(find app/api/admin -name "route.ts" -o -name "route.tsx" 2>/dev/null)
if [ -z "$ADMIN_FILES" ]; then
  crit "S1.5 No existe app/api/admin/**/route.ts" "S1.5"
else
  MISSING=""
  for f in $ADMIN_FILES; do
    grep -qE "SUPER_ADMIN" "$f" || MISSING="$MISSING $f"
  done
  if [ -z "$MISSING" ]; then ok "S1.5 Todos los handlers admin ($(echo "$ADMIN_FILES" | wc -l)) verifican SUPER_ADMIN en el propio archivo"
  else crit "S1.5 Handlers admin SIN verificación propia de rol:$MISSING" "S1.5"; fi
fi

# S1.6 — heurística multi-tenant: handlers de cliente con queries Prisma deben referenciar la sesión/clientId
NO_TENANT=""
for f in $(find app/api -name "route.ts" 2>/dev/null | grep -v "/admin/" | grep -v "/auth"); do
  if grep -qE "prisma\.(project|section|message|usageLog)" "$f"; then
    grep -qE "clientId|session" "$f" || NO_TENANT="$NO_TENANT $f"
  fi
done
if [ -z "$NO_TENANT" ]; then ok "S1.6 Handlers de cliente con queries referencian clientId/sesión (heurística)"
else crit "S1.6 Handlers con queries de datos SIN referencia a clientId/sesión:$NO_TENANT" "S1.6"; fi

# S1.7 — proveedores LLM solo vía abstracción
HITS=$(grep -rnE "new Anthropic\(|new OpenAI\(|api\.anthropic\.com|api\.openai\.com|api\.deepseek\.com" $SRC_DIRS --include="*.ts*" 2>/dev/null | grep -v "lib/llm" | head -5)
if [ -z "$HITS" ]; then ok "S1.7 Llamadas a proveedores solo desde lib/llm"
else fail "S1.7 Llamadas directas a proveedores fuera de la abstracción: $HITS" "S1.7"; fi

###############################################################################
section "S2 · BASE DE DATOS Y MIGRACIONES"
###############################################################################

# S2.1 — migraciones destructivas
HITS=$(grep -rniE "DROP TABLE|DROP COLUMN|ALTER TABLE .* RENAME" prisma/migrations 2>/dev/null | head -5)
if [ -z "$HITS" ]; then ok "S2.1 Ninguna migración contiene DROP/RENAME destructivo"
else crit "S2.1 Migraciones destructivas: $HITS" "S2.1"; fi

# S2.2 — schema contiene los modelos y campos requeridos
SCHEMA="prisma/schema.prisma"
if [ ! -f "$SCHEMA" ]; then crit "S2.2 No existe $SCHEMA" "S2.2"; else
  for REQ in "SUPER_ADMIN" "membershipExpiresAt" "model ApiCredential" "model PromptTemplate" "model UsageLog" "model Setting" "encryptedKey"; do
    if grep -q "$REQ" "$SCHEMA"; then ok "S2.2 Schema contiene: $REQ"
    else fail "S2.2 Schema NO contiene: $REQ" "S2.2"; fi
  done
  grep -q "phaseId, version" "$SCHEMA" && ok "S2.2 PromptTemplate con unique(phaseId,version)" \
    || fail "S2.2 Falta @@unique([phaseId, version]) en PromptTemplate" "S2.2"
fi

###############################################################################
section "S3 · ARQUITECTURA"
###############################################################################

# S3.1 — prompts desde DB, no desde archivos en runtime
HITS=$(grep -rnE "readFile.*prompts/|readFileSync.*prompts/" $SRC_DIRS --include="*.ts" 2>/dev/null | grep -viE "seed|script|fallback" | head -5)
if [ -z "$HITS" ]; then ok "S3.1 Runtime no lee prompts desde archivos (solo seed/fallback)"
else fail "S3.1 Lectura de prompts desde archivos en runtime: $HITS" "S3.1"; fi
grep -rq "getActivePrompt\|promptTemplate.findFirst" $SRC_DIRS 2>/dev/null \
  && ok "S3.1b Existe lectura de PromptTemplate activa" \
  || fail "S3.1b No se encontró lectura de PromptTemplate en el código" "S3.1b"

# S3.2 — UsageLog en el flujo del LLM
grep -rq "usageLog.create\|UsageLog" $SRC_DIRS --include="*.ts" 2>/dev/null \
  && ok "S3.2 Registro de UsageLog presente" \
  || fail "S3.2 No se registra UsageLog en ninguna parte" "S3.2"

# S3.3 — el PDF no usa el transcript de mensajes
PDF_FILES=$(grep -rln "puppeteer\|page.pdf" lib app 2>/dev/null)
if [ -n "$PDF_FILES" ]; then
  BAD=$(echo "$PDF_FILES" | xargs grep -ln "prisma.message\|messages" 2>/dev/null | head -3)
  if [ -z "$BAD" ]; then ok "S3.3 La generación de PDF no consulta mensajes (solo Sections)"
  else crit "S3.3 El PDF consulta mensajes del chat: $BAD" "S3.3"; fi
else warn "S3.3 No se localizó el módulo PDF — verificar manualmente"; fi

# S3.4 — validadores del calendario
grep -rqE "angulos|formatos.*distintos|confirmedByClient" lib 2>/dev/null \
  && ok "S3.4 Validadores del calendario presentes en lib/" \
  || fail "S3.4 No se encontraron los validadores del calendario (ángulos/formatos/FOMO)" "S3.4"

# S3.5 — contenido prohibido
HITS=$(grep -rn "Vehículo Azul" $SRC_DIRS prisma scripts 2>/dev/null | grep -v audit.sh | head -3)
if [ -z "$HITS" ]; then ok "S3.5 'Vehículo Azul' no aparece en el código"
else fail "S3.5 'Vehículo Azul' encontrado: $HITS" "S3.5"; fi

###############################################################################
section "S4 · DISEÑO"
###############################################################################

# S4.1 — emojis en UI (requiere GNU grep -P)
if echo test | grep -P "t" >/dev/null 2>&1; then
  HITS=$(grep -rPn "[\x{1F300}-\x{1FAFF}]|[\x{2700}-\x{27BF}]|[\x{2600}-\x{26FF}]" app components --include="*.tsx" 2>/dev/null | head -5)
  if [ -z "$HITS" ]; then ok "S4.1 Cero emojis en la interfaz"
  else fail "S4.1 Emojis encontrados en UI: $HITS" "S4.1"; fi
else warn "S4.1 grep -P no disponible — verificar emojis manualmente"; fi

# S4.2 — hex sueltos fuera del archivo de tokens
HITS=$(grep -rn "#[0-9a-fA-F]\{6\}" app components --include="*.tsx" 2>/dev/null | grep -viE "$TOKEN_FILE_HINT" | head -8)
if [ -z "$HITS" ]; then ok "S4.2 Sin colores hex fuera del archivo de tokens"
else warn "S4.2 Hex sueltos (deben migrar a tokens): $(echo "$HITS" | wc -l) ocurrencias, ej: $(echo "$HITS" | head -2)"; fi

# S4.3 — el cian nunca como color de texto
HITS=$(grep -rnE "color:\s*#12FDEE|color:\s*var\(--cyan-400\)|text-\[#12FDEE\]" app components 2>/dev/null | head -3)
if [ -z "$HITS" ]; then ok "S4.3 #12FDEE no se usa como color de texto"
else fail "S4.3 Cian usado como texto (ilegible sobre blanco): $HITS" "S4.3"; fi

# S4.4 — tipografía
grep -rq "Nunito_Sans\|Nunito Sans" app 2>/dev/null \
  && ok "S4.4 Nunito Sans cargada" || fail "S4.4 Nunito Sans no encontrada en app/" "S4.4"

###############################################################################
section "S5 · TESTS"
###############################################################################

if [ -f package.json ] && grep -q "test:audit" package.json; then
  ok "S5.1 Existe el comando npm run test:audit"
  printf "  \033[36mEJEC \033[0m  Ejecutando suite test:audit (esto puede tardar)...\n"
  if npm run test:audit --silent > /tmp/test_audit_out.txt 2>&1; then
    ok "S5.2 Suite test:audit PASA completa ($(grep -cE 'passed|✓' /tmp/test_audit_out.txt 2>/dev/null || echo '?') tests)"
  else
    crit "S5.2 Suite test:audit FALLA — ver /tmp/test_audit_out.txt" "S5.2"
  fi
else
  crit "S5.1 No existe 'test:audit' en package.json — la suite obligatoria no está" "S5.1"
fi

###############################################################################
# MODO DYNAMIC — contra la app corriendo
###############################################################################
if [ "${1:-}" = "dynamic" ]; then
section "S6 · PRUEBAS DINÁMICAS (app corriendo)"
  if [ -z "${BASE_URL:-}" ]; then
    crit "S6.0 BASE_URL no definida — exportar variables (ver cabecera del script)" "S6.0"
  else
    code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

    # S6.1 admin sin sesión → 401/403/redirect
    C=$(code "$BASE_URL/api/admin/clients")
    case "$C" in 401|403|307|308) ok "S6.1 /api/admin sin sesión → $C (bloqueado)";;
      *) crit "S6.1 /api/admin sin sesión respondió $C (esperado 401/403)" "S6.1";; esac

    if [ -n "${CLIENT_A_COOKIE:-}" ]; then
      # S6.2 cliente contra admin → bloqueado
      C=$(code -H "Cookie: $CLIENT_A_COOKIE" "$BASE_URL/api/admin/clients")
      case "$C" in 401|403) ok "S6.2 CLIENT contra /api/admin → $C (bloqueado)";;
        *) crit "S6.2 CLIENT accedió a /api/admin con código $C" "S6.2";; esac

      # S6.3 cliente A contra proyecto de cliente B → bloqueado
      if [ -n "${CLIENT_B_PROJECT_ID:-}" ]; then
        C=$(code -H "Cookie: $CLIENT_A_COOKIE" "$BASE_URL/api/projects/$CLIENT_B_PROJECT_ID")
        case "$C" in 401|403|404) ok "S6.3 Cliente A contra proyecto de B → $C (bloqueado)";;
          *) crit "S6.3 FUGA MULTI-TENANT: cliente A leyó proyecto de B (código $C)" "S6.3";; esac
      else warn "S6.3 CLIENT_B_PROJECT_ID no definido — prueba multi-tenant omitida"; fi

      # S6.4 la respuesta de credenciales no contiene keys en claro
      BODY=$(curl -s -H "Cookie: $CLIENT_A_COOKIE" "$BASE_URL/api/admin/credentials")
      if echo "$BODY" | grep -qE "sk-ant-[A-Za-z0-9]{8}|sk-proj-[A-Za-z0-9]{8}"; then
        crit "S6.4 Una respuesta de API contiene una key en claro" "S6.4"
      else ok "S6.4 Sin keys en claro en respuestas de red"; fi
    else
      warn "S6.x CLIENT_A_COOKIE no definida — pruebas con sesión omitidas (definirla para auditoría completa)"
    fi
  fi
fi

###############################################################################
# VEREDICTO
###############################################################################
printf "\n\033[1m================= VEREDICTO =================\033[0m\n"
printf "  PASA: %d   FALLA: %d (críticos: %d)   AVISOS: %d\n" "$PASS" "$FAIL" "$CRITICAL_FAIL" "$WARN"
if [ "$FAIL" -gt 0 ]; then
  printf "\n\033[31mCHECKS FALLIDOS:\033[0m\n"
  for c in "${FAILED_CHECKS[@]}"; do printf "  ✗ %s\n" "$c"; done
  printf "\n\033[31m✗ AUDITORÍA FALLIDA — PROHIBIDO DESPLEGAR.\033[0m\n"
  printf "  Corregir cada check (skill lionscore-prod-safe) y re-ejecutar COMPLETO.\n"
  exit 1
else
  printf "\n\033[32m✓ AUDITORÍA ESTÁTICA SUPERADA.\033[0m"
  printf "\n  Siguiente compuerta: ./audit.sh dynamic, luego el checklist manual.\n"
  exit 0
fi
