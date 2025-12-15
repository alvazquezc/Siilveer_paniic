import { GameStats, Language } from "../types";
import { 
  COMMENTARY_WIN_ES, COMMENTARY_LOSE_ES,
  COMMENTARY_WIN_EN, COMMENTARY_LOSE_EN,
  COMMENTARY_WIN_FR, COMMENTARY_LOSE_FR
} from "../constants";

/**
 * Generates a commentary based on the player's performance.
 */
export const getGameCommentary = async (
  status: 'WIN' | 'GAME_OVER',
  stats: GameStats,
  levelName: string,
  language: Language
): Promise<string> => {
  // Simulate async delay for realism
  await new Promise(resolve => setTimeout(resolve, 500));

  let list: string[] = [];

  if (language === 'ES') {
      list = status === 'WIN' ? COMMENTARY_WIN_ES : COMMENTARY_LOSE_ES;
  } else if (language === 'FR') {
      list = status === 'WIN' ? COMMENTARY_WIN_FR : COMMENTARY_LOSE_FR;
  } else {
      list = status === 'WIN' ? COMMENTARY_WIN_EN : COMMENTARY_LOSE_EN;
  }

  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
};