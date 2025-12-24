# Deployment Multi-Aplicación en Mismo VPS Hetzner

## Objetivo

Desplegar múltiples aplicaciones (Copilot y OnQuota) en el mismo servidor VPS de Hetzner (46.224.33.191) usando diferentes dominios pero compartiendo la misma IP pública.

## Arquitectura

### Configuración Actual
- **IP Pública**: 46.224.33.191
- **Aplicaciones**: Copilot (ya desplegado) + OnQuota (nuevo)
- **Puertos Compartidos**: 80 (HTTP) y 443 (HTTPS)

### Solución: Reverse Proxy Global con Caddy

```
┌─────────────────────────────────────────────────────┐
│           Internet (46.224.33.191)                  │
│              Puerto 80 (HTTP)                       │
│              Puerto 443 (HTTPS)                     │
└──────────────────────┬──────────────────────────────┘
                       │
                ┌──────▼───────┐
                │ CADDY GLOBAL │ ◄── Único punto de entrada
                │   (Puerto    │     SSL automático
                │   80/443)    │     Routing por hostname
                └──────┬───────┘
                       │
        ┌──────────────┼──────────────┐
        │                             │
  ┌─────▼─────┐               ┌───────▼────┐
  │  COPILOT  │               │  ONQUOTA   │
  │ (Existente)│              │   (Nuevo)  │
  ├───────────┤               ├────────────┤
  │Frontend   │               │Frontend    │
  │:3000      │               │:3000       │
  │Backend    │               │Backend     │
  │:3010      │               │:8000       │
  │Redis      │               │Redis       │
  │:6379      │               │:6379       │
  │PostgreSQL │               │PostgreSQL  │
  │:5432      │               │:5432       │
  └───────────┘               └────────────┘
```

## Configuración de Dominios

### Opción 1: Subdominios (Recomendado)
```
copilot.tudominio.com     → Copilot Frontend
api.copilot.tudominio.com → Copilot Backend
onquota.tudominio.com     → OnQuota Frontend
api.onquota.tudominio.com → OnQuota Backend
```

### Opción 2: Dominios Separados
```
copilot.com        → Copilot Frontend
api.copilot.com    → Copilot Backend
onquota.com        → OnQuota Frontend
api.onquota.com    → OnQuota Backend
```

### Opción 3: Solo IP (Sin Dominio)
```
46.224.33.191           → Copilot Frontend (default)
46.224.33.191/copilot   → Copilot Frontend
46.224.33.191/onquota   → OnQuota Frontend
```

## Paso 1: Crear Caddy Global

### 1.1. Crear Directorio Global de Caddy

```bash
# Conectar al VPS
ssh root@46.224.33.191

# Crear estructura
mkdir -p /opt/caddy-global
cd /opt/caddy-global
```

### 1.2. Crear Caddyfile Global

Crear `/opt/caddy-global/Caddyfile`:

