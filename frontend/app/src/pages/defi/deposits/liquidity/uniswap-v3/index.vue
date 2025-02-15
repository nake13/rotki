<script setup lang="ts">
import { Blockchain, HistoryEventEntryType, LpType, type XswapBalance } from '@rotki/common';
import { Module } from '@/types/modules';
import { Section } from '@/types/status';
import Uniswap3PoolBalances from '@/components/defi/uniswap/Uniswap3PoolBalances.vue';
import { getAccountAddress } from '@/utils/blockchain/accounts/utils';
import { useUniswapStore } from '@/store/defi/uniswap';
import { useStatusStore } from '@/store/status';
import { useModules } from '@/composables/session/modules';
import { usePremium } from '@/composables/premium';
import HistoryEventsView from '@/components/history/events/HistoryEventsView.vue';
import PaginatedCards from '@/components/common/PaginatedCards.vue';
import LiquidityPoolSelector from '@/components/helper/LiquidityPoolSelector.vue';
import BlockchainAccountSelector from '@/components/helper/BlockchainAccountSelector.vue';
import ActiveModules from '@/components/defi/ActiveModules.vue';
import TablePageLayout from '@/components/layout/TablePageLayout.vue';
import ExternalLink from '@/components/helper/ExternalLink.vue';
import ProgressScreen from '@/components/helper/ProgressScreen.vue';
import ModuleNotActive from '@/components/defi/ModuleNotActive.vue';
import type { AddressData, BlockchainAccount } from '@/types/blockchain/accounts';

const uniswap = Module.UNISWAP;
const chains = [Blockchain.ETH];
const modules = [uniswap];

const selectedAccounts = ref<BlockchainAccount<AddressData>[]>([]);
const selectedPools = ref<string[]>([]);

const store = useUniswapStore();

const { fetchV3Balances: fetchBalances, uniswapV3Balances: uniswapBalances } = store;
const { uniswapV3Addresses: addresses, uniswapV3PoolAssets: poolAssets } = storeToRefs(store);

const { isModuleEnabled } = useModules();
const { isLoading, shouldShowLoadingScreen } = useStatusStore();
const { t } = useI18n();

const enabled = isModuleEnabled(uniswap);
const loading = shouldShowLoadingScreen(Section.DEFI_UNISWAP_V3_BALANCES);
const primaryRefreshing = isLoading(Section.DEFI_UNISWAP_V3_BALANCES);
const secondaryRefreshing = isLoading(Section.DEFI_UNISWAP_EVENTS);

const selectedAddresses = useArrayMap(selectedAccounts, account => getAccountAddress(account));
const accountFilter = useArrayMap(selectedAccounts, account => ({
  address: getAccountAddress(account),
  chain: account.chain,
}));

const balances = computed(() => {
  const addresses = get(selectedAddresses);
  const pools = get(selectedPools);
  const balances = get(uniswapBalances(addresses));

  return pools.length === 0 ? balances : balances.filter(({ address }) => pools.includes(address));
});

const premium = usePremium();

const lpType = LpType.UNISWAP_V3;

const getIdentifier = (item: XswapBalance) => item.nftId || '';

async function refresh(ignoreCache: boolean = false) {
  await fetchBalances(ignoreCache);
}

onMounted(async () => {
  await refresh();
});

const refreshTooltip = computed<string>(() =>
  t('helpers.refresh_header.tooltip', {
    title: t('navigation_menu.defi_sub.deposits_sub.liquidity_sub.uniswap_v3').toLocaleLowerCase(),
  }),
);
</script>

<template>
  <ModuleNotActive
    v-if="!enabled"
    :modules="modules"
  />
  <ProgressScreen v-else-if="loading">
    <template #message>
      {{ t('uniswap.loading') }}
    </template>
    <template
      v-if="!premium"
      #default
    >
      <i18n-t keypath="uniswap.loading_non_premium">
        <ExternalLink
          :text="t('uniswap.premium')"
          color="primary"
          premium
        />
      </i18n-t>
    </template>
  </ProgressScreen>
  <TablePageLayout
    v-else
    child
    :title="[
      t('navigation_menu.defi'),
      t('navigation_menu.defi_sub.deposits_sub.liquidity'),
      t('navigation_menu.defi_sub.deposits_sub.liquidity_sub.uniswap_v3'),
    ]"
  >
    <template #buttons>
      <div class="flex items-center gap-4">
        <ActiveModules :modules="modules" />

        <RuiTooltip :open-delay="400">
          <template #activator>
            <RuiButton
              variant="outlined"
              color="primary"
              :loading="primaryRefreshing || secondaryRefreshing"
              @click="refresh(true)"
            >
              <template #prepend>
                <RuiIcon name="refresh-line" />
              </template>
              {{ t('common.refresh') }}
            </RuiButton>
          </template>
          {{ refreshTooltip }}
        </RuiTooltip>
      </div>
    </template>
    <div class="grid grid-cols-2 gap-4">
      <BlockchainAccountSelector
        v-model="selectedAccounts"
        :chains="chains"
        :usable-addresses="addresses"
        dense
        outlined
      />
      <LiquidityPoolSelector
        v-model="selectedPools"
        :pools="poolAssets"
        :type="lpType"
        dense
        no-padding
      />
    </div>

    <PaginatedCards
      v-if="balances.length > 0"
      :identifier="getIdentifier"
      :items="balances"
    >
      <template #item="{ item }">
        <Uniswap3PoolBalances
          :item="item"
          :lp-type="lpType"
        />
      </template>
    </PaginatedCards>

    <HistoryEventsView
      use-external-account-filter
      :section-title="t('common.events')"
      :protocols="['uniswap-v3']"
      :external-account-filter="accountFilter"
      :only-chains="chains"
      :entry-types="[HistoryEventEntryType.EVM_EVENT]"
    />
  </TablePageLayout>
</template>
