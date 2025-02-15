<script setup lang="ts">
import { HistoryEventEntryType } from '@rotki/common';
import dayjs from 'dayjs';
import { helpers, required, requiredIf } from '@vuelidate/validators';
import { isEmpty } from 'lodash-es';
import { TRADE_LOCATION_EXTERNAL } from '@/data/defaults';
import { toMessages } from '@/utils/validation';
import { DateFormat } from '@/types/date-format';
import { convertFromTimestamp, convertToTimestamp } from '@/utils/date';
import { bigNumberifyFromRef } from '@/utils/bignumbers';
import HistoryEventAssetPriceForm from '@/components/history/events/forms/HistoryEventAssetPriceForm.vue';
import { useGeneralSettingsStore } from '@/store/settings/general';
import { useHistoryEventsForm } from '@/composables/history/events/form';
import LocationSelector from '@/components/helper/LocationSelector.vue';
import DateTimePicker from '@/components/inputs/DateTimePicker.vue';
import AssetSelect from '@/components/inputs/AssetSelect.vue';
import AmountInput from '@/components/inputs/AmountInput.vue';
import { refIsTruthy } from '@/composables/ref';
import AutoCompleteWithSearchSync from '@/components/inputs/AutoCompleteWithSearchSync.vue';
import { useSessionSettingsStore } from '@/store/settings/session';
import type { AssetMovementEvent, NewAssetMovementEventPayload } from '@/types/history/events';

const props = withDefaults(defineProps<{
  editableItem?: AssetMovementEvent;
  groupEvents?: AssetMovementEvent[];
}>(), {
  editableItem: undefined,
  groupEvents: () => [],
});

const { t } = useI18n();

const { editableItem, groupEvents } = toRefs(props);

const { currencySymbol } = storeToRefs(useGeneralSettingsStore());

const historyEventTypesData = [
  {
    identifier: 'deposit',
    label: t('backend_mappings.events.history_event_type.deposit'),
  },
  {
    identifier: 'withdrawal',
    label: t('backend_mappings.events.history_event_type.withdrawal'),
  },
];

const assetPriceForm = ref<InstanceType<typeof HistoryEventAssetPriceForm>>();

const eventIdentifier = ref<string>('');
const datetime = ref<string>('');
const location = ref<string>('');
const locationLabel = ref<string>('');
const eventType = ref<string>('');
const asset = ref<string>('');
const amount = ref<string>('');
const usdValue = ref<string>('');
const notes = ref<string>('');
const hasFee = ref<boolean>(false);
const fee = ref<string>('');
const feeAsset = ref<string>('');

const errorMessages = ref<Record<string, string[]>>({});

const externalServerValidation = () => true;

const rules = {
  amount: {
    required: helpers.withMessage(t('transactions.events.form.amount.validation.non_empty'), required),
  },
  asset: {
    required: helpers.withMessage(t('transactions.events.form.asset.validation.non_empty'), required),
  },
  eventIdentifier: { externalServerValidation },
  eventType: {
    required: helpers.withMessage(t('transactions.events.form.event_type.validation.non_empty'), required),
  },
  fee: {
    required: helpers.withMessage(
      t('transactions.events.form.fee.validation.non_empty'),
      requiredIf(logicAnd(hasFee, refIsTruthy(feeAsset))),
    ),
  },
  feeAsset: {
    required: helpers.withMessage(
      t('transactions.events.form.fee_asset.validation.non_empty'),
      requiredIf(logicAnd(hasFee, refIsTruthy(fee))),
    ),
  },
  location: {
    required: helpers.withMessage(t('transactions.events.form.location.validation.non_empty'), required),
  },
  locationLabel: { externalServerValidation },
  notes: { externalServerValidation },
  timestamp: { externalServerValidation },
  usdValue: {
    required: helpers.withMessage(
      t('transactions.events.form.fiat_value.validation.non_empty', {
        currency: get(currencySymbol),
      }),
      required,
    ),
  },
};

const { connectedExchanges } = storeToRefs(useSessionSettingsStore());
const { saveHistoryEventHandler, setSubmitFunc, setValidation } = useHistoryEventsForm();
const v$ = setValidation(
  rules,
  {
    amount,
    asset,
    eventIdentifier,
    eventType,
    fee,
    feeAsset,
    location,
    locationLabel,
    notes,
    timestamp: datetime,
    usdValue,
  },
  {
    $autoDirty: true,
    $externalResults: errorMessages,
  },
);

const lastLocation = useLocalStorage('rotki.history_event.location', TRADE_LOCATION_EXTERNAL);
const numericAmount = bigNumberifyFromRef(amount);
const numericUsdValue = bigNumberifyFromRef(usdValue);
const locationLabelSuggestions = computed<string[]>(() => {
  const suggestions: string[] = [];

  for (const { location: connectedLocation, name } of get(connectedExchanges)) {
    if (connectedLocation !== get(location) || !name) {
      continue;
    }
    suggestions.push(name);
  }
  return suggestions;
});

function reset() {
  set(eventIdentifier, '');
  set(datetime, convertFromTimestamp(dayjs().valueOf(), DateFormat.DateMonthYearHourMinuteSecond, true));
  set(location, get(lastLocation));
  set(locationLabel, '');
  set(eventType, 'deposit');
  set(asset, '');
  set(amount, '0');
  set(usdValue, '0');
  set(notes, '');
  set(errorMessages, {});

  get(assetPriceForm)?.reset();
}

function applyEditableData(entry: AssetMovementEvent, feeEvent?: AssetMovementEvent) {
  set(eventIdentifier, entry.eventIdentifier);
  set(datetime, convertFromTimestamp(entry.timestamp, DateFormat.DateMonthYearHourMinuteSecond, true));
  set(location, entry.location);
  set(locationLabel, entry.locationLabel ?? '');
  set(eventType, entry.eventType);
  set(asset, entry.asset ?? '');
  set(amount, entry.balance.amount.toFixed());
  set(usdValue, entry.balance.usdValue.toFixed());
  set(notes, entry.notes ?? '');

  if (feeEvent) {
    set(fee, feeEvent.balance.amount.toFixed());
    set(feeAsset, feeEvent.asset ?? '');
    set(hasFee, true);
  }
  else {
    set(hasFee, false);
  }
}

async function save(): Promise<boolean> {
  const timestamp = convertToTimestamp(get(datetime), DateFormat.DateMonthYearHourMinuteSecond, true);

  const editable = get(editableItem);

  let payload: NewAssetMovementEventPayload = {
    asset: get(asset),
    balance: {
      amount: get(numericAmount).isNaN() ? Zero : get(numericAmount),
      usdValue: get(numericUsdValue).isNaN() ? Zero : get(numericUsdValue),
    },
    entryType: HistoryEventEntryType.ASSET_MOVEMENT_EVENT,
    eventIdentifier: get(eventIdentifier),
    eventType: get(eventType),
    fee: null,
    feeAsset: null,
    location: get(location),
    locationLabel: get(locationLabel),
    timestamp,
  };

  if (get(hasFee)) {
    payload = {
      ...payload,
      fee: get(fee) || null,
      feeAsset: get(feeAsset) || null,
    };
  }

  return await saveHistoryEventHandler(
    editable ? { ...payload, identifier: editable.identifier } : payload,
    assetPriceForm,
    errorMessages,
    reset,
  );
}

setSubmitFunc(save);

function checkPropsData() {
  const editable = get(editableItem);
  const feeEvent = get(groupEvents).find(event => event.eventSubtype === 'fee');

  if (editable) {
    applyEditableData(editable, feeEvent);
    return;
  }
  reset();
}

watchImmediate([editableItem, groupEvents], checkPropsData);

watch(location, (location: string) => {
  if (location)
    set(lastLocation, location);
});

watch(errorMessages, (errors) => {
  if (!isEmpty(errors))
    get(v$).$validate();
});
</script>

<template>
  <div>
    <div class="grid md:grid-cols-2 gap-4 mb-4">
      <DateTimePicker
        v-model="datetime"
        :label="t('common.datetime')"
        persistent-hint
        limit-now
        milliseconds
        data-cy="datetime"
        :hint="t('transactions.events.form.datetime.hint')"
        :error-messages="toMessages(v$.timestamp)"
        @blur="v$.timestamp.$touch()"
      />
      <LocationSelector
        v-model="location"
        :disabled="!!(editableItem)"
        data-cy="location"
        :label="t('common.location')"
        :error-messages="toMessages(v$.location)"
        @blur="v$.location.$touch()"
      />
      <AutoCompleteWithSearchSync
        v-model="locationLabel"
        :items="locationLabelSuggestions"
        clearable
        data-cy="locationLabel"
        :label="t('transactions.events.form.location_label.label')"
        :error-messages="toMessages(v$.locationLabel)"
        auto-select-first
        @blur="v$.locationLabel.$touch()"
      />
    </div>

    <RuiAutoComplete
      v-model="eventType"
      variant="outlined"
      :label="t('transactions.events.form.event_type.label')"
      :options="historyEventTypesData"
      key-attr="identifier"
      text-attr="label"
      data-cy="eventType"
      auto-select-first
      :error-messages="toMessages(v$.eventType)"
      @blur="v$.eventType.$touch()"
    />

    <RuiDivider class="mb-6 mt-2" />

    <HistoryEventAssetPriceForm
      ref="assetPriceForm"
      v-model:asset="asset"
      v-model:amount="amount"
      v-model:usd-value="usdValue"
      :v$="v$"
      :datetime="datetime"
    />

    <RuiDivider class="mb-6 mt-2" />

    <RuiCheckbox
      v-model="hasFee"
      label="Has Fee"
      color="primary"
    />

    <div class="grid md:grid-cols-2 gap-4">
      <AmountInput
        v-model="fee"
        :disabled="!hasFee"
        clearable
        variant="outlined"
        data-cy="amount"
        :label="t('common.fee')"
        :error-messages="toMessages(v$.fee)"
      />
      <AssetSelect
        v-model="feeAsset"
        :disabled="!hasFee"
        outlined
        clearable
        data-cy="feeAsset"
        :label="t('transactions.events.form.fee_asset.label')"
        :error-messages="toMessages(v$.feeAsset)"
      />
    </div>

    <RuiDivider class="mb-6 mt-2" />

    <RuiTextArea
      v-model="notes"
      prepend-icon="sticky-note-line"
      data-cy="notes"
      variant="outlined"
      color="primary"
      max-rows="5"
      min-rows="3"
      auto-grow
      :label="t('common.notes')"
      :hint="t('transactions.events.form.notes.hint')"
      :error-messages="toMessages(v$.notes)"
      @blur="v$.notes.$touch()"
    />

    <RuiDivider class="mb-2 mt-6" />

    <RuiAccordions>
      <RuiAccordion
        data-cy="asset-movement-event-form__advance"
        header-class="py-4"
        eager
      >
        <template #header>
          {{ t('transactions.events.form.advanced') }}
        </template>
        <div class="py-2">
          <RuiTextField
            v-model="eventIdentifier"
            variant="outlined"
            color="primary"
            data-cy="eventIdentifier"
            :label="t('transactions.events.form.event_identifier.label')"
            :error-messages="toMessages(v$.eventIdentifier)"
            @blur="v$.eventIdentifier.$touch()"
          />
        </div>
      </RuiAccordion>
    </RuiAccordions>
  </div>
</template>
