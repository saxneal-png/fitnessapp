import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { USERS } from '../data/workoutCatalog';
import { calculateAthleteNutrition, getAthleteBiometrics, evaluateAthleteModeRecommendation } from '../services/nutritionCalculator';

/**
 * Custom Hook para desacoplar y centralizar el perfil, biometría y reglas de negocio del atleta.
 * Elimina la bifurcación manual duplicada de 'isDionicio' y constantes de estilo/nombres.
 */
export function useAthleteProfile(targetUserId = null) {
  const { currentUser, householdId } = useAuth();
  const userId = targetUserId || currentUser || 'dionicio';
  const isDionicio = userId === 'dionicio';
  const partnerId = isDionicio ? 'paula' : 'dionicio';

  const userConfig = USERS[userId] || USERS.dionicio;
  const partnerConfig = USERS[partnerId] || USERS.paula;

  const biometrics = useMemo(() => {
    return getAthleteBiometrics(userId, householdId);
  }, [userId, householdId]);

  const nutritionPlan = useMemo(() => {
    return calculateAthleteNutrition(userId, householdId);
  }, [userId, householdId]);

  const recommendation = useMemo(() => {
    return evaluateAthleteModeRecommendation(userId, householdId);
  }, [userId, householdId]);

  // Colores y badges dinámicos
  const theme = {
    primaryText: isDionicio ? 'text-sky-400' : 'text-pink-400',
    primaryBg: isDionicio ? 'bg-sky-500' : 'bg-pink-500',
    badgeBg: isDionicio ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    border: isDionicio ? 'border-sky-500/30' : 'border-pink-500/30',
    glow: isDionicio ? 'shadow-sky-500/20' : 'shadow-pink-500/20',
  };

  return {
    userId,
    isDionicio,
    partnerId,
    name: userConfig.name,
    displayName: isDionicio ? '👨‍💻 Dionicio' : '👩‍💼 Paula',
    partnerName: partnerConfig.name,
    partnerDisplayName: isDionicio ? '👩‍💼 Paula' : '👨‍💻 Dionicio',
    avatar: userConfig.avatar,
    theme,
    biometrics,
    nutritionPlan,
    recommendation,
    // Reglas biológicas y digestivas configurables
    digestiveProtection: Boolean(biometrics?.digestiveProtection),
    hardCapFats: biometrics?.digestiveProtection ? (biometrics.maxFatsCap || 42) : null,
    isLactoseFree: !isDionicio,
    dislikes: isDionicio ? ['quesillo'] : ['cuero de pollo', 'manteca', 'cenas grasas tardias'],
  };
}
