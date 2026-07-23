import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Horizon, rpc } from '@stellar/stellar-sdk';
import {
  STELLAR_HORIZON_SERVER,
  STELLAR_RPC_SERVER,
} from './stellar.constants';
import { StellarService } from './stellar.service';

@Module({
  providers: [
    {
      provide: STELLAR_HORIZON_SERVER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Horizon.Server => {
        const horizonUrl = config.get<string>('stellar.horizonUrl');
        if (!horizonUrl) {
          throw new Error('stellar.horizonUrl is not configured');
        }
        return new Horizon.Server(horizonUrl);
      },
    },
    {
      provide: STELLAR_RPC_SERVER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): rpc.Server => {
        const rpcUrl = config.get<string>('stellar.rpcUrl');
        if (!rpcUrl) {
          throw new Error('stellar.rpcUrl is not configured');
        }
        return new rpc.Server(rpcUrl);
      },
    },
    StellarService,
  ],
  exports: [StellarService],
})
export class StellarModule {}
