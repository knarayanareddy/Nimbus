/**
 * Production Oracle Aggregator
 * Fetches real weather data and posts daily observations to Solana
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import fetch from 'node-fetch';
import * as fs from 'fs';

const PROGRAM_ID = new PublicKey("CliMaFi1111111111111111111111111111111111111");

interface WeatherResponse {
  daily: {
    time: string[];
    precipitation_sum: number[];
  };
}

export class OracleAggregator {
  private connection: Connection;
  private oracleKeypair: Keypair;
  private program: Program;

  constructor(rpcUrl: string, keypairPath: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    const secret = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    this.oracleKeypair = Keypair.fromSecretKey(new Uint8Array(secret));

    const wallet = new Wallet(this.oracleKeypair);
    const provider = new AnchorProvider(this.connection, wallet, {});
    this.program = new Program({} as any, PROGRAM_ID, provider);
  }

  /**
   * Fetch real rainfall data from Open-Meteo
   */
  async fetchDailyRainfall(lat: number, lon: number, date: string): Promise<number> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&start_date=${date}&end_date=${date}&timezone=UTC`;
    
    const res = await fetch(url);
    const data = await res.json() as WeatherResponse;
    
    return (data.daily.precipitation_sum?.[0] || 0) * 100; // mm * 100
  }

  /**
   * Post daily observation to Solana
   */
  async publishDailySnapshot(regionId: number, dayStartUnix: number, valueMmX100: number) {
    const tx = await this.program.methods
      .recordObservation(
        new BN(regionId),
        { rainfall: {} },
        new BN(dayStartUnix),
        new BN(valueMmX100),
        1 // sources_bitmap
      )
      .accounts({
        config: this.getConfigPDA(),
        observation: this.getObservationPDA(regionId, dayStartUnix),
        oracle: this.oracleKeypair.publicKey,
        systemProgram: PublicKey.default,
      })
      .signers([this.oracleKeypair])
      .rpc();

    console.log(`Published observation for region ${regionId}: ${tx}`);
    return tx;
  }

  private getConfigPDA() {
    return PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0];
  }

  private getObservationPDA(regionId: number, dayStart: number) {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("obs"),
        new BN(regionId).toArrayLike(Buffer, "le", 8),
        Buffer.from([0]), // Rainfall
        new BN(dayStart).toArrayLike(Buffer, "le", 8),
      ],
      PROGRAM_ID
    )[0];
  }
}

// Example usage:
// const aggregator = new OracleAggregator(rpcUrl, keypairPath);
// const rainfall = await aggregator.fetchDailyRainfall(1.2921, 36.8219, "2026-06-21");
// await aggregator.publishDailySnapshot(1234567890123456789, 1750464000, rainfall);