import { describe, it, expect } from 'vitest';
import i18n from '@/i18n';
describe('i18n', () => {
  it('resolves ns keys', async () => {
    await i18n.changeLanguage('es');
    console.log('ns list', i18n.options.ns);
    console.log(i18n.t('vehiclesUI:dashboard.title'), '|', i18n.t('vehiclesUI:card.working'), '|', i18n.t('vehiclesUI:dashboard.stats.inWorkshop'));
    expect(i18n.t('vehiclesUI:dashboard.title')).not.toContain('dashboard.title');
  });
});
