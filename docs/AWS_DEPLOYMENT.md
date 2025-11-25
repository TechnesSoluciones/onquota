# OnQuota - AWS Deployment Guide

## Tabla de Contenidos

1. [Arquitectura AWS](#arquitectura-aws)
2. [Prerequisitos](#prerequisitos)
3. [Configuración Inicial](#configuración-inicial)
4. [Despliegue de Infraestructura](#despliegue-de-infraestructura)
5. [Despliegue de Aplicación](#despliegue-de-aplicación)
6. [Monitoreo y Logs](#monitoreo-y-logs)
7. [Costos Estimados](#costos-estimados)

---

## Arquitectura AWS

### Componentes Principales

| Componente | Servicio AWS | Propósito |
|------------|--------------|-----------|
| **Compute** | ECS Fargate | Contenedores serverless para Backend, Frontend y Workers |
| **Base de Datos** | RDS PostgreSQL 15 | Base de datos principal con Multi-AZ |
| **Cache** | ElastiCache Redis 7 | Cache y message broker para Celery |
| **Balanceador** | Application Load Balancer | Distribución de tráfico HTTPS |
| **CDN** | CloudFront | Content Delivery Network para assets estáticos |
| **Storage** | S3 | Almacenamiento de archivos (uploads, backups, static) |
| **Secrets** | Secrets Manager | Gestión segura de credenciales |
| **Registry** | ECR | Registro de imágenes Docker |
| **Monitoring** | CloudWatch | Logs, métricas y alarmas |

---

## Costos Estimados

### Ambiente de Desarrollo

| Servicio | Costo Mensual (USD) |
|----------|---------------------|
| ECS Fargate (4 tasks) | ~$36 |
| RDS PostgreSQL (db.t4g.micro Multi-AZ) | ~$30 |
| ElastiCache Redis (cache.t4g.micro) | ~$15 |
| ALB | ~$20 |
| NAT Gateway | ~$35 |
| S3 + CloudWatch + Otros | ~$10 |
| **TOTAL** | **~$146/mes** |

### Ambiente de Producción

| Servicio | Costo Mensual (USD) |
|----------|---------------------|
| ECS Fargate (10-20 tasks) | ~$330 |
| RDS PostgreSQL (db.r6g.large Multi-AZ + Replica) | ~$450 |
| ElastiCache Redis (cache.r6g.large) | ~$200 |
| ALB + CloudFront | ~$45 |
| NAT Gateway (2x Multi-AZ) | ~$70 |
| S3 + CloudWatch + Otros | ~$89 |
| **TOTAL** | **~$1,184/mes** |

---

Para documentación completa, ver el archivo en `/docs/AWS_DEPLOYMENT.md`.
