import { IEnvironment } from '@novu/shared';

import { IntegrationEntity } from './IntegrationsStorePage';
import { CONTEXT_PATH } from '../../config';
import { CHANNEL_TYPE_TO_STRING } from '../../utils/channels';
import type { ITableIntegration } from './types';

export const mapToTableIntegration = (
  integration: IntegrationEntity,
  environments?: IEnvironment[]
): ITableIntegration => {
  const logoFileName = {
    light: `${CONTEXT_PATH}/static/images/providers/light/square/${integration.providerId}.svg`,
    dark: `${CONTEXT_PATH}/static/images/providers/dark/square/${integration.providerId}.svg`,
  };
  const environment = environments?.find((env) => env._id === integration._environmentId);

  return {
    name: `${integration.providerId.charAt(0).toUpperCase()}${integration.providerId.slice(1)}`,
    // TODO: change to identifier when it will be available
    identifier: integration._id ?? '',
    provider: `${integration.providerId.charAt(0).toUpperCase()}${integration.providerId.slice(1)}`,
    channel: CHANNEL_TYPE_TO_STRING[integration.channel],
    channelType: integration.channel,
    environment: environment?.name ?? '',
    active: integration.active,
    logoFileName,
  };
};