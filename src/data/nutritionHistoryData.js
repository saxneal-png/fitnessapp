/**
 * Historial Nutricional y Clínico Verificado - Dionicio & Paula
 * Periodización clínica en alimentos tradicionales chilenos (2026-09-27 a 2026-10-03).
 */

export const HOUSEHOLD_NUTRITION_CONTEXT = {
  version: "1.0.0",
  project: "Coach Virtual Antigravity - Dionicio & Paula",
  lastUpdated: "2026-10-03",
  contextOrigin: {
    summary: "Transición desde pautas genéricas hipercalóricas de internet (2.100-2.200 kcal) hacia una periodización clínica de recomposición corporal basada en alimentos tradicionales chilenos. Se corrigen factores de actividad inflados, se define pesaje estricto solo en ayunas (descartando variaciones por agua/digestión vespertina) y se personaliza la ingesta según la masa magra y la tolerancia gastrointestinal.",
    corePrinciples: [
      "Proteína calculada sobre masa libre de grasa (~2.0 g/kg magra), no sobre peso total con tejido adiposo.",
      "Hard cap estricto de grasa para Paula (<42-45 g/día) para evitar reflujo y dispepsia nocturna.",
      "Límite biológico de Cáscara Foods a máximo 1 scoop diario por su aporte de 300 mg de magnesio bioasimilable.",
      "Priorización de marraqueta, pan amasado con aceite (sin manteca animal), postas vacunas, pollo ganso, pescados y lácteos proteicos locales."
    ]
  },
  athletes: {
    dionicio: {
      biometrics: {
        heightCm: 180,
        weightKg: 86.0,
        age: 40,
        estimatedLeanMassKg: 65.5,
        estimatedBodyFatPct: 23.5,
        activeMode: "visceral_fat_loss"
      },
      energyTargets: {
        bmrKcal: 1785,
        realTdeeKcal: 2360,
        dailyDeficitKcal: -760,
        targetCaloriesKcal: 1600,
        targetProteinG: 130,
        targetFatsG: 55,
        targetCarbsG: 145
      },
      supplementation: {
        creatineMonohydrateG: 5,
        proteinPowderCascaraFoodsScoops: 1,
        elementalMagnesiumMg: 300,
        rules: "Máximo 1 scoop de Cáscara Foods diario (por los 300 mg de magnesio elemental). 5g de creatina en saturación diaria continua."
      },
      foodPreferences: {
        dislikes: ["quesillo"],
        likes: ["carne vacuna magra", "marraqueta", "huevo", "queso gauda", "sardinas al agua", "longaniza casera (con moderación en almuerzo)"]
      }
    },
    paula: {
      biometrics: {
        heightCm: 160,
        weightKg: 63.0,
        estimatedLeanMassKg: 45.0,
        activeMode: "hypertrophy_muscle_gain"
      },
      energyTargets: {
        targetCaloriesKcal: 1250,
        targetProteinG: 82,
        maxFatsG: 42,
        targetCarbsG: 130
      },
      clinicalConstraints: {
        lactoseSensitivity: true,
        irritableBowelSensitivity: true,
        fatIntoleranceTriggerG: 45,
        nocturnalRefluxRule: "Cero embutidos densos, cuero de pollo asado o quesos grasos en la once. La longaniza casera solo al almuerzo para vaciamiento gástrico antes de dormir."
      },
      supplementation: {
        creatineMonohydrateG: 5,
        proteinPowderCascaraFoods: "Solo rescate eventual (máx 1 scoop)"
      },
      foodPreferences: {
        likes: ["quesillo", "tomate", "yogurt griego proteico", "pollo", "pescados magros", "marraqueta"],
        dislikes: []
      }
    }
  }
};

