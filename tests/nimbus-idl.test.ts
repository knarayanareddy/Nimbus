import { expect } from 'chai'
import { describe, it } from 'mocha'
import { BorshInstructionCoder, BN, type Idl } from '@coral-xyz/anchor'
import { createHash } from 'node:crypto'
import { IDL } from '../lib/nimbus'
import { serializeQuote, type QuoteFields } from '../lib/quote'

// Synthetic, deterministic transport fixture. No weather/payment claim.
const quote: QuoteFields = { policyId:1n,poolId:2n,regionId:3n,peril:0,windowStartUnix:1725148800n,
  windowEndUnix:1726358400n,indexMethod:0,direction:0,threshold:8000n,payoutAmount:500_000_000n,
  premiumAmount:20_000_000n,quoteExpiryUnix:1726359999n,nonce:1n }
function anchorQuote() {return {
  policyId:new BN(quote.policyId.toString()),poolId:new BN(quote.poolId.toString()),regionId:new BN(quote.regionId.toString()),
  peril:{rainfall:{}},windowStartUnix:new BN(quote.windowStartUnix.toString()),windowEndUnix:new BN(quote.windowEndUnix.toString()),
  indexMethod:{sum:{}},direction:{lessThan:{}},threshold:new BN(quote.threshold.toString()),
  payoutAmount:new BN(quote.payoutAmount.toString()),premiumAmount:new BN(quote.premiumAmount.toString()),
  quoteExpiryUnix:new BN(quote.quoteExpiryUnix.toString()),nonce:new BN(quote.nonce.toString())
}}
describe('Inherited Nimbus client IDL transport',()=>{
  it('constructs the real Anchor instruction coder and encodes nonce initialization',()=>{
    const coder=new BorshInstructionCoder(IDL as unknown as Idl)
    expect(coder.encode('initQuoteNonce',{})).to.deep.equal(createHash('sha256').update('global:init_quote_nonce').digest().subarray(0,8))
  })
  it('encodes buyPolicy with exactly the quote bytes signed and checked by the Rust program',()=>{
    const coder=new BorshInstructionCoder(IDL as unknown as Idl),signature=Buffer.alloc(64,7)
    const actual=coder.encode('buyPolicy',{quote:anchorQuote(),signature:Array.from(signature),ed25519IxIndex:1})
    const expected=Buffer.concat([createHash('sha256').update('global:buy_policy').digest().subarray(0,8),serializeQuote(quote),signature,Buffer.from([1])])
    expect(actual).to.deep.equal(expected)
  })
  it('rejects an unknown peril enum rather than constructing a different signed payload',()=>{
    const coder=new BorshInstructionCoder(IDL as unknown as Idl)
    expect(()=>coder.encode('buyPolicy',{quote:{...anchorQuote(),peril:{unknown:{}}},signature:Array(64).fill(0),ed25519IxIndex:1})).to.throw()
  })
})
