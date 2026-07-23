import {
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  STELLAR_ERROR,
  STELLAR_HORIZON_SERVER,
  STELLAR_RPC_SERVER,
} from './stellar.constants';
import { StellarService } from './stellar.service';

describe('StellarService', () => {
  let service: StellarService;

  const mockHorizon = {
    loadAccount: jest.fn(),
    root: jest.fn(),
  };
  const mockRpc = {
    getHealth: jest.fn(),
  };

  const mockConfig = {
    getOrThrow: (key: string): string => {
      const values: Record<string, string> = {
        'stellar.network': 'testnet',
        'stellar.horizonUrl': 'https://horizon-testnet.stellar.org',
        'stellar.rpcUrl': 'https://soroban-testnet.stellar.org',
        'stellar.usdcIssuer':
          'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        'stellar.networkPassphrase': 'Test SDF Network ; September 2015',
      };
      const value = values[key];
      if (value === undefined) {
        throw new Error(`Missing config: ${key}`);
      }
      return value;
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: STELLAR_HORIZON_SERVER, useValue: mockHorizon },
        { provide: STELLAR_RPC_SERVER, useValue: mockRpc },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
  });

  describe('SRV-049 — network configuration', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should expose network config from ConfigService', () => {
      expect(service.getNetworkConfig()).toEqual({
        network: 'testnet',
        horizonUrl: 'https://horizon-testnet.stellar.org',
        rpcUrl: 'https://soroban-testnet.stellar.org',
        usdcIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        networkPassphrase: 'Test SDF Network ; September 2015',
      });
    });

    it('should return a copy of network config', () => {
      const config = service.getNetworkConfig();
      config.network = 'mainnet';
      expect(service.getNetworkConfig().network).toBe('testnet');
    });
  });

  describe('SRV-050 — getAccount', () => {
    const publicKey =
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

    it('should return normalized account when Horizon succeeds', async () => {
      mockHorizon.loadAccount.mockResolvedValue({
        accountId: () => publicKey,
        sequenceNumber: () => '12345',
        balances: [
          { asset_type: 'native', balance: '100.0000000' },
          {
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer:
              'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
            balance: '50.0000000',
          },
        ],
      });

      const account = await service.getAccount(publicKey);

      expect(mockHorizon.loadAccount).toHaveBeenCalledWith(publicKey);
      expect(account).toEqual({
        accountId: publicKey,
        sequence: '12345',
        balances: [
          { assetType: 'native', balance: '100.0000000' },
          {
            assetType: 'credit_alphanum4',
            assetCode: 'USDC',
            assetIssuer:
              'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
            balance: '50.0000000',
          },
        ],
      });
    });

    it('should throw NotFoundException when account is missing', async () => {
      const notFound = Object.assign(new Error('Not Found'), {
        name: 'NotFoundError',
        response: { status: 404 },
      });
      mockHorizon.loadAccount.mockRejectedValue(notFound);

      await expect(service.getAccount(publicKey)).rejects.toMatchObject({
        response: { code: STELLAR_ERROR.ACCOUNT_NOT_FOUND },
      });
      await expect(service.getAccount(publicKey)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should throw ServiceUnavailableException on Horizon network errors', async () => {
      mockHorizon.loadAccount.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(service.getAccount(publicKey)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      await expect(service.getAccount(publicKey)).rejects.toMatchObject({
        response: { code: STELLAR_ERROR.NETWORK_ERROR },
      });
    });
  });

  describe('SRV-050 — getHealth', () => {
    it('should report ok when Horizon and RPC are healthy', async () => {
      mockHorizon.root.mockResolvedValue({ horizon_version: '2' });
      mockRpc.getHealth.mockResolvedValue({ status: 'healthy' });

      await expect(service.getHealth()).resolves.toEqual({
        horizon: 'ok',
        rpc: 'ok',
      });
    });

    it('should report down without throwing when endpoints fail', async () => {
      mockHorizon.root.mockRejectedValue(new Error('timeout'));
      mockRpc.getHealth.mockRejectedValue(new Error('timeout'));

      await expect(service.getHealth()).resolves.toEqual({
        horizon: 'down',
        rpc: 'down',
      });
    });

    it('should report rpc down when status is not healthy', async () => {
      mockHorizon.root.mockResolvedValue({});
      mockRpc.getHealth.mockResolvedValue({ status: 'offline' });

      await expect(service.getHealth()).resolves.toEqual({
        horizon: 'ok',
        rpc: 'down',
      });
    });
  });
});