export const RAW_DAILY_LOGS = [
  {
    date: "2026-09-27",
    dayOfWeek: "Domingo",
    notes: "Pesaje nocturno de Dionicio (88.3 kg con buzo y comida) refutado clínicamente como retención de agua/bolo alimenticio.",
    dionicio: {
      meals: [
        { meal: "Almuerzo + Snack", description: "Posta rosada, arroz, verduras + helado", protein_g: 71.5, fats_g: 17.5, calories: 710 },
        { meal: "Pre-Once", description: "1 scoop Cáscara Foods + 5g creatina", protein_g: 20.0, fats_g: 1.0, calories: 100 },
        { meal: "Once", description: "1 lata atún Coliseo al agua, 3 dientes marraqueta precocida (~120g), 2 huevos cocidos, té", protein_g: 41.5, fats_g: 12.0, calories: 545 }
      ],
      totals: { protein_g: 133.0, fats_g: 30.5, calories: 1355 }
    },
    paula: {
      meals: [
        { meal: "Almuerzo + Picoteo", description: "Posta rosada, arroz, verduras + picoteo controlado", protein_g: 56.8, fats_g: 25.0, calories: 747 },
        { meal: "Pre-Once", description: "1 scoop Cáscara Foods + creatina", protein_g: 20.0, fats_g: 1.0, calories: 100 },
        { meal: "Once", description: "2 dientes marraqueta precocida (~80g), 1 tomate c/cilantro y ajo, té", protein_g: 7.7, fats_g: 1.0, calories: 230 }
      ],
      totals: { protein_g: 84.5, fats_g: 27.0, calories: 1077 }
    }
  },
  {
    date: "2026-09-28",
    dayOfWeek: "Lunes",
    notes: "Incorporación de pan amasado casero elaborado con aceite vegetal en sustitución de manteca animal.",
    dionicio: {
      meals: [
        { meal: "Desayuno", description: "1 vaso leche Loncoleche Protein+, 1 plátano", protein_g: 17.2, fats_g: 0.5, calories: 200 },
        { meal: "Almuerzo", description: "Posta rosada con arroz blanco y ensalada mixta", protein_g: 56.8, fats_g: 10.0, calories: 540 },
        { meal: "Once", description: "1 pan amasado con aceite (~100g), 2 trozos longaniza casera (20 cm), tomate con orégano", protein_g: 35.2, fats_g: 39.0, calories: 710 },
        { meal: "Cierre", description: "1 scoop Cáscara Foods + 5g creatina", protein_g: 20.0, fats_g: 1.0, calories: 100 }
      ],
      totals: { protein_g: 129.2, fats_g: 50.5, calories: 1550 }
    },
    paula: {
      meals: [
        { meal: "Desayuno", description: "1 pote individual yogurt proteico", protein_g: 12.0, fats_g: 0.5, calories: 85 },
        { meal: "Almuerzo", description: "Posta rosada con verduras y arroz", protein_g: 41.0, fats_g: 7.5, calories: 340 },
        { meal: "Once", description: "1 pan amasado con aceite (~100g), 1 trozo longaniza casera (10 cm), tomate con 80g quesillo", protein_g: 30.5, fats_g: 25.0, calories: 555 }
      ],
      totals: { protein_g: 83.5, fats_g: 33.0, calories: 980 }
    }
  },
  {
    date: "2026-09-29",
    dayOfWeek: "Martes",
    notes: "Almuerzo magro con pollo ganso cocido. Cierre sin saturación de grasas.",
    dionicio: {
      meals: [
        { meal: "Desayuno", description: "1 vaso leche Loncoleche Protein+, 1 plátano", protein_g: 17.2, fats_g: 0.5, calories: 200 },
        { meal: "Almuerzo", description: "190g pollo ganso cocido, 1 tomate c/1 cdta aceite maravilla y sal", protein_g: 58.2, fats_g: 12.5, calories: 370 },
        { meal: "Pre-Once", description: "1 scoop Cáscara Foods + 5g creatina", protein_g: 20.0, fats_g: 1.0, calories: 100 },
        { meal: "Once", description: "1 pan amasado (~110g), 2 láminas queso Gauda Frutillar, 2 huevos revueltos, tomate", protein_g: 31.0, fats_g: 25.0, calories: 560 }
      ],
      totals: { protein_g: 126.4, fats_g: 39.0, calories: 1230 }
    },
    paula: {
      meals: [
        { meal: "Desayuno", description: "1 yogur proteico, 1 café", protein_g: 12.0, fats_g: 0.5, calories: 85 },
        { meal: "Almuerzo", description: "140g pollo ganso cocido, 1/2 pepino, 1/2 palta", protein_g: 45.2, fats_g: 17.5, calories: 380 },
        { meal: "Colación", description: "8 galletas de vino Costa", protein_g: 3.0, fats_g: 7.0, calories: 210 },
        { meal: "Once", description: "1 pan amasado (~100g), 2 huevos revueltos, tomate, 100 ml leche Protein+", protein_g: 26.8, fats_g: 16.0, calories: 500 }
      ],
      totals: { protein_g: 87.0, fats_g: 41.0, calories: 1175 }
    }
  },
  {
    date: "2026-09-30",
    dayOfWeek: "Miércoles",
    notes: "Dionicio introduce sardinas al agua y palta en la once; Paula gestiona colación dulce limitando grasas en la once.",
    dionicio: {
      meals: [
        { meal: "Desayuno", description: "1 vaso leche Loncoleche Protein+, 1 plátano", protein_g: 17.2, fats_g: 0.5, calories: 200 },
        { meal: "Almuerzo", description: "190g pollo ganso cocido, ensalada lechuga c/1 cdta aceite maravilla", protein_g: 59.8, fats_g: 12.0, calories: 360 },
        { meal: "Once", description: "1 pan amasado (~110g), 1 palta chica (~90g pulpa), 1 lata sardinas al agua drenada", protein_g: 29.8, fats_g: 24.5, calories: 580 },
        { meal: "Cierre", description: "1 scoop Cáscara Foods + 5g creatina", protein_g: 20.0, fats_g: 1.0, calories: 100 }
      ],
      totals: { protein_g: 126.8, fats_g: 38.0, calories: 1240 }
    },
    paula: {
      meals: [
        { meal: "Desayuno", description: "80g yogur griego Quillayes proteico", protein_g: 8.5, fats_g: 2.0, calories: 65 },
        { meal: "Almuerzo", description: "150g pollo ganso cocido, 1 tomate c/aceite y sal, 1/2 palta chica", protein_g: 46.5, fats_g: 17.0, calories: 370 },
        { meal: "Colación", description: "3 galletas Bon o Bon chocolate blanco", protein_g: 2.5, fats_g: 13.0, calories: 235 },
        { meal: "Once", description: "1 pan amasado (~100g), tomate con ajo, 1 vaso leche Loncoleche Protein+ (200 ml)", protein_g: 24.2, fats_g: 6.0, calories: 410 }
      ],
      totals: { protein_g: 81.7, fats_g: 38.0, calories: 1080 }
    }
  },
  {
    date: "2026-10-01",
    dayOfWeek: "Jueves",
    notes: "Estrategia de longaniza al almuerzo para facilitar el vaciamiento gástrico antes de dormir.",
    dionicio: {
      meals: [
        { meal: "Desayuno", description: "1 vaso leche Loncoleche Protein+, 1 plátano", protein_g: 17.2, fats_g: 0.5, calories: 200 },
        { meal: "Almuerzo", description: "100g pechuga pollo, 10 cm longaniza casera, 6 espárragos al limón", protein_g: 46.5, fats_g: 19.5, calories: 385 },
        { meal: "Pre-Once", description: "1 scoop Cáscara Foods + 5g creatina", protein_g: 20.0, fats_g: 1.0, calories: 100 },
        { meal: "Once", description: "1 pan amasado (~120g), 2 huevos revueltos, 2 láminas queso Gauda, tomate", protein_g: 45.0, fats_g: 23.0, calories: 715 }
      ],
      totals: { protein_g: 128.7, fats_g: 44.0, calories: 1400 }
    },
    paula: {
      meals: [
        { meal: "Desayuno", description: "Ayuno", protein_g: 0.0, fats_g: 0.0, calories: 0 },
        { meal: "Almuerzo", description: "90g pechuga pollo sin aceite, 8 cm longaniza, ensalada tomate c/media palta", protein_g: 43.1, fats_g: 26.2, calories: 440 },
        { meal: "Colación", description: "1 pote yogur proteico", protein_g: 12.0, fats_g: 0.5, calories: 85 },
        { meal: "Once", description: "1 pan amasado (~100g), 2 huevos revueltos, tomate con orégano, 100 ml leche Protein+", protein_g: 29.2, fats_g: 16.0, calories: 505 }
      ],
      totals: { protein_g: 84.3, fats_g: 42.7, calories: 1030 }
    }
  },
  {
    date: "2026-10-02",
    dayOfWeek: "Viernes",
    notes: "Compensación de papas fritas de restaurante al almuerzo (Dionicio) mediante pollo asado de rotisería sin piel en la once. Ninguno requirió scoop de proteína.",
    dionicio: {
      meals: [
        { meal: "Desayuno", description: "1 vaso leche Loncoleche Protein+, 1 plátano", protein_g: 17.2, fats_g: 0.3, calories: 200 },
        { meal: "Almuerzo", description: "Pechuga a la plancha (~130g cocida), porción mediana papas fritas naturales (~120g)", protein_g: 41.5, fats_g: 21.0, calories: 530 },
        { meal: "Once", description: "3 dientes marraqueta (~150g), 210g pechuga pollo asado sin piel, 4 rodajas tomate, 5g creatina", protein_g: 78.0, fats_g: 8.2, calories: 745 }
      ],
      totals: { protein_g: 136.7, fats_g: 29.5, calories: 1475 }
    },
    paula: {
      meals: [
        { meal: "Desayuno / Almuerzo", description: "Ayuno intermitente natural", protein_g: 0.0, fats_g: 0.0, calories: 0 },
        { meal: "Colación", description: "1 yogur proteico con trozos de fruta, 1 bolita frutos secos", protein_g: 16.0, fats_g: 10.0, calories: 225 },
        { meal: "Once", description: "2 dientes marraqueta (~100g), 100g pechuga asada sin piel, 100g trutro asado sin piel, 2 rodajas tomate, 5g creatina", protein_g: 63.5, fats_g: 12.3, calories: 605 }
      ],
      totals: { protein_g: 79.5, fats_g: 22.3, calories: 830 }
    }
  },
  {
    date: "2026-10-03",
    dayOfWeek: "Sábado",
    notes: "Desayuno con pollo asado remanente, almuerzo de salmón + merluza (Omega-3 balanceado) y once de anticuchos de posta de cerdo.",
    dionicio: {
      meals: [
        { meal: "Desayuno", description: "1 diente marraqueta (~50g), 40g pechuga pollo asado, café c/alulosa", protein_g: 16.4, fats_g: 1.8, calories: 194 },
        { meal: "Almuerzo", description: "178g arroz blanco cocido, 57g salmón a la plancha, 61g merluza a la plancha, 190g zapallo italiano cocido", protein_g: 30.3, fats_g: 8.2, calories: 427 },
        { meal: "Pre-Once", description: "1 scoop Cáscara Foods + 5g creatina", protein_g: 20.0, fats_g: 1.0, calories: 100 },
        { meal: "Once", description: "2 anticuchos de posta de cerdo magra (~200g carne), 2 dientes marraqueta (~100g), tomate fresco con orégano", protein_g: 64.0, fats_g: 10.8, calories: 600 }
      ],
      totals: { protein_g: 130.7, fats_g: 21.8, calories: 1321 }
    },
    paula: {
      meals: [
        { meal: "Desayuno", description: "1 diente marraqueta (~50g), 40g pechuga pollo asado, café c/alulosa", protein_g: 16.4, fats_g: 1.8, calories: 194 },
        { meal: "Almuerzo", description: "80g arroz blanco cocido, 55g salmón a la plancha, 45g merluza a la plancha, 150g zapallo italiano cocido", protein_g: 24.0, fats_g: 7.4, calories: 275 },
        { meal: "Once", description: "1.5 a 2 anticuchos de posta de cerdo magra (~160g carne), 1 diente marraqueta (~50g), tomate fresco, 5g creatina", protein_g: 47.0, fats_g: 8.4, calories: 390 }
      ],
      totals: { protein_g: 87.4, fats_g: 17.6, calories: 859 }
    }
  }
];

// Genera lista aplanada para almacenar en `nutrition_logs` de la app
export function generateFlattenedHistoricalLogs() {
  const flattened = [];

  RAW_DAILY_LOGS.forEach(day => {
    // Dionicio meals
    day.dionicio.meals.forEach((m, idx) => {
      const carbs = Math.max(0, Math.round((m.calories - (m.protein_g * 4 + m.fats_g * 9)) / 4));
      flattened.push({
        id: `hist-dio-${day.date}-${idx}-${m.meal.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        userId: 'dionicio',
        date: day.date,
        dayOfWeek: day.dayOfWeek,
        mealType: m.meal,
        mealName: m.meal,
        description: m.description,
        caloriesKcal: m.calories,
        proteinG: m.protein_g,
        fatsG: m.fats_g,
        carbsG: carbs,
        timestamp: new Date(`${day.date}T12:00:00`).getTime() + idx * 3600000,
        notes: day.notes,
        isVerifiedHistorical: true
      });
    });

    // Paula meals
    day.paula.meals.forEach((m, idx) => {
      const carbs = Math.max(0, Math.round((m.calories - (m.protein_g * 4 + m.fats_g * 9)) / 4));
      flattened.push({
        id: `hist-pau-${day.date}-${idx}-${m.meal.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        userId: 'paula',
        date: day.date,
        dayOfWeek: day.dayOfWeek,
        mealType: m.meal,
        mealName: m.meal,
        description: m.description,
        caloriesKcal: m.calories,
        proteinG: m.protein_g,
        fatsG: m.fats_g,
        carbsG: carbs,
        timestamp: new Date(`${day.date}T12:00:00`).getTime() + idx * 3600000,
        notes: day.notes,
        isVerifiedHistorical: true
      });
    });
  });

  return flattened;
}

export const INITIAL_HISTORICAL_NUTRITION_LOGS = generateFlattenedHistoricalLogs();
