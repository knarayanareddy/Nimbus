/**
 * Production Oracle Aggregator
 * Fetches real weather data and posts daily observations to Solana
 * M-04 fix: validates coordinates against region registry
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

/**
 * M-04 fix: Region registry for coordinate validation.
 * Maps region_id to expected lat/lon bounds.
 * In production, this would be loaded from a database or config file.
 */
interface RegionBounds {
  name: string;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  centerLat: number;
  centerLon: number;
}

const REGION_REGISTRY: Map<number, RegionBounds> = new Map([
  [1, { name: 'Nairobi', latMin: -1.5, latMax: -1.0, lonMin: 36.5, lonMax: 37.0, centerLat: -1.2921, centerLon: 36.8219 }],
  [2, { name: 'Mumbai', latMin: 18.8, latMax: 19.3, lonMin: 72.7, lonMax: 73.0, centerLat: 19.0760, centerLon: 72.8777 }],
  [3, { name: 'Manila', latMin: 14.4, latMax: 14.7, lonMin: 120.9, lonMax: 121.1, centerLat: 14.5995, centerLon: 120.9842 }],
]);

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
   * Fetch real rainfall data from Open-Meteo with coordinate validation
   */
  async fetchDailyRainfall(lat: number, lon: number, date: string, regionId?: number): Promise<number> {
    // M-04 fix: validate coordinates
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new Error(`Invalid latitude: ${lat}. Must be between -90 and 90.`);
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      throw new Error(`Invalid longitude: ${lon}. Must be between -180 and 180.`);
    }

    // If regionId provided, validate coordinates match the region
    if (regionId !== undefined) {
      const region = REGION_REGISTRY.get(regionId);
      if (region) {
        if (lat < region.latMin || lat > region.latMax || lon < region.lonMin || lon > region.lonMax) {
          throw new Error(
            `Coordinates (${lat}, ${lon}) are outside region ${regionId} (${region.name}) bounds. ` +
            `Expected lat: [${region.latMin}, ${region.latMax}], lon: [${region.lonMin}, ${region.lonMax}]`
          );
        }
      }
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD.`);
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&daily=precipitation_sum&start_date=${encodeURIComponent(date)}&end_date=${encodeURIComponent(date)}&timezone=UTC`;
    
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Open-Meteo API returned ${res.status}: ${await res.text()}`);
    }

    const data = await res.json() as WeatherResponse;
    
    if (!data.daily || !data.daily.precipitation_sum || data.daily.precipitation_sum.length === 0) {
      throw new Error(`No precipitation data returned for ${date}`);
    }

    return (data.daily.precipitation_sum[0] || 0) * 100; // mm * 100
  }

  /**
   * Fetch rainfall using region center coordinates
   */
  async fetchDailyRainfallByRegion(regionId: number, date: string): Promise<number> {
    const region = REGION_REGISTRY.get(regionId);
    if (!region) {
      throw new Error(`Unknown region_id: ${regionId}. Register it in REGION_REGISTRY first.`);
    }
    return this.fetchDailyRainfall(region.centerLat, region.centerLon, date, regionId);
  }

  /**
   * Post daily observation to Solana
   */
  async publishDailySnapshot(regionId: number, dayStartUnix: number, valueMmX100: number) {
    // Validate dayStartUnix is midnight-aligned
    if (dayStartUnix % 86400 !== 0) {
      throw new Error(`dayStartUnix must be midnight-aligned (multiple of 86400). Got: ${dayStartUnix}`);
    }

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
// const rainfall = await aggregator.fetchDailyRainfallByRegion(1, "2026-06-21");
// await aggregator.publishDailySnapshot(1, 1750464000, rainfall);
