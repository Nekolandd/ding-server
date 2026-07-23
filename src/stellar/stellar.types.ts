export type StellarNetwork = 'testnet' | 'mainnet';

export type StellarEndpointStatus = 'ok' | 'down';

export interface StellarNetworkConfig {
  network: StellarNetwork;
  horizonUrl: string;
  rpcUrl: string;
  usdcIssuer: string;
  networkPassphrase: string;
}

export interface StellarHealthResult {
  horizon: StellarEndpointStatus;
  rpc: StellarEndpointStatus;
}

export interface StellarBalanceLine {
  assetType: string;
  assetCode?: string;
  assetIssuer?: string;
  balance: string;
}

/** Normalized account view returned by getAccount (no raw SDK leak to callers). */
export interface StellarAccount {
  accountId: string;
  sequence: string;
  balances: StellarBalanceLine[];
}

export interface BuildPaymentTransactionParams {
  source: string;
  destination: string;
  amount: string;
  assetCode: string;
}

export interface PollTransactionOptions {
  intervalMs?: number;
  maxAttempts?: number;
}

export interface PollTransactionResult {
  confirmed: boolean;
  ledger?: number;
  failureCode?: string;
}

export interface SubmitTransactionResult {
  hash: string;
}

export interface SimulateTransactionResult {
  success: boolean;
  error?: string;
}
