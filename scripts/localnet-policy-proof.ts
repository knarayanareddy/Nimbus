// Real, isolated local-validator integration. Not mainnet/devnet or real insurance.
// Raw instruction ABI is source-checked against programs/nimbus/src/lib.rs/state.rs;
// it deliberately does not pretend the inherited partial client IDL is complete.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction,
  ComputeBudgetProgram, Ed25519Program, SYSVAR_RENT_PUBKEY, SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_CLOCK_PUBKEY, type AccountMeta } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddressSync, mintTo, getAccount } from '@solana/spl-token'
import nacl from 'tweetnacl'
import { serializeQuote, type QuoteFields } from '../lib/quote'
import { deserializeGlobalConfig, deserializePool, deserializePolicy } from '../lib/deserialize'

const RPC = 'http://127.0.0.1:19199'
const PROGRAM = new PublicKey('CLiMaFi1111111111111111111111111111111111111')
const knownPublicGenesis = ['5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG', '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY']
function u64(n: bigint) { const b=Buffer.alloc(8); b.writeBigUInt64LE(n); return b }
function i64(n: bigint) { const b=Buffer.alloc(8); b.writeBigInt64LE(n); return b }
function u32(n: number) { const b=Buffer.alloc(4); b.writeUInt32LE(n); return b }
function u16(n: number) { const b=Buffer.alloc(2); b.writeUInt16LE(n); return b }
function meta(pubkey: PublicKey, isWritable=false, isSigner=false): AccountMeta { return {pubkey,isWritable,isSigner} }
function pda(...seeds: Buffer[]) { return PublicKey.findProgramAddressSync(seeds, PROGRAM)[0] }
function ix(name: string, keys: AccountMeta[], ...args: Buffer[]) {
  const discriminator=createHash('sha256').update(`global:${name}`).digest().subarray(0,8)
  return new TransactionInstruction({programId:PROGRAM,keys,data:Buffer.concat([discriminator,...args])})
}

async function main() {
  const connection = new Connection(RPC, 'confirmed')
  const genesis = await connection.getGenesisHash()
  assert.ok(!knownPublicGenesis.some(prefix => genesis.startsWith(prefix)), 'Refuse public-cluster genesis at a forwarded local endpoint')
  const binaryPath=process.env.NIMBUS_PROGRAM_SO
  assert.ok(binaryPath, 'Set NIMBUS_PROGRAM_SO to the exact ELF preloaded on the fresh local validator')
  const binary=fs.readFileSync(binaryPath)
  const program=await connection.getAccountInfo(PROGRAM)
  assert.ok(program?.executable, 'Actual Nimbus program must be executable')
  let loadedBinary=program.data
  let programDataAddress: PublicKey | undefined
  if (program.owner.toBase58()==='BPFLoaderUpgradeab1e11111111111111111111111') {
    assert.equal(program.data.length,36); assert.equal(program.data.readUInt32LE(0),2)
    programDataAddress=new PublicKey(program.data.subarray(4))
    const data=await connection.getAccountInfo(programDataAddress)
    assert.ok(data && data.owner.equals(program.owner)); assert.equal(data.data.readUInt32LE(0),3)
    loadedBinary=data.data.subarray(45) // verified SDK ProgramData metadata size
  }
  assert.ok(loadedBinary.equals(binary), 'Loaded genesis program bytes must match the exact chosen ELF')
  const binarySha256=createHash('sha256').update(binary).digest('hex')
  const config=pda(Buffer.from('config'))
  assert.equal(await connection.getAccountInfo(config), null, 'Use a fresh task-owned validator; never replace existing policy/config data')
  const payer=Keypair.generate(), quoteSigner=Keypair.generate(), attacker=Keypair.generate()
  const records: Record<string,unknown>[]=[]
  const output=path.resolve(process.env.NIMBUS_POLICY_PROOF_DIR || 'docs/evidence')
  fs.mkdirSync(output,{recursive:true})
  const save=()=>fs.writeFileSync(path.join(output,'localnet-policy-progress.json'),JSON.stringify({cluster:'localnet',rpc:RPC,genesisHash:genesis,programId:PROGRAM.toBase58(),binarySha256,steps:records},null,2)+'\n')
  const airdrop=await connection.requestAirdrop(payer.publicKey,20_000_000_000)
  const air=await connection.confirmTransaction(airdrop,'confirmed'); assert.equal(air.value.err,null)
  async function send(label: string, instruction: TransactionInstruction, before: TransactionInstruction[]=[], extraSigners: Keypair[]=[]) {
    const latest=await connection.getLatestBlockhash('confirmed')
    const tx=new Transaction({feePayer:payer.publicKey,...latest}).add(ComputeBudgetProgram.setComputeUnitLimit({units:400_000}),...before,instruction)
    tx.sign(payer,...extraSigners)
    const signature=await connection.sendRawTransaction(tx.serialize(),{skipPreflight:false,maxRetries:2})
    const confirmed=await connection.confirmTransaction({signature,...latest},'confirmed'); assert.equal(confirmed.value.err,null)
    const observed=await connection.getTransaction(signature,{commitment:'confirmed',maxSupportedTransactionVersion:0})
    assert.ok(observed && !observed.meta?.err, `${label} must have exact successful transaction readback`)
    records.push({label,signature,slot:observed.slot,readbackVerified:true,logs:observed.meta?.logMessages});save()
    console.log(`${label}: confirmed slot ${observed.slot}`)
    return signature
  }
  async function expectReject(label: string, instruction: TransactionInstruction, expected: RegExp, before: TransactionInstruction[]=[], extraSigners: Keypair[]=[]) {
    let rejected=false
    try { await send(label,instruction,before,extraSigners) }
    catch(error) {
      const e=error as Error & {logs?:string[]}
      const observed=[e.message,...(e.logs||[])].join('\n')
      assert.match(observed,expected,`${label}: must reject for the intended control, not an unrelated transport error`)
      records.push({label,rejected:true,reason:observed});save();rejected=true
    }
    assert.ok(rejected,`${label}: unexpected success`)
  }
  const mint=await createMint(connection,payer,payer.publicKey,null,6)
  const ownerAta=await getOrCreateAssociatedTokenAccount(connection,payer,mint,payer.publicKey)
  const treasury=Keypair.generate().publicKey
  const treasuryAta=await getOrCreateAssociatedTokenAccount(connection,payer,mint,treasury)
  await mintTo(connection,payer,mint,ownerAta.address,payer,15_000_000_000n)
  await send('initialize_config',ix('initialize_config',[
    meta(config,true),meta(mint),meta(treasuryAta.address),meta(payer.publicKey,true,true),meta(SystemProgram.programId)
  ],u16(100),u32(172800),u32(86400),u32(31*86400),quoteSigner.publicKey.toBuffer(),payer.publicKey.toBuffer()))
  const cfgInfo=await connection.getAccountInfo(config);assert.ok(cfgInfo)
  const cfg=deserializeGlobalConfig(cfgInfo.data,cfgInfo.owner)
  assert.equal(cfg.protocolFeeBps,100);assert.equal(cfg.usdcMint.toBase58(),mint.toBase58())
  assert.equal(cfg.quoteSigner.toBase58(),quoteSigner.publicKey.toBase58())
  const poolId=1n, regionId=101n, pool=pda(Buffer.from('pool'),u64(poolId))
  const vaultAuth=pda(Buffer.from('vault_auth'),u64(poolId)), lpMint=pda(Buffer.from('lp_mint'),u64(poolId))
  const vaultAta=getAssociatedTokenAddressSync(mint,vaultAuth,true)
  const lpAta=getAssociatedTokenAddressSync(lpMint,payer.publicKey)
  await send('create_pool',ix('create_pool',[
    meta(config),meta(pool,true),meta(vaultAuth),meta(lpMint,true),meta(vaultAta,true),meta(mint),
    meta(payer.publicKey,true,true),meta(TOKEN_PROGRAM_ID),meta(ASSOCIATED_TOKEN_PROGRAM_ID),meta(SystemProgram.programId),meta(SYSVAR_RENT_PUBKEY)
  ],u64(poolId),Buffer.from([0]),Buffer.alloc(32),u32(31*86400),u16(8000)))
  async function balances() {
    const info=await connection.getAccountInfo(pool);assert.ok(info)
    const p=deserializePool(info.data,info.owner)
    const vault=await getAccount(connection,vaultAta), owner=await getAccount(connection,ownerAta.address), fees=await getAccount(connection,treasuryAta.address)
    assert.equal(BigInt(p.capital),vault.amount,'Recorded capital must match actual SPL vault balance')
    assert.ok(p.locked<=p.capital)
    return {capital:BigInt(p.capital),locked:BigInt(p.locked),vault:vault.amount,owner:owner.amount,treasury:fees.amount}
  }
  const initial=await balances();assert.equal(initial.capital,0n);assert.equal(initial.locked,0n)
  await send('deposit_liquidity',ix('deposit_liquidity',[
    meta(config),meta(pool,true),meta(vaultAuth),meta(lpMint,true),meta(payer.publicKey,true,true),meta(ownerAta.address,true),
    meta(vaultAta,true),meta(lpAta,true),meta(TOKEN_PROGRAM_ID),meta(ASSOCIATED_TOKEN_PROGRAM_ID),meta(SystemProgram.programId),meta(SYSVAR_RENT_PUBKEY)
  ],u64(10_000_000_000n)))
  assert.equal((await balances()).capital,10_000_000_000n)
  const nonce=pda(Buffer.from('quote_nonce'),payer.publicKey.toBuffer())
  await send('init_quote_nonce',ix('init_quote_nonce',[meta(nonce,true),meta(payer.publicKey,true,true),meta(SystemProgram.programId)]))
  const clock=await connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY);assert.ok(clock)
  const now=clock.data.readBigInt64LE(32), end=now/86400n*86400n, start=end-86400n
  const observation=pda(Buffer.from('obs'),u64(regionId),Buffer.from([0]),i64(start))
  const premium=20_000_000n,payout=500_000_000n,fee=premium*100n/10000n
  function policyAddress(id: bigint) {return pda(Buffer.from('policy'),u64(id))}
  function quoteFor(id: bigint,direction: 0|1,nonceValue: bigint): QuoteFields {return {
    policyId:id,poolId,regionId,peril:0,windowStartUnix:start,windowEndUnix:end,indexMethod:0,direction,
    threshold:8000n,payoutAmount:payout,premiumAmount:premium,quoteExpiryUnix:now+1800n,nonce:nonceValue
  }}
  function buy(quote: QuoteFields) {
    const message=serializeQuote(quote),signature=nacl.sign.detached(message,quoteSigner.secretKey)
    const ed=Ed25519Program.createInstructionWithPublicKey({publicKey:quoteSigner.publicKey.toBytes(),message,signature})
    const purchase=ix('buy_policy',[
      meta(config),meta(pool,true),meta(vaultAta,true),meta(treasuryAta.address,true),meta(policyAddress(quote.policyId),true),
      meta(payer.publicKey,true,true),meta(nonce,true),meta(ownerAta.address,true),meta(SYSVAR_INSTRUCTIONS_PUBKEY),meta(TOKEN_PROGRAM_ID),meta(SystemProgram.programId)
    ],message,Buffer.from(signature),Buffer.from([1])) // compute budget=0, Ed25519=1
    return {purchase,ed,message}
  }
  function settle(id: bigint, owner=payer.publicKey) {return ix('settle_policy',[
    meta(config),meta(pool,true),meta(vaultAuth),meta(vaultAta,true),meta(policyAddress(id),true),meta(owner,true,true),
    meta(ownerAta.address,true),meta(SYSVAR_INSTRUCTIONS_PUBKEY),meta(TOKEN_PROGRAM_ID),meta(observation)
  ])}
  async function policyState(id: bigint) {const info=await connection.getAccountInfo(policyAddress(id));assert.ok(info);return deserializePolicy(info.data,info.owner)}
  const a=buy(quoteFor(1n,0,1n)), beforeBuy=await balances()
  await send('buy_triggered_policy',a.purchase,[a.ed])
  const afterBuy=await balances();assert.equal(afterBuy.capital,beforeBuy.capital+premium-fee);assert.equal(afterBuy.locked,payout)
  assert.equal(afterBuy.owner,beforeBuy.owner-premium);assert.equal(afterBuy.treasury,beforeBuy.treasury+fee)
  const active=await policyState(1n);assert.equal(active.status,0)
  assert.deepEqual(Array.from(active.quoteHash),Array.from(createHash('sha256').update(a.message).digest()))
  await send('record_completed_test_observation',ix('record_observation',[
    meta(config),meta(observation,true),meta(payer.publicKey,true,true),meta(SystemProgram.programId)
  ],u64(regionId),Buffer.from([0]),i64(start),i64(500n),u16(1))) // labelled synthetic 5mm fixture
  await expectReject('unauthorized_settlement',settle(1n,attacker.publicKey),/Unauthorized/ ,[],[attacker])
  await send('settle_triggered_policy',settle(1n))
  const paid=await balances(), paidState=await policyState(1n)
  assert.equal(paid.capital,afterBuy.capital-payout);assert.equal(paid.owner,afterBuy.owner+payout);assert.equal(paid.locked,0n)
  assert.equal(paidState.status,2);assert.equal(paidState.triggered,true);assert.equal(paidState.observedValue,500)
  await expectReject('double_settlement',settle(1n),/PolicyNotActive/)
  assert.deepEqual(await balances(),paid,'Rejected duplicate settlement must not change balances')
  const replay=buy(quoteFor(3n,0,1n))
  await expectReject('quote_nonce_replay',replay.purchase,/NonceAlreadyUsed/,[replay.ed])
  assert.deepEqual(await balances(),paid,'Rejected quote replay must roll back policy creation and token state')
  assert.equal(await connection.getAccountInfo(policyAddress(3n)),null)
  const b=buy(quoteFor(2n,1,2n))
  await send('buy_non_triggered_policy',b.purchase,[b.ed])
  const untriggeredBought=await balances();assert.equal(untriggeredBought.locked,payout)
  await send('settle_non_triggered_policy',settle(2n))
  const expired=await balances(), expiredState=await policyState(2n)
  assert.equal(expired.capital,untriggeredBought.capital);assert.equal(expired.owner,untriggeredBought.owner);assert.equal(expired.locked,0n)
  assert.equal(expiredState.status,3);assert.equal(expiredState.triggered,false)
  const proof={schema:'nimbus-localnet-policy-proof/v1',cluster:'localnet',rpc:RPC,genesisHash:genesis,programId:PROGRAM.toBase58(),binarySha256,
    mint:mint.toBase58(),config:config.toBase58(),pool:pool.toBase58(),wallet:payer.publicKey.toBase58(),
    fixture:{kind:'synthetic-localnet-regression',startUnix:start.toString(),endUnix:end.toString(),rainMmX100:500,
      warning:'Backdated one-day test windows exercise inherited mechanics, not valid risk-transfer issuance or historical ERA5 authenticity'},
    finalBalances:Object.fromEntries(Object.entries(expired).map(([k,v])=>[k,v.toString()])),
    observed:{initialized:true,poolCreated:true,liquidityDeposited:true,triggeredPayoutMicroTestUsdc:payout.toString(),untriggeredPayout:'0',
      reserveAccountingMatchedVault:true,unauthorizedSettlementRejected:true,doubleSettlementRejected:true,quoteReplayRejected:true},steps:records,
    limitations:['Real local-validator program execution, not public devnet/mainnet deployment','Synthetic observations and backdated test issuance; no insurance, premium validation or external-weather truth','Token-2022 dependency compiler diagnostics and inherited production controls require separate review']}
  fs.writeFileSync(path.join(output,'localnet-policy-proof.json'),JSON.stringify(proof,null,2)+'\n')
  console.log(JSON.stringify({valid:true,confirmedTransactions:records.filter(r=>r.signature).length,negativeChecks:records.filter(r=>r.rejected).length,binarySha256,finalBalances:proof.finalBalances,proof:path.join(output,'localnet-policy-proof.json')},null,2))
}
main().catch(error=>{console.error(error);process.exit(1)})
