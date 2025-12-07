import { Configuration, WalletApi, OnchainApi } from '@second-tech/barkd-rest-client';
import { env } from '@/lib/env';

let walletApiInstance: WalletApi | null = null;
let onchainApiInstance: OnchainApi | null = null;
let configurationInstance: Configuration | null = null;

function getConfiguration(): Configuration {
  if (!configurationInstance) {
    configurationInstance = new Configuration({
      basePath: env.BARKD_URL,
    });
  }
  return configurationInstance;
}

/**
 * Gets the WalletApi instance (singleton)
 * @returns WalletApi instance
 */
export function getWalletApi(): WalletApi {
  const config = getConfiguration();

  if (!walletApiInstance) {
    walletApiInstance = new WalletApi(config);
  }

  return walletApiInstance;
}

/**
 * Gets the OnchainApi instance (singleton)
 * @returns OnchainApi instance
 */
export function getOnchainApi(): OnchainApi {
  const config = getConfiguration();

  if (!onchainApiInstance) {
    onchainApiInstance = new OnchainApi(config);
  }

  return onchainApiInstance;
}