```caddyfile
# ============================================================
# Caddy Global - Multi-Application Reverse Proxy
# ============================================================
# Handles routing for multiple applications on same VPS
# Automatic SSL for all domains
# ============================================================

{
    # Global options
    email admin@tudominio.com  # Para Let's Encrypt

    # Configuración de logs
    log {
        output file /var/log/caddy/access.log
        format json
        level INFO
    }
}

# ============================================================
# COPILOT - Aplicación Existente
# ============================================================

# Frontend Copilot
copilot.tudominio.com {
    encode gzip zstd

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Reverse proxy a Copilot frontend
    reverse_proxy copilot-frontend:3000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}

        # Health check
        health_uri /
        health_interval 30s
        health_timeout 5s
    }

    # Logs específicos de Copilot
    log {
        output file /var/log/caddy/copilot.log
        format json
    }
}

# API Copilot
api.copilot.tudominio.com {
    encode gzip zstd

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
    }

    # Reverse proxy a Copilot backend
    reverse_proxy copilot-api-gateway:3010 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}

        # Health check
        health_uri /api/v1/health
        health_interval 30s
        health_timeout 5s
    }

    log {
        output file /var/log/caddy/copilot-api.log
        format json
    }
}

# ============================================================
# ONQUOTA - Nueva Aplicación
# ============================================================

# Frontend OnQuota
onquota.tudominio.com {
    encode gzip zstd

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;"
    }

    # Reverse proxy a OnQuota frontend
    reverse_proxy onquota-frontend:3000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}

        # Health check
        health_uri /api/health
        health_interval 30s
        health_timeout 5s
    }

    log {
        output file /var/log/caddy/onquota.log
        format json
    }
}

# API OnQuota
api.onquota.tudominio.com {
    encode gzip zstd

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
    }

    # Reverse proxy a OnQuota backend
    reverse_proxy onquota-backend:8000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}

        # Health check
        health_uri /api/v1/health
        health_interval 30s
        health_timeout 5s
    }

    log {
        output file /var/log/caddy/onquota-api.log
        format json
    }
}

# ============================================================
# Servicios de Monitoring (Opcional)
# ============================================================

# Grafana (si está habilitado)
grafana.tudominio.com {
    encode gzip

    reverse_proxy copilot-grafana:3001 {
        header_up X-Real-IP {remote_host}
    }
}

# Flower - Celery Monitor de OnQuota
flower.onquota.tudominio.com {
    encode gzip

    # Basic auth para proteger
    basicauth {
        admin $2a$14$hashed_password_here
    }

    reverse_proxy onquota-flower:5555 {
        header_up X-Real-IP {remote_host}
    }
}

# ============================================================
# Default / Catch-all (Opcional)
# ============================================================

# Si alguien accede solo por IP o dominio no configurado
46.224.33.191, :80, :443 {
    respond "Multiple applications hosted. Use specific domain." 403
}
```

### 1.3. Crear docker-compose para Caddy Global

Crear `/opt/caddy-global/docker-compose.yml`:

```yaml
version: '3.8'

services:
  caddy-global:
    image: caddy:2-alpine
    container_name: caddy-global
    restart: unless-stopped

    ports:
      - "80:80"
      - "443:443"
      - "2019:2019"  # Admin API

    volumes:
      # Caddyfile
      - ./Caddyfile:/etc/caddy/Caddyfile:ro

      # Persistencia de certificados SSL
      - caddy_data:/data
      - caddy_config:/config

      # Logs
      - /var/log/caddy:/var/log/caddy

    networks:
      - copilot-network
      - onquota-network

    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:2019/config/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    labels:
      - "com.centurylinklabs.watchtower.enable=true"

volumes:
  caddy_data:
    driver: local
  caddy_config:
    driver: local

networks:
  copilot-network:
    external: true
  onquota-network:
    external: true
```

## Paso 2: Modificar Docker Compose de Copilot

### 2.1. Actualizar docker-compose de Copilot

En `/opt/copilot/docker-compose.yml`, **remover el servicio Caddy** (ya que usaremos el global):

```yaml
# ANTES: Copilot tenía su propio Caddy
# AHORA: Solo exponer servicios en red interna

services:
  # ELIMINAR o comentar el servicio caddy de Copilot
  # caddy:
  #   ...

  frontend:
    # ... resto de configuración
    # NO exponer puertos públicos, solo en red Docker
    # ports:  # ELIMINAR esta sección
    #   - "3000:3000"

    networks:
      - copilot-network
      - default

    # El resto de configuración igual

  api-gateway:
    # ... resto de configuración
    # NO exponer puertos públicos
    # ports:  # ELIMINAR
    #   - "3010:3010"

    networks:
      - copilot-network
      - default

networks:
  copilot-network:
    external: true
    # Permitir que Caddy global acceda
```

## Paso 3: Modificar Docker Compose de OnQuota

### 3.1. Actualizar docker-compose.production.yml de OnQuota

En `/opt/onquota/docker-compose.production.yml`, **remover el servicio Caddy**:

```yaml
version: '3.8'

services:
  # ELIMINAR servicio caddy - usaremos el global
  # caddy:
  #   ...

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.production
    container_name: onquota-frontend
    restart: unless-stopped

    # NO exponer puertos públicos
    # Solo accesible desde red Docker
    expose:
      - "3000"

    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.onquota.tudominio.com

    networks:
      - onquota-network
      - default

    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.production
    container_name: onquota-backend
    restart: unless-stopped

    # NO exponer puertos públicos
    expose:
      - "8000"

    env_file:
      - .env.production

    networks:
      - onquota-network
      - default

    depends_on:
      - redis

    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ... resto de servicios (redis, celery, etc.)

networks:
  onquota-network:
    external: true
  default:
    name: onquota-internal
```

## Paso 4: Configurar DNS

### 4.1. Agregar Registros DNS

En tu proveedor de DNS (Cloudflare, Route53, etc.), agregar:

```
Tipo    Nombre                  Valor              TTL
-----   --------------------    ---------------    ----
A       copilot                 46.224.33.191      300
A       api.copilot             46.224.33.191      300
A       onquota                 46.224.33.191      300
A       api.onquota             46.224.33.191      300
A       grafana                 46.224.33.191      300
A       flower.onquota          46.224.33.191      300
```

**Nota**: Si usas Cloudflare, **desactiva el proxy (nube gris)** inicialmente para que Let's Encrypt pueda validar.

## Paso 5: Deployment Paso a Paso

### 5.1. Preparar Redes Docker

```bash
# Conectar al VPS
ssh root@46.224.33.191

# Crear redes si no existen
docker network create copilot-network || true
docker network create onquota-network || true

# Verificar
docker network ls
```

### 5.2. Detener Caddy de Copilot (si existe)

```bash
cd /opt/copilot

# Detener solo Caddy, NO toda la aplicación
docker-compose stop caddy
docker-compose rm -f caddy

# Verificar que puertos 80/443 estén libres
netstat -tlnp | grep -E ':80|:443'
```

### 5.3. Iniciar Caddy Global

```bash
cd /opt/caddy-global

# Iniciar Caddy global
docker-compose up -d

# Verificar logs
docker-compose logs -f caddy-global

# Verificar que esté escuchando en puertos correctos
docker ps | grep caddy-global
```

### 5.4. Reiniciar Copilot (sin su Caddy)

```bash
cd /opt/copilot

# Aplicar cambios en docker-compose
docker-compose up -d

# Verificar que servicios estén corriendo
docker-compose ps
```

### 5.5. Desplegar OnQuota

```bash
cd /opt/onquota

# Crear red si no existe
docker network create onquota-network || true

# Iniciar servicios
docker-compose -f docker-compose.production.yml up -d

# Verificar
docker-compose -f docker-compose.production.yml ps
```

### 5.6. Verificar Conectividad

```bash
# Test desde el VPS
curl -I http://localhost:3000  # Copilot frontend
curl -I http://localhost:3010/api/v1/health  # Copilot backend

curl -I http://localhost:3000/api/health  # OnQuota frontend (diferente puerto interno)
curl -I http://localhost:8000/api/v1/health  # OnQuota backend

# Esperar ~1-2 minutos para SSL
# Probar desde navegador
curl -I https://copilot.tudominio.com
curl -I https://onquota.tudominio.com
```

## Paso 6: Troubleshooting

### 6.1. Verificar Logs de Caddy

```bash
# Logs de Caddy global
docker logs caddy-global -f

# Logs específicos de aplicación
tail -f /var/log/caddy/copilot.log
tail -f /var/log/caddy/onquota.log
```

### 6.2. Verificar Redes Docker

```bash
# Ver qué contenedores están en cada red
docker network inspect copilot-network
docker network inspect onquota-network

# Asegurarse que Caddy esté en ambas redes
docker inspect caddy-global | grep -A 10 Networks
```

### 6.3. Problemas Comunes

**Problema: Error "bind: address already in use"**
```bash
# Verificar qué está usando puerto 80/443
sudo netstat -tlnp | grep -E ':80|:443'

# Detener proceso conflictivo
sudo systemctl stop apache2  # o nginx, etc.
```

**Problema: SSL no funciona**
```bash
# Verificar DNS apunta a IP correcta
nslookup copilot.tudominio.com
nslookup onquota.tudominio.com

# Verificar que Cloudflare (si usas) no esté en modo proxy
# Debe estar en DNS-only (nube gris)

# Ver logs de certificados
docker exec caddy-global cat /data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/*/cert.json
```

**Problema: 502 Bad Gateway**
```bash
# Verificar que backend esté corriendo
docker ps | grep -E 'onquota-backend|copilot-api'

# Verificar health checks
docker inspect onquota-backend | grep -A 10 Health
docker inspect copilot-api-gateway | grep -A 10 Health

# Verificar conectividad de red
docker exec caddy-global ping onquota-backend
docker exec caddy-global ping copilot-api-gateway
```

## Paso 7: Variante Sin Dominio (Solo IP)

Si **NO tienes dominios**, puedes usar routing por path:

### 7.1. Caddyfile con Path-Based Routing

```caddyfile
46.224.33.191 {
    # Default - redirigir a Copilot
    handle / {
        reverse_proxy copilot-frontend:3000
    }

    # Copilot rutas
    handle /copilot* {
        reverse_proxy copilot-frontend:3000
    }

    handle /api/v1/copilot* {
        reverse_proxy copilot-api-gateway:3010
    }

    # OnQuota rutas
    handle /onquota* {
        uri strip_prefix /onquota
        reverse_proxy onquota-frontend:3000
    }

    handle /api/v1/onquota* {
        uri strip_prefix /onquota
        reverse_proxy onquota-backend:8000
    }
}
```

### 7.2. Actualizar Variables de Entorno

**OnQuota .env.production**:
```bash
# Frontend debe saber que está en /onquota
NEXT_PUBLIC_BASE_PATH=/onquota
NEXT_PUBLIC_API_URL=http://46.224.33.191/api/v1/onquota

# Backend
API_BASE_PATH=/api/v1/onquota
```

**OnQuota next.config.js**:
```javascript
module.exports = {
  basePath: '/onquota',
  assetPrefix: '/onquota',
  // ... resto
}
```

## Resumen de Arquitectura Final

### Con Dominios (Recomendado)

```
Internet → 46.224.33.191:443
  ├─ copilot.tudominio.com → Caddy Global → copilot-frontend:3000
  ├─ api.copilot.tudominio.com → Caddy Global → copilot-backend:3010
  ├─ onquota.tudominio.com → Caddy Global → onquota-frontend:3000
  └─ api.onquota.tudominio.com → Caddy Global → onquota-backend:8000
```

### Sin Dominios (Path-based)

```
Internet → 46.224.33.191:443
  ├─ / → Copilot (default)
  ├─ /copilot → copilot-frontend:3000
  ├─ /api/v1/copilot → copilot-backend:3010
  ├─ /onquota → onquota-frontend:3000
  └─ /api/v1/onquota → onquota-backend:8000
```

## Ventajas de esta Arquitectura

1. ✅ **Un solo punto de entrada** - Fácil de gestionar
2. ✅ **SSL automático** - Caddy maneja certificados
3. ✅ **Aislamiento** - Apps en redes Docker separadas
4. ✅ **Escalable** - Fácil agregar más apps
5. ✅ **Logs separados** - Un log por aplicación
6. ✅ **Health checks** - Monitoreo automático
7. ✅ **Eficiente** - Comparte recursos (80/443)

## Comandos Útiles

```bash
# Ver estado de Caddy global
docker logs caddy-global --tail=50 -f

# Recargar configuración de Caddy sin downtime
docker exec caddy-global caddy reload --config /etc/caddy/Caddyfile

# Ver certificados SSL
docker exec caddy-global caddy list-certificates

# Ver todas las aplicaciones corriendo
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Ver uso de recursos
docker stats

# Backup de configuración
tar -czf /root/backups/caddy-global-$(date +%Y%m%d).tar.gz /opt/caddy-global/
```

## Costos

**Sin costos adicionales**:
- Mismo VPS
- Mismo IP
- Mismo tráfico
- Solo más contenedores (más RAM/CPU usage)

**Recomendación de recursos**:
- Mínimo: 4GB RAM, 2 vCPU
- Recomendado: 8GB RAM, 4 vCPU (para ambas apps)

---

**Documento creado**: 2025-12-23
**Última actualización**: 2025-12-23
