# OnQuota AWS Infrastructure

Infraestructura como código usando AWS CDK (TypeScript) para desplegar OnQuota en Amazon Web Services.

## 🏗️ Arquitectura

- **Compute:** ECS Fargate (Backend, Frontend, Celery Workers)
- **Database:** RDS PostgreSQL 15 Multi-AZ
- **Cache:** ElastiCache Redis 7
- **Load Balancer:** Application Load Balancer (ALB)
- **Storage:** S3 (Uploads, Backups, Static Assets)
- **CDN:** CloudFront
- **Secrets:** AWS Secrets Manager
- **Registry:** ECR (Elastic Container Registry)
- **Monitoring:** CloudWatch Logs, Metrics, Alarms
- **Network:** VPC con subnets públicas, privadas y aisladas

## 📋 Prerequisitos

```bash
# Node.js 18+
node --version

# AWS CLI v2
aws --version

# AWS CDK v2
npm install -g aws-cdk
cdk --version

# Docker
docker --version
```

## 🚀 Quick Start

### 1. Instalar Dependencias

```bash
cd infrastructure/aws
npm install
```

### 2. Configurar Variables de Entorno

```bash
cp .env.example .env
# Editar .env con tus valores
```

Variables requeridas:
- `AWS_ACCOUNT_ID`: Tu AWS Account ID
- `AWS_REGION`: us-east-1 (o tu región preferida)
- `DEV_DOMAIN_NAME`: dev.onquota.com
- `DEV_CERTIFICATE_ARN`: ARN del certificado ACM

### 3. Bootstrap CDK (una sola vez)

```bash
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### 4. Desplegar Infraestructura

```bash
# Ver los cambios
cdk diff OnQuotaStack-dev

# Desplegar
cdk deploy OnQuotaStack-dev
```

Tiempo estimado: 15-25 minutos

### 5. Capturar Outputs

Después del deploy, guardar los outputs mostrados:
- ALB DNS Name
- RDS Endpoint
- Redis Endpoint
- ECR Repository URIs
- Secrets ARNs

### 6. Configurar Secrets

```bash
# Actualizar app secrets con valores reales
aws secretsmanager update-secret \
  --secret-id "arn:aws:secretsmanager:..." \
  --secret-string '{
    "jwt_secret_key": "TU_SECRET_SEGURO",
    "sendgrid_api_key": "SG.xxx",
    "google_vision_api_key": "AIza..."
  }'
```

### 7. Build y Push Imágenes Docker

```bash
# Login a ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build Backend
cd ../../backend
docker build -f Dockerfile.aws -t onquota-backend:latest .
docker tag onquota-backend:latest ECR_BACKEND_URI:latest
docker push ECR_BACKEND_URI:latest

# Build Frontend
cd ../frontend
docker build -f Dockerfile.aws \
  --build-arg NEXT_PUBLIC_API_URL=https://dev.onquota.com/api/v1 \
  -t onquota-frontend:latest .
docker tag onquota-frontend:latest ECR_FRONTEND_URI:latest
docker push ECR_FRONTEND_URI:latest
```

### 8. Deploy Servicios ECS

```bash
# Forzar nuevo deployment
aws ecs update-service \
  --cluster onquota-cluster-dev \
  --service onquota-backend-dev \
  --force-new-deployment

aws ecs update-service \
  --cluster onquota-cluster-dev \
  --service onquota-frontend-dev \
  --force-new-deployment
```

### 9. Ejecutar Migraciones

```bash
# Obtener task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster onquota-cluster-dev \
  --service-name onquota-backend-dev \
  --query 'taskArns[0]' \
  --output text)

# Ejecutar migraciones
aws ecs execute-command \
  --cluster onquota-cluster-dev \
  --task $TASK_ARN \
  --container backend \
  --interactive \
  --command "alembic upgrade head"
```

## 📊 Monitoreo

### Ver Logs
```bash
aws logs tail /ecs/onquota-backend-dev --follow
```

### CloudWatch Dashboard
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1

### Estado de Servicios
```bash
aws ecs describe-services \
  --cluster onquota-cluster-dev \
  --services onquota-backend-dev onquota-frontend-dev
```

## 💰 Costos Estimados

### Development
- ~$146/mes (configuración mínima)

### Production
- ~$1,184/mes (configuración con alta disponibilidad)

Ver detalles en `/docs/AWS_DEPLOYMENT.md`

## 🗑️ Destruir Stack

```bash
# CUIDADO: Esto eliminará todos los recursos
cdk destroy OnQuotaStack-dev
```

## 📚 Documentación Completa

Ver documentación detallada en:
- `/docs/AWS_DEPLOYMENT.md` - Guía completa de deployment
- `/docs/FUNCIONES_PENDIENTES.md` - Roadmap y tareas pendientes

## 🆘 Troubleshooting

### Servicios ECS no inician
```bash
# Ver eventos
aws ecs describe-services --cluster onquota-cluster-dev --services onquota-backend-dev

# Ver logs
aws logs tail /ecs/onquota-backend-dev --since 10m
```

### Error en deploy de CDK
```bash
# Ver stack events
aws cloudformation describe-stack-events --stack-name OnQuotaStack-dev
```

## 🔗 Enlaces Útiles

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [RDS Performance Insights](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.html)

## 📞 Soporte

Para issues o preguntas, crear un ticket en el repositorio.

---

**Última actualización:** 2025-01-24  
**Versión CDK:** 2.115.0  
**Región por defecto:** us-east-1
