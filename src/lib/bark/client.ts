import { Configuration, WalletApi, DefaultApi } from '@second-tech/barkd-rest-client';
import { env } from '@/lib/env';

let walletApiInstance: WalletApi | null = null;
let defaultApiInstance: DefaultApi | null = null;
let configurationInstance: Configuration | null = null;

function getConfiguration(): Configuration {
  if (!configurationInstance) {
    configurationInstance = new Configuration({
      basePath: env.BARKD_URL,
    });
  }
  return configurationInstance;
}

export function getBarkClient(): {
  wallet: WalletApi;
  default: DefaultApi;
} {
  const config = getConfiguration();

  if (!walletApiInstance) {
    walletApiInstance = new WalletApi(config);
  }

  if (!defaultApiInstance) {
    defaultApiInstance = new DefaultApi(config);
  }

  return {
    wallet: walletApiInstance,
    default: defaultApiInstance,
  };
}

