import { UILang } from '../types';

// Technical IPA can be useful to specialists but is confusing in beginner tips.
// Preserve ordinary explanations; replace notation-heavy ones with a clear action.
export function simplePronunciationTip(text: string, lang: UILang): string {
  if (!/[\u0250-\u02af\u0300-\u036f\u1d00-\u1d7f]|\[[a-z.ː]+\]/i.test(text)) return text;
  return lang === 'ar'
    ? 'استمع للجملة ببطء، ثم كرّرها كلمة بكلمة.'
    : lang === 'fr'
    ? 'Écoutez la phrase lentement, puis répétez-la mot par mot.'
    : 'Listen to the sentence slowly, then repeat it word by word.';
}
