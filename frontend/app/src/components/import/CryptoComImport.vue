<script setup lang="ts">
import { externalLinks } from '@shared/external-links';
import { Routes } from '@/router/routes';
import InternalLink from '@/components/helper/InternalLink.vue';
import ExternalLink from '@/components/helper/ExternalLink.vue';
import ImportSource from '@/components/import/ImportSource.vue';

const { t } = useI18n();
</script>

<template>
  <ImportSource source="cryptocom">
    <i18n-t
      tag="span"
      keypath="import_data.note"
    >
      <strong>{{ t('import_data.cryptocom.source_name') }}</strong>
    </i18n-t>
    <ul class="list-disc">
      <li>
        <i18n-t
          tag="span"
          keypath="import_data.cryptocom.line_one"
        >
          <ExternalLink
            color="primary"
            :url="externalLinks.githubNewIssue"
          >
            {{ t('import_data.cryptocom.line_one_link') }}
          </ExternalLink>
        </i18n-t>
      </li>
      <li>
        <i18n-t
          tag="span"
          keypath="import_data.cryptocom.line_two"
        >
          <strong>{{ t('import_data.cryptocom.line_two_warning') }}</strong>
        </i18n-t>
      </li>
      <li>{{ t('import_data.cryptocom.line_three') }}</li>
      <li>
        <i18n-t
          keypath="import_data.cryptocom.line_four"
          tag="span"
        >
          <InternalLink :to="Routes.ACCOUNTS_BALANCES_MANUAL">
            {{ t('import_data.cryptocom.line_four_link') }}
          </InternalLink>
        </i18n-t>
      </li>
    </ul>
  </ImportSource>
</template>
