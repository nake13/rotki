<script setup lang="ts">
import { SavedFilterLocation } from '@/types/filtering';
import { AccountExternalFilterSchema, type Filters, type Matcher, useBlockchainAccountFilter } from '@/composables/filters/blockchain-account';
import { getAccountAddress, getGroupId } from '@/utils/blockchain/accounts/utils';
import { fromUriEncoded, toUriEncoded } from '@/utils/route-uri';
import AccountBalancesTable from '@/components/accounts/AccountBalancesTable.vue';
import AccountGroupDetailsTable from '@/components/accounts/AccountGroupDetailsTable.vue';
import DetectTokenChainsSelection from '@/components/accounts/balances/DetectTokenChainsSelection.vue';
import { useBlockchainStore } from '@/store/blockchain';
import { useBlockchainAccountLoading } from '@/composables/accounts/blockchain/use-account-loading';
import { usePaginationFilters } from '@/composables/use-pagination-filter';
import { useBlockchains } from '@/composables/blockchain';
import { useRefresh } from '@/composables/balances/refresh';
import AccountBalanceDetails from '@/components/accounts/balances/AccountBalanceDetails.vue';
import AccountBalanceAggregatedAssets from '@/components/accounts/AccountBalanceAggregatedAssets.vue';
import AccountGroupDetails from '@/components/accounts/AccountGroupDetails.vue';
import TableFilter from '@/components/table-filter/TableFilter.vue';
import TagFilter from '@/components/inputs/TagFilter.vue';
import DetectEvmAccounts from '@/components/accounts/balances/DetectEvmAccounts.vue';
import CardTitle from '@/components/typography/CardTitle.vue';
import BlockchainBalanceRefreshBehaviourMenu
  from '@/components/dashboard/blockchain-balance/BlockchainBalanceRefreshBehaviourMenu.vue';
import SummaryCardRefreshMenu from '@/components/dashboard/summary-card/SummaryCardRefreshMenu.vue';
import type { LocationQuery } from '@/types/route';
import type { ComponentExposed } from 'vue-component-type-helpers';
import type {
  BlockchainAccountGroupWithBalance,
  BlockchainAccountRequestPayload,
} from '@/types/blockchain/accounts';
import type { AccountManageState } from '@/composables/accounts/blockchain/use-account-manage';

const props = defineProps<{
  category: string;
}>();

const emit = defineEmits<{
  (e: 'edit', account: AccountManageState): void;
}>();

const { category } = toRefs(props);
const { t } = useI18n();

const visibleTags = ref<string[]>([]);
const chainExclusionFilter = ref<Record<string, string[]>>({});
const accountTable = ref<ComponentExposed<typeof AccountBalancesTable>>();
const detailsTable = ref<ComponentExposed<typeof AccountGroupDetailsTable>>();
const tab = ref<number>(0);
const expanded = ref<string[]>([]);
const query = ref<LocationQuery>({});

const blockchainStore = useBlockchainStore();
const { fetchAccounts: fetchAccountsPage } = blockchainStore;
const { groups } = storeToRefs(blockchainStore);
const { handleBlockchainRefresh } = useRefresh();
const { fetchAccounts } = useBlockchains();

const {
  fetchData,
  filters,
  matchers,
  pagination,
  sort,
  state: accounts,
} = usePaginationFilters<
  BlockchainAccountGroupWithBalance,
  BlockchainAccountRequestPayload,
  Filters,
  Matcher
>(fetchAccountsPage, {
  defaultSortBy: {
    column: 'usdValue',
    direction: 'desc',
  },
  extraParams: computed(() => ({
    tags: get(visibleTags),
    ...(get(category) !== 'all' ? { category: get(category) } : {}),
  })),
  filterSchema: () => useBlockchainAccountFilter(t, category),
  history: 'router',
  onUpdateFilters(filterQuery) {
    const { expanded: expandedIds, q, tab: qTab, tags } = AccountExternalFilterSchema.parse(filterQuery);
    if (tags)
      set(visibleTags, tags);
    if (qTab !== undefined)
      set(tab, qTab);
    if (expandedIds)
      set(expanded, expandedIds);

    set(query, q ? fromUriEncoded(q) : {});
  },
  queryParamsOnly: computed(() => ({
    ...(get(expanded).length > 0
      ? {
          expanded: get(expanded),
          tab: get(tab),
          ...(get(tab) === 1
            ? {
                q: toUriEncoded(get(query)),
              }
            : {}),
        }
      : {}),
  })),
  requestParams: computed(() => ({
    excluded: get(chainExclusionFilter),
  })),
});

const isEvm = computed(() => get(category) === 'evm');
const showEvmElements = computed(() => get(isEvm) || get(category) === 'all');

const { isDetectingTokens, refreshDisabled } = useBlockchainAccountLoading(fetchData);

async function refreshClick() {
  await fetchAccounts(undefined, true);
  await handleBlockchainRefresh();
  await fetchData();
}

function getChains(row: BlockchainAccountGroupWithBalance): string[] {
  const chains = row.chains;
  const excludedChains = get(chainExclusionFilter)[getGroupId(row)];
  return excludedChains ? chains.filter(chain => !excludedChains.includes(chain)) : chains;
}

watchImmediate(groups, async () => {
  await fetchData();
});

defineExpose({
  refresh: async () => {
    await fetchData();
    if (!isDefined(detailsTable))
      return;

    await get(detailsTable).refresh();
  },
});
</script>

<template>
  <RuiCard data-cy="account-balances">
    <template #header>
      <div class="flex flex-row items-center gap-2">
        <SummaryCardRefreshMenu
          data-cy="account-balances-refresh-menu"
          :disabled="refreshDisabled"
          :loading="isDetectingTokens"
          :tooltip="t('account_balances.refresh_tooltip')"
          @refresh="refreshClick()"
        >
          <template
            v-if="showEvmElements"
            #refreshMenu
          >
            <BlockchainBalanceRefreshBehaviourMenu />
          </template>
        </SummaryCardRefreshMenu>
        <CardTitle class="ml-2">
          {{ t('account_balances.data_table.group', { type: isEvm ? 'EVM' : toSentenceCase(category) }) }}
        </CardTitle>
      </div>
    </template>

    <div class="flex flex-col md:flex-row md:items-center gap-4 flex-wrap">
      <div
        class="flex items-center gap-2 flex-1"
        :class="{ 'hidden lg:block': !showEvmElements }"
      >
        <template v-if="showEvmElements">
          <RuiButtonGroup
            variant="outlined"
            color="primary"
          >
            <RuiTooltip
              :popper="{ placement: 'top' }"
              :open-delay="400"
            >
              <template #activator>
                <RuiButton
                  class="py-2 !outline-0 rounded-none"
                  variant="outlined"
                  color="primary"
                  :loading="isDetectingTokens"
                  :disabled="refreshDisabled"
                  @click="handleBlockchainRefresh(undefined, true)"
                >
                  <template #prepend>
                    <RuiIcon name="refresh-line" />
                  </template>

                  {{ t('account_balances.detect_tokens.tooltip.redetect') }}
                </RuiButton>
              </template>
              {{ t('account_balances.detect_tokens.tooltip.redetect_all') }}
            </RuiTooltip>

            <DetectTokenChainsSelection />
          </RuiButtonGroup>

          <DetectEvmAccounts />
        </template>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <TagFilter
          v-model="visibleTags"
          class="w-[20rem] max-w-[30rem]"
          hide-details
        />
        <TableFilter
          v-model:matches="filters"
          :matchers="matchers"
          class="max-w-[calc(100vw-11rem)] w-[25rem] lg:max-w-[30rem]"
          :location="SavedFilterLocation.BLOCKCHAIN_ACCOUNTS"
        />
      </div>
    </div>

    <AccountBalancesTable
      ref="accountTable"
      v-model:pagination="pagination"
      v-model:sort="sort"
      v-model:chain-filter="chainExclusionFilter"
      v-model:expanded-ids="expanded"
      :data-category="category"
      class="mt-4"
      group
      :accounts="accounts"
      :show-group-label="category === 'all'"
      @edit="emit('edit', $event)"
      @refresh="fetchData()"
    >
      <template #details="{ row }">
        <AccountGroupDetails
          v-if="row.expansion === 'accounts'"
          v-model="tab"
          :is-xpub="row.data.type === 'xpub'"
        >
          <template #per-chain>
            <AccountGroupDetailsTable
              v-if="row.expansion === 'accounts'"
              ref="detailsTable"
              v-model:query="query"
              :chains="getChains(row)"
              :tags="visibleTags"
              :group-id="getGroupId(row)"
              :is-evm="row.category === 'evm'"
              @edit="emit('edit', $event)"
            />
          </template>
          <template #aggregated>
            <AccountBalanceAggregatedAssets
              :group-id="getGroupId(row)"
              :chains="getChains(row)"
            />
          </template>
        </AccountGroupDetails>
        <AccountBalanceDetails
          v-else-if="row.expansion === 'assets'"
          :address="getAccountAddress(row)"
          :chain="row.chains[0]"
        />
      </template>
    </AccountBalancesTable>
  </ruicard>
</template>
