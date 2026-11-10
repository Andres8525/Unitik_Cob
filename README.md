# Unitik-Cob

**Sistema web integrador OSS/BSS para UNITIK Internet Sin Límite S.A.S.**

Trabajo de Grado — Gobernanza de TI en ISP regionales bajo la norma **ISO/IEC 38500**, desarrollado con la metodología **OpenUP**.
Universidad Cooperativa de Colombia — Ingeniería de Software.

## Visión del producto

UNITIK es un ISP regional que opera en el municipio rural de Cumbitara, Nariño (Colombia), prestando internet por **Fibra Óptica** y **Radio Enlace**. Hoy, la validación de pagos (Nequi, transferencia, efectivo), la suspensión y la reconexión del servicio son procesos **manuales**: el personal administrativo verifica cada comprobante y notifica al área técnica para operar la RouterBoard MikroTik. Existe desarticulación entre la facturación (WhispHub) y la infraestructura de red, y no hay trazabilidad de operaciones.

**Unitik-Cob automatiza el ciclo completo pago → validación → reconexión**, integra la gestión administrativa con la red MikroTik/RouterBoard y genera registros auditables alineados con los 6 principios de ISO/IEC 38500: responsabilidad, estrategia, adquisición, desempeño, conformidad y comportamiento humano.

Ver [docs/vision.md](docs/vision.md) para el documento de visión completo (artefacto OpenUP).

## Stack tecnológico

| Capa     | Tecnología                                                              |
| -------- | ----------------------------------------------------------------------- |
| Backend  | Node.js 20 · NestJS 10 · TypeScript 5 strict · Prisma 5 · PostgreSQL 16 |
| Colas    | Redis 7 + BullMQ (reintentos ante conectividad intermitente)            |
| Frontend | React 18 · Vite · TailwindCSS · TanStack Query · Zustand                |
| Red      | node-routeros (RouterOS API — MikroTik RouterBoard)                     |
| Infra    | Docker Compose · Nginx · GitHub Actions                                 |

## Inicio rápido

Requisitos: Docker Desktop y (para desarrollo) Node.js 20+ con pnpm 9.

```bash
# 1. Variables de entorno
cp .env.example .env

# 2. Levantar todo el ambiente (PostgreSQL + Redis + API + Web)
docker compose up -d

# 3. Aplicar migraciones y sembrar datos iniciales
pnpm install
pnpm --filter @unitik/api prisma:migrate
pnpm --filter @unitik/api prisma:seed
```

- Web: http://localhost:8080 (vía Docker) o `pnpm dev` → http://localhost:5173
- API: http://localhost:3000/health
- Swagger: http://localhost:3000/api/docs

## Demo frontend en Vercel

El repositorio incluye una configuración de Vercel para compilar y publicar únicamente la SPA de `apps/web`. El modo demo está activado por defecto y no requiere desplegar la API, PostgreSQL ni Redis.

1. Importa el repositorio en Vercel y deja **Root Directory** como raíz del repositorio.
2. Usa la configuración de compilación de `vercel.json` (`pnpm install --frozen-lockfile`, `pnpm --filter @unitik/web build`, salida `apps/web/dist`).
3. No configures secretos ni variables de base de datos en este proyecto frontend.
4. Publica el sitio y verifica una ruta directa como `/admin/clientes`; Vercel la reescribe a la SPA.

En el inicio de sesión puedes entrar con los botones de demostración para administrador, técnico, cajero o cliente. Las operaciones se simulan y los cambios se guardan en el almacenamiento local de ese navegador; no se comparten entre personas ni dispositivos. El aviso **Modo demo** se mantiene visible y permite restablecer los datos. No ingreses información real.

Para apagar el modo demo más adelante, configura `VITE_DEMO_MODE=false` y despliega también el backend. Si la API tiene otro dominio, configura `VITE_API_URL` con su origen público (por ejemplo, `https://api.ejemplo.com`). Antes de hacerlo deben configurarse PostgreSQL, Redis, secretos, migraciones y las integraciones reales; el frontend actual, por sí solo, no ofrece persistencia ni autenticación de producción.

## Estructura del monorepo

```
apps/api        → Backend NestJS (módulos por dominio + gobernanza)
apps/web        → Frontend React (paneles admin/técnico/cajero/cliente)
packages/shared-types → Tipos compartidos front-back
docs/           → Artefactos OpenUP y políticas ISO/IEC 38500
```

## Gobernanza de TI (ISO/IEC 38500)

Cuatro políticas implementadas como módulos NestJS (ver [docs/policies/](docs/policies/)):

1. **Gestión de pagos y reconexión** — Desempeño + Conformidad
2. **Control de acceso a la red** — Responsabilidad + Comportamiento humano
3. **Trazabilidad de la información** — Conformidad + Responsabilidad
4. **Continuidad del servicio** — Estrategia + Desempeño

Toda operación crítica queda registrada en `audit_log` (append-only) con usuario, IP, acción, valores anteriores/nuevos y principio ISO/IEC 38500 aplicable.

## Metodología (OpenUP)

| Fase            | Iteraciones | Estado                                                        |
| --------------- | ----------- | ------------------------------------------------------------- |
| 1. Inicio       | 0           | ✅ Cerrada (2026-07-04)                                       |
| 2. Elaboración  | 1–2         | ✅ Cerrada (2026-07-06) — arquitectura validada por prototipo |
| 3. Construcción | 3–6         | ✅ Cerrada (2026-07-08) — sistema funcional completo          |
| 4. Transición   | 7–8         | 🔄 En curso — Iteración 7                                     |

Artefactos: [visión](docs/vision.md) · [casos de uso](docs/use-cases.md) · [riesgos](docs/risk-list.md) · [matriz ISO/IEC 38500](docs/iso-38500-matrix.md) · [planes de iteración](docs/iteration-plans/)

## Convenciones

- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`…)
- Código y comentarios técnicos en **inglés**; UI y documentación funcional en **español**
- Timezone: `America/Bogota` · Moneda: COP `$ 1.234.567` sin decimales
- Cobertura mínima de tests: **70 %**
