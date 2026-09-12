---
name: fitness-duo-app
description: "Metodología, modelo de datos de Firestore, convención de ejercicios y esquema de automatización para la App Dúo en Casa (Dionicio y Paula)."
---

# Fitness App "Dúo en Casa" — Guía de Arquitectura y Convenciones

Esta Skill documenta la arquitectura técnica, modelo de datos y reglas de negocio para asegurar consistencia entre todas las fases de desarrollo (SPA en cliente, persistencia en Firestore y automatización con GitHub Actions).

## 1. Perfiles de Usuario y Hogar (Household)

- **Household ID por defecto**: `hogar-dionicio-paula`
- **Usuarios**:
  - **Dionicio**: UID `dionicio`, Estatura: 180 cm, Horario comida: Almuerzo 13:00-14:00, Cena 20:00 (post-entreno).
  - **Paula**: UID `paula`, Edad: 41 años, Estatura: 160 cm, Nutrición: Desayuno proteico liviano + Almuerzo + Cena.
- **Equipamiento**:
  - Set 3 en 1 mancuernas modulares / barra / kettlebell (hasta 40 kg totales).
  - Trotadora eléctrica con 15 niveles de inclinación y velocímetro en km/h.
  - Apple Watch Series 8 en ambos para FC y calorías activas.

## 2. Modelo de Datos en Firestore

```
households/{householdId}/
  members/{uid}                   -> Perfil (nombre, altura, preferencias)
  members/{uid}/logs/{logId}      -> Registros de entrenamiento individuales
  members/{uid}/bodyweight/{id}   -> Registro de peso corporal
```

### Esquema de Documento `logs` (Fuerza)
```json
{
  "id": "string",
  "userId": "dionicio | paula",
  "date": "YYYY-MM-DD",
  "timestamp": 1715000000000,
  "type": "strength",
  "dayType": "torso | pierna_core",
  "exerciseId": "floor_press | remo_unilateral | press_militar | curl_biceps_triceps | goblet_squat | peso_muerto_rumano | puente_gluteos | plancha",
  "exerciseName": "Floor press con mancuernas",
  "sets": [
    { "setNumber": 1, "weightKg": 16, "reps": 12, "rpe": 8 },
    { "setNumber": 2, "weightKg": 18, "reps": 10, "rpe": 8.5 }
  ],
  "totalVolumeKg": 372,
  "notes": "string"
}
```

### Esquema de Documento `logs` (Trotadora)
```json
{
  "id": "string",
  "userId": "dionicio | paula",
  "date": "YYYY-MM-DD",
  "timestamp": 1715000000000,
  "type": "treadmill",
  "durationMinutes": 25,
  "incline": 10,
  "avgSpeedKmH": 5.0,
  "avgHeartRateBpm": 138,
  "activeCaloriesKcal": 195,
  "notes": "Apple Watch Series 8 sync"
}
```

## 3. Reglas de Seguridad de Firestore (`firestore.rules`)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuth() {
      return request.auth != null;
    }
    function isHouseholdMember(householdId) {
      return isAuth() && (
        request.auth.uid == 'dionicio' || 
        request.auth.uid == 'paula' || 
        exists(/databases/$(database)/documents/households/$(householdId)/members/$(request.auth.uid))
      );
    }
    match /households/{householdId}/members/{uid}/{document=**} {
      allow read: if isHouseholdMember(householdId);
      allow write: if isAuth() && request.auth.uid == uid;
    }
  }
}
```

## 4. Estructura de Rutina Dual en Vivo (19:00 - 20:00)
- **Min 0-7 (19:00 - 19:07)**: Calentamiento y movilidad conjunta.
- **Min 7-32 (19:07 - 19:32, 25 min)**: Bloque 1 (Usuario A Fuerza / Usuario B Trotadora).
- **Min 32-35 (19:32 - 19:35, 3 min)**: Transición (Alarma de rotación, ajuste de discos e hidratación).
- **Min 35-60 (19:35 - 20:00, 25 min)**: Bloque 2 (Usuario A Trotadora / Usuario B Fuerza).
- **Enfriamiento / Estiramientos**: Vuelta a la calma.

## 5. Plantilla de Correo Semanal (Sábados 12:00 UTC)
- **Asunto**: 📋 Plan de Entrenamiento Semanal Dúo — [Nombre] (Semana del DD/MM)
- **Contenido**:
  - Resumen de carga lograda la semana anterior.
  - Ajuste de sobrecarga progresiva sugerido (+1-2 kg o +1 rep) o mantenimiento.
  - Pauta detallada de Torso (Lun/Jue) y Pierna/Core (Mar/Vie).
  - Pauta de Trotadora (Min 0-3 / Min 3-20 / Min 20-25).
  - Recordatorio del horario sagrado: 19:00 a 20:00.
