import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Horizon, rpc } from '@stellar/stellar-sdk';
import {
  STELLAR_ERROR,
  STELLAR_HORIZON_SERVER,
  STELLAR_RPC_SERVER,
} from './stellar.constants';
import type {
  StellarAccount,
  StellarHealthResult,
  StellarNetwork,
  StellarNetworkConfig,
} from './stellar.types';

/**
 * Stellar network facade: Horizon + RPC clients driven by ConfigModule.
 */
@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly networkConfig: StellarNetworkConfig;

  constructor(
    private readonly config: ConfigService,
    @Inject(STELLAR_HORIZON_SERVER)
    private readonly horizon: Horizon.Server,
    @Inject(STELLAR_RPC_SERVER)
    private readonly rpcServer: rpc.Server,
  ) {
    this.networkConfig = {
      network: this.config.getOrThrow<StellarNetwork>('stellar.network'),
      horizonUrl: this.config.getOrThrow<string>('stellar.horizonUrl'),
      rpcUrl: this.config.getOrThrow<string>('stellar.rpcUrl'),
      usdcIssuer: this.config.getOrThrow<string>('stellar.usdcIssuer'),
      networkPassphrase: this.config.getOrThrow<string>(
        'stellar.networkPassphrase',
      ),
    };

    this.logger.log(
      `StellarService ready (network=${this.networkConfig.network})`,
    );
  }

  getNetworkConfig(): StellarNetworkConfig {
    return { ...this.networkConfig };
  }

  /**
   * Load a Stellar account from Horizon.
   * @throws NotFoundException STELLAR_ACCOUNT_NOT_FOUND
   * @throws ServiceUnavailableException STELLAR_NETWORK_ERROR
   */
  async getAccount(publicKey: string): Promise<StellarAccount> {
    try {
      const account = await this.horizon.loadAccount(publicKey);
      return {
        accountId: account.accountId(),
        sequence: account.sequenceNumber(),
        balances: account.balances.map((line) => ({
          assetType: line.asset_type,
          assetCode:
            'asset_code' in line && typeof line.asset_code === 'string'
              ? line.asset_code
              : undefined,
          assetIssuer:
            'asset_issuer' in line && typeof line.asset_issuer === 'string'
              ? line.asset_issuer
              : undefined,
          balance: line.balance,
        })),
      };
    } catch (error: unknown) {
      if (isHorizonNotFound(error)) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Stellar account not found.',
          code: STELLAR_ERROR.ACCOUNT_NOT_FOUND,
        });
      }

      this.logger.warn(
        `Horizon loadAccount failed: ${errorMessage(error)}`,
      );
      throw new ServiceUnavailableException({
        statusCode: 503,
        message: 'Unable to reach Stellar Horizon.',
        code: STELLAR_ERROR.NETWORK_ERROR,
      });
    }
  }

  /**
   * Ping Horizon root and RPC getHealth. Never throws — reports ok|down.
   */
  async getHealth(): Promise<StellarHealthResult> {
    const [horizon, rpcStatus] = await Promise.all([
      this.pingHorizon(),
      this.pingRpc(),
    ]);
    return { horizon, rpc: rpcStatus };
  }

  private async pingHorizon(): Promise<'ok' | 'down'> {
    try {
      await this.horizon.root();
      return 'ok';
    } catch (error: unknown) {
      this.logger.warn(`Horizon health check failed: ${errorMessage(error)}`);
      return 'down';
    }
  }

  private async pingRpc(): Promise<'ok' | 'down'> {
    try {
      const health = await this.rpcServer.getHealth();
      return health.status === 'healthy' ? 'ok' : 'down';
    } catch (error: unknown) {
      this.logger.warn(`RPC health check failed: ${errorMessage(error)}`);
      return 'down';
    }
  }
}

function isHorizonNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const err = error as { name?: string; response?: { status?: number } };
  return err.name === 'NotFoundError' || err.response?.status === 404;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
