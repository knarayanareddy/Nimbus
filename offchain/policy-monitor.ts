/**
 * Production Policy Monitor Job
 * Scans for matured policies and settles them automatically
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import * as fs from 'fs';

const PROGRAM_ID = new PublicKey("CliMaFi1111111111111111111111111111111111111");

export class PolicyMonitor {
  private connection: Connection;
  private wallet: Wallet;
  private program: Program;

  constructor(rpcUrl: string, keypairPath: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    const secret = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    const keypair = Keypair.fromSecretKey(new Uint8Array(secret));
    this.wallet = new Wallet(keypair);

    const provider = new AnchorProvider(this.connection, this.wallet, {});
    this.program = new Program({} as any, PROGRAM_ID, provider);
  }

  async run() {
    console.log("[Monitor] Checking for matured policies...");

    // In production: query events or database for active policies
    const maturedPolicies = await this.fetchMaturedPoliciesFromChain();

    for (const policy of maturedPolicies) {
      try {
        await this.settlePolicy(policy);
      } catch (e) {
        console.error(`Failed to settle policy ${policy.id}:`, e);
      }
    }
  }

  private async fetchMaturedPoliciesFromChain() {
    // Placeholder: In production, scan Program logs or use a database
    return [];
  }

  private async settlePolicy(policy: any) {
    console.log(`[Monitor] Settling policy #${policy.id}`);

    const remainingAccounts = await this.buildObservationAccounts(policy);

    const tx = await this.program.methods
      .settlePolicy()
      .accounts({
        config: this.getConfigPDA(),
        pool: this.getPoolPDA(policy.poolId),
        vaultAuth: this.getVaultAuthPDA(policy.poolId),
        poolVaultUsdcAta: this.getPoolVaultAta(policy.poolId),
        policy: this.getPolicyPDA(policy.id),
        policyOwner: new PublicKey(policy.owner),
        policyOwnerUsdcAta: new PublicKey(policy.ownerUsdcAta),
        tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      })
      .remainingAccounts(remainingAccounts)
      .rpc();

    console.log(`[Monitor] Settled policy #${policy.id} → ${tx}`);
  }

  private async buildObservationAccounts(policy: any) {
    // Build list of ObservationSnapshot PDAs for each day in the window
    const accounts = [];
    const numDays = (policy.windowEndUnix - policy.windowStartUnix) / 86400;

    for (let i = 0; i < numDays; i++) {
      const dayStart = policy.windowStartUnix + i * 86400;
      const pda = PublicKey.findProgramAddressSync(
        [
          Buffer.from("obs"),
          new BN(policy.regionId).toArrayLike(Buffer, "le", 8),
          Buffer.from([0]), // Rainfall
          new BN(dayStart).toArrayLike(Buffer, "le", 8),
        ],
        PROGRAM_ID
      )[0];
      accounts.push({ pubkey: pda, isWritable: false, isSigner: false });
    }
    return accounts;
  }

  private getConfigPDA() { return PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0]; }
  private getPoolPDA(poolId: number) { return PublicKey.findProgramAddressSync([Buffer.from("pool"), new BN(poolId).toArrayLike(Buffer, "le", 8)], PROGRAM_ID)[0]; }
  private getVaultAuthPDA(poolId: number) { return PublicKey.findProgramAddressSync([Buffer.from("vault_auth"), new BN(poolId).toArrayLike(Buffer, "le", 8)], PROGRAM_ID)[0]; }
  private getPoolVaultAta(poolId: number) { return this.getVaultAuthPDA(poolId); } // Simplified
  private getPolicyPDA(policyId: number) { return PublicKey.findProgramAddressSync([Buffer.from("policy"), new BN(policyId).toArrayLike(Buffer, "le", 8)], PROGRAM_ID)[0]; }
}