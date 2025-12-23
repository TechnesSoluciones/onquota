# Configuración del Servidor PostgreSQL Externo

Este documento contiene todos los comandos necesarios para configurar tu servidor PostgreSQL que alojará las bases de datos para múltiples proyectos, incluyendo OnQuota.

## Tabla de Contenidos
1. [Instalación de PostgreSQL](#instalación-de-postgresql)
2. [Configuración de Seguridad](#configuración-de-seguridad)
3. [Crear Base de Datos para OnQuota](#crear-base-de-datos-para-onquota)
4. [Configuración de Acceso Remoto](#configuración-de-acceso-remoto)
5. [Crear Bases de Datos Adicionales](#crear-bases-de-datos-adicionales)
6. [Backups y Mantenimiento](#backups-y-mantenimiento)
7. [Monitoreo](#monitoreo)

---

## Instalación de PostgreSQL

### En Ubuntu 22.04/24.04

```bash
# Actualizar sistema
sudo apt update
sudo apt upgrade -y

# Instalar PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-contrib-15

# Verificar instalación
psql --version
# Debería mostrar: psql (PostgreSQL) 15.x

# Verificar que el servicio esté corriendo
sudo systemctl status postgresql

# Iniciar servicio si no está corriendo
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### En Hetzner Cloud con Ubuntu

```bash
# Conectar al servidor
ssh root@YOUR_DB_SERVER_IP

# Instalar PostgreSQL
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib-15

# Verificar instalación
sudo -u postgres psql -c "SELECT version();"
```

---

## Configuración de Seguridad

### Configurar Contraseña para Usuario postgres

```bash
# Cambiar a usuario postgres
sudo -u postgres psql

# Dentro de psql, cambiar contraseña
ALTER USER postgres WITH ENCRYPTED PASSWORD 'TU_CONTRASEÑA_SUPER_SEGURA_AQUI';

# Salir
\q
```

### Configurar Firewall (UFW)

```bash
# Permitir SSH (¡IMPORTANTE hacer esto primero!)
sudo ufw allow OpenSSH

# Permitir PostgreSQL desde IPs específicas de tus servidores VPS
# Reemplaza YOUR_VPS_IP con la IP de tu servidor de aplicación
sudo ufw allow from YOUR_VPS_IP_1 to any port 5432 proto tcp
sudo ufw allow from YOUR_VPS_IP_2 to any port 5432 proto tcp
# Agrega más IPs según necesites

# Habilitar firewall
sudo ufw enable

# Verificar reglas
sudo ufw status numbered
```

### Configurar PostgreSQL para Aceptar Conexiones Remotas

```bash
# Editar postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf

# Buscar y modificar la línea:
# listen_addresses = 'localhost'
# Cambiar a:
listen_addresses = '*'

# Configurar límites de conexión (opcional, ajustar según tu servidor)
max_connections = 200
shared_buffers = 256MB
```

```bash
# Editar pg_hba.conf para permitir conexiones remotas
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Agregar al final del archivo (DESPUÉS de las reglas existentes):
# Permitir conexiones desde tus VPS con autenticación de contraseña

# OnQuota VPS
host    onquota_production    onquota_user    YOUR_VPS_IP_1/32    scram-sha-256

# Otros proyectos (agregar según necesites)
host    project2_production   project2_user   YOUR_VPS_IP_2/32    scram-sha-256

# Si tienes una red privada, puedes usar un rango:
# host    all                   all             10.0.0.0/8          scram-sha-256
```

```bash
# Reiniciar PostgreSQL para aplicar cambios
sudo systemctl restart postgresql

# Verificar que esté escuchando en todas las interfaces
sudo netstat -plnt | grep postgres
# Debería mostrar 0.0.0.0:5432
```

---

## Crear Base de Datos para OnQuota

### Opción 1: Comando Completo (Un Solo Paso)

```bash
sudo -u postgres psql << EOF
-- Crear usuario para OnQuota
CREATE USER onquota_user WITH ENCRYPTED PASSWORD 'OnQuota_Secure_Pass_2024!';

-- Crear base de datos
CREATE DATABASE onquota_production WITH
    OWNER = onquota_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Conectar a la base de datos
\c onquota_production

-- Otorgar privilegios
GRANT ALL PRIVILEGES ON DATABASE onquota_production TO onquota_user;
GRANT ALL ON SCHEMA public TO onquota_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO onquota_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO onquota_user;

-- Configurar privilegios por defecto para futuras tablas
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO onquota_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO onquota_user;

-- Instalar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Verificar extensiones instaladas
\dx

-- Mostrar información de la base de datos
\l onquota_production
\du onquota_user

-- Salir
\q
EOF
```

### Opción 2: Paso a Paso (Interactivo)

```bash
# 1. Conectar como postgres
sudo -u postgres psql

# 2. Crear usuario
CREATE USER onquota_user WITH ENCRYPTED PASSWORD 'OnQuota_Secure_Pass_2024!';

# 3. Crear base de datos
CREATE DATABASE onquota_production WITH
    OWNER = onquota_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

# 4. Conectar a la base de datos
\c onquota_production

# 5. Otorgar privilegios en el schema public
GRANT ALL ON SCHEMA public TO onquota_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO onquota_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO onquota_user;

# 6. Configurar privilegios por defecto
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO onquota_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO onquota_user;

# 7. Instalar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- Para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Para búsquedas de texto
CREATE EXTENSION IF NOT EXISTS "btree_gin";      -- Para índices optimizados

# 8. Verificar configuración
\l onquota_production          -- Ver información de la base de datos
\du onquota_user               -- Ver información del usuario
\dx                             -- Ver extensiones instaladas

# 9. Salir
\q
```

### Verificar la Configuración

```bash
# Desde el servidor de base de datos, probar conexión local
psql -U onquota_user -d onquota_production -h localhost

# Debería pedir contraseña y conectar exitosamente
# Si conecta, verás el prompt:
# onquota_production=>

# Probar algunos comandos
\dt     # Listar tablas (estará vacío inicialmente)
\l      # Listar bases de datos
\q      # Salir
```

---

## Configuración de Acceso Remoto

### Probar Conexión desde tu VPS

```bash
# En tu servidor VPS (donde está OnQuota), instalar cliente PostgreSQL
sudo apt install -y postgresql-client

# Probar conexión remota
psql -h YOUR_DB_SERVER_IP -U onquota_user -d onquota_production

# Si conecta exitosamente, verás:
# Password for user onquota_user: [ingresar contraseña]
# onquota_production=>

# Probar que puedes crear tablas
CREATE TABLE test_connection (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW()
);

# Insertar datos de prueba
INSERT INTO test_connection DEFAULT VALUES;

# Ver datos
SELECT * FROM test_connection;

# Eliminar tabla de prueba
DROP TABLE test_connection;

# Salir
\q
```

### Cadena de Conexión para OnQuota

Después de configurar todo, tu cadena de conexión en `.env.production` será:

```bash
DATABASE_URL=postgresql+asyncpg://onquota_user:OnQuota_Secure_Pass_2024!@YOUR_DB_SERVER_IP:5432/onquota_production
```

**Ejemplo con IP real:**
```bash
DATABASE_URL=postgresql+asyncpg://onquota_user:OnQuota_Secure_Pass_2024!@95.217.123.45:5432/onquota_production
```

**Si usas hostname:**
```bash
DATABASE_URL=postgresql+asyncpg://onquota_user:OnQuota_Secure_Pass_2024!@db.tusitio.com:5432/onquota_production
```

---

## Crear Bases de Datos Adicionales

### Para Proyecto 2, 3, etc.

```bash
# Conectar como postgres
sudo -u postgres psql

-- PROYECTO 2
CREATE USER project2_user WITH ENCRYPTED PASSWORD 'Project2_Secure_Pass_2024!';

CREATE DATABASE project2_production WITH
    OWNER = project2_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

\c project2_production
GRANT ALL ON SCHEMA public TO project2_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO project2_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO project2_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROYECTO 3
CREATE USER project3_user WITH ENCRYPTED PASSWORD 'Project3_Secure_Pass_2024!';

CREATE DATABASE project3_production WITH
    OWNER = project3_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

\c project3_production
GRANT ALL ON SCHEMA public TO project3_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO project3_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO project3_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ver todas las bases de datos creadas
\l

-- Ver todos los usuarios
\du

\q
```

### Agregar Acceso en pg_hba.conf

```bash
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Agregar:
host    project2_production   project2_user   VPS_IP_2/32    scram-sha-256
host    project3_production   project3_user   VPS_IP_3/32    scram-sha-256

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

---

## Backups y Mantenimiento

### Backup Manual de OnQuota

```bash
# Crear directorio para backups
mkdir -p ~/backups

# Backup en formato custom (comprimido)
pg_dump -h localhost -U onquota_user -d onquota_production -F c -f ~/backups/onquota_$(date +%Y%m%d_%H%M%S).dump

# Backup en formato SQL (texto plano)
pg_dump -h localhost -U onquota_user -d onquota_production -f ~/backups/onquota_$(date +%Y%m%d_%H%M%S).sql
```

### Restaurar desde Backup

```bash
# Desde formato custom
pg_restore -h localhost -U onquota_user -d onquota_production -c ~/backups/onquota_20241204.dump

# Desde formato SQL
psql -h localhost -U onquota_user -d onquota_production < ~/backups/onquota_20241204.sql
```

### Script de Backup Automático

```bash
# Crear script de backup
sudo nano /usr/local/bin/backup-postgres.sh
```

Agregar:
```bash
#!/bin/bash
# Script de backup automático para PostgreSQL

BACKUP_DIR="/var/backups/postgresql"
RETENTION_DAYS=30

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

# Fecha actual
DATE=$(date +%Y%m%d_%H%M%S)

# Backup de OnQuota
pg_dump -h localhost -U onquota_user -d onquota_production -F c -f "$BACKUP_DIR/onquota_$DATE.dump"

# Backup de otros proyectos
# pg_dump -h localhost -U project2_user -d project2_production -F c -f "$BACKUP_DIR/project2_$DATE.dump"

# Eliminar backups antiguos (más de 30 días)
find "$BACKUP_DIR" -name "*.dump" -type f -mtime +$RETENTION_DAYS -delete

# Log
echo "$(date): Backup completado - onquota_$DATE.dump" >> /var/log/postgresql-backup.log
```

```bash
# Hacer ejecutable
sudo chmod +x /usr/local/bin/backup-postgres.sh

# Agregar a crontab (backup diario a las 2 AM)
sudo crontab -e

# Agregar línea:
0 2 * * * /usr/local/bin/backup-postgres.sh
```

### Mantenimiento Regular

```bash
# Conectar como postgres
sudo -u postgres psql

-- Ver tamaño de bases de datos
SELECT
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;

-- Vacuum y analyze (limpieza y optimización)
\c onquota_production
VACUUM ANALYZE;

-- Ver tablas más grandes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Ver índices no utilizados (para optimización)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname = 'public';

\q
```

---

## Monitoreo

### Ver Conexiones Activas

```bash
sudo -u postgres psql << EOF
-- Conexiones por base de datos
SELECT
    datname,
    count(*) as connections
FROM pg_stat_activity
GROUP BY datname;

-- Detalles de conexiones activas
SELECT
    pid,
    usename,
    datname,
    client_addr,
    state,
    query_start,
    state_change
FROM pg_stat_activity
WHERE datname = 'onquota_production'
ORDER BY query_start DESC;

-- Queries lentos (más de 1 segundo)
SELECT
    pid,
    now() - query_start AS duration,
    usename,
    query
FROM pg_stat_activity
WHERE state = 'active'
    AND now() - query_start > interval '1 second'
ORDER BY duration DESC;
EOF
```

### Terminar Conexiones Bloqueadas

```bash
sudo -u postgres psql << EOF
-- Ver conexiones bloqueadas
SELECT
    pid,
    usename,
    datname,
    state,
    query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
    AND state_change < now() - interval '5 minutes';

-- Terminar una conexión específica (reemplazar PID)
-- SELECT pg_terminate_backend(12345);
EOF
```

### Logs de PostgreSQL

```bash
# Ver logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Ver logs de errores
sudo grep ERROR /var/log/postgresql/postgresql-15-main.log | tail -20

# Ver logs de conexiones
sudo grep "connection" /var/log/postgresql/postgresql-15-main.log | tail -20
```

---

## Comandos de Troubleshooting

### No Puedo Conectar Remotamente

```bash
# 1. Verificar que PostgreSQL esté escuchando
sudo netstat -plnt | grep 5432
# Debería mostrar: 0.0.0.0:5432

# 2. Verificar firewall
sudo ufw status
# Debe permitir puerto 5432 desde tu VPS IP

# 3. Probar conexión localmente
psql -h localhost -U onquota_user -d onquota_production

# 4. Ver configuración de listen_addresses
sudo grep "listen_addresses" /etc/postgresql/15/main/postgresql.conf

# 5. Ver reglas de pg_hba.conf
sudo cat /etc/postgresql/15/main/pg_hba.conf | grep -v "^#"

# 6. Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### Error de Autenticación

```bash
# Verificar método de autenticación en pg_hba.conf
sudo grep "scram-sha-256" /etc/postgresql/15/main/pg_hba.conf

# Cambiar contraseña de usuario
sudo -u postgres psql
ALTER USER onquota_user WITH ENCRYPTED PASSWORD 'NuevaContraseñaSegura!';
\q
```

### Base de Datos Lenta

```bash
sudo -u postgres psql onquota_production << EOF
-- Ver queries activos
SELECT pid, age(clock_timestamp(), query_start), usename, query
FROM pg_stat_activity
WHERE query != '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY query_start desc;

-- Ver estadísticas de tablas
SELECT
    schemaname,
    tablename,
    n_live_tup,
    n_dead_tup,
    last_autovacuum,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Ejecutar vacuum
VACUUM ANALYZE;
EOF
```

---

## Resumen de URLs de Conexión

Para uso en tus archivos `.env.production`:

```bash
# OnQuota
DATABASE_URL=postgresql+asyncpg://onquota_user:PASSWORD@DB_SERVER_IP:5432/onquota_production

# Proyecto 2
DATABASE_URL=postgresql+asyncpg://project2_user:PASSWORD@DB_SERVER_IP:5432/project2_production

# Proyecto 3
DATABASE_URL=postgresql+asyncpg://project3_user:PASSWORD@DB_SERVER_IP:5432/project3_production
```

---

## Checklist de Seguridad

- [ ] Contraseña fuerte para usuario postgres
- [ ] Contraseñas únicas para cada proyecto
- [ ] Firewall configurado (solo IPs específicas)
- [ ] pg_hba.conf con reglas específicas por IP
- [ ] listen_addresses configurado correctamente
- [ ] SSL/TLS habilitado (opcional pero recomendado)
- [ ] Backups automáticos configurados
- [ ] Logs de auditoría habilitados
- [ ] Conexiones máximas configuradas apropiadamente
- [ ] Monitoreo de espacio en disco
- [ ] Usuario postgres no puede conectar remotamente

---

## Comandos Útiles Rápidos

```bash
# Ver todas las bases de datos
sudo -u postgres psql -c "\l"

# Ver todos los usuarios
sudo -u postgres psql -c "\du"

# Ver conexiones activas
sudo -u postgres psql -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Backup rápido
pg_dump -U onquota_user -h localhost -d onquota_production -F c > backup.dump

# Espacio en disco usado por PostgreSQL
du -sh /var/lib/postgresql/15/main/

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Ver logs en tiempo real
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

---

## Soporte

Si encuentras problemas:
1. Revisa los logs: `/var/log/postgresql/postgresql-15-main.log`
2. Verifica la configuración: `pg_hba.conf` y `postgresql.conf`
3. Prueba conexión local antes de remota
4. Verifica firewall y reglas de red
5. Consulta documentación oficial: https://www.postgresql.org/docs/15/
