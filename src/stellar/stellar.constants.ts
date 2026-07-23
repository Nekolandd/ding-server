/**
 * Injection tokens for Stellar Horizon and RPC clients.
 * Factory providers in StellarModule create real SDK servers;
 * unit tests replace them with mocks via these tokens.
 */
export const STELLAR_HORIZON_SERVER = Symbol('STELLAR_HORIZON_SERVER');
export const STELLAR_RPC_SERVER = Symbol('STELLAR_RPC_SERVER');

/**
 * Ding error codes for Stellar network operations (Appendix A).
 * Surfaced via Nest HTTP exceptions as the `code` field.
 */
export const STELLAR_ERROR = {
  ACCOUNT_NOT_FOUND: 'STELLAR_ACCOUNT_NOT_FOUND',
  INSUFFICIENT_BALANCE: 'STELLAR_INSUFFICIENT_BALANCE',
  TX_FAILED: 'STELLAR_TX_FAILED',
  OP_UNDERFUNDED: 'STELLAR_OP_UNDERFUNDED',
  NETWORK_ERROR: 'STELLAR_NETWORK_ERROR',
  TIMEOUT: 'STELLAR_TIMEOUT',
} as const;

export type StellarErrorCode =
  (typeof STELLAR_ERROR)[keyof typeof STELLAR_ERROR];

/** Supported classic assets for payment transactions. */
export const STELLAR_ASSET_CODE = {
  XLM: 'XLM',
  USDC: 'USDC',
} as const;

export type StellarAssetCode =
  (typeof STELLAR_ASSET_CODE)[keyof typeof STELLAR_ASSET_CODE];
