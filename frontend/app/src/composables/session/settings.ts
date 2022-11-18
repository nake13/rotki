import { BigNumber } from '@rotki/common';
import { TimeFramePersist } from '@rotki/common/lib/settings/graphs';
import { getBnFormat } from '@/data/amount_formatter';
import { useExchangeBalancesStore } from '@/store/balances/exchanges';
import { usePremiumStore } from '@/store/session/premium';
import { useAccountingSettingsStore } from '@/store/settings/accounting';
import { useFrontendSettingsStore } from '@/store/settings/frontend';
import { useGeneralSettingsStore } from '@/store/settings/general';
import { useSessionSettingsStore } from '@/store/settings/session';
import { Exchange } from '@/types/exchanges';
import { UserSettingsModel } from '@/types/user';

export const useSessionSettings = () => {
  const { premium, premiumSync } = storeToRefs(usePremiumStore());
  const { update: updateFrontendSettings } = useFrontendSettingsStore();
  const { update: updateAccountingSettings } = useAccountingSettingsStore();
  const { update: updateGeneralSettings } = useGeneralSettingsStore();
  const { update: updateSessionSettings } = useSessionSettingsStore();
  const { setExchanges } = useExchangeBalancesStore();

  const initialize = (
    {
      accounting,
      general,
      other: { frontendSettings, havePremium, premiumShouldSync }
    }: UserSettingsModel,
    exchanges: Exchange[]
  ): void => {
    if (frontendSettings) {
      const { timeframeSetting, lastKnownTimeframe } = frontendSettings;
      const { thousandSeparator, decimalSeparator } = frontendSettings;
      const timeframe =
        timeframeSetting !== TimeFramePersist.REMEMBER
          ? timeframeSetting
          : lastKnownTimeframe;

      updateFrontendSettings(frontendSettings);
      setExchanges(exchanges);
      updateSessionSettings({ timeframe });
      BigNumber.config({
        FORMAT: getBnFormat(thousandSeparator, decimalSeparator)
      });
    }

    set(premium, havePremium);
    set(premiumSync, premiumShouldSync);
    updateGeneralSettings(general);
    updateAccountingSettings(accounting);
  };

  return {
    initialize
  };
};
