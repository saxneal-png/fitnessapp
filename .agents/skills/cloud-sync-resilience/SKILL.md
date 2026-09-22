---
name: cloud-sync-resilience
description: Protocolo de autenticacion hibrida y sincronizacion resiliente offline-first para Firestore y Web Crypto.
---

# Cloud Sync Resilience & Cryptographic Vault Protocol

Este skill documenta la estrategia de autenticacion de doble capa y persistencia resiliente para la app Fitness Duo en Casa.

## 1. Arquitectura de Autenticacion de Doble Capa
1. **Capa Primaria (Firebase Auth)**: Se intenta signInWithEmailAndPassword / createUserWithEmailAndPassword.
2. **Capa Segura (Web Crypto Vault)**: Validacion local con SHA-256 (window.crypto.subtle), boveda de hashes autorizados para Dionicio y Paula, token de sesion firmado con 30 dias de validez.

## 2. Persistencia y Sincronizacion en Tiempo Real
- Firestore IndexedDB con enableIndexedDbPersistence.
- Sincronizacion en households/hogar-dionicio-paula/members/{uid}.
