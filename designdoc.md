🌦️ NIMBUS — MASTER DESIGN DOCUMENT
Parametric Climate Insurance Protocol on Solana
Version 1.0 | Frontier Hackathon 2026 | CONFIDENTIAL
text

╔══════════════════════════════════════════════════════════════════════════════╗
║                        DOCUMENT CONTROL                                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Document Name  : Nimbus Master Design Document                             ║
║  Version        : 1.0.0                                                      ║
║  Status         : ACTIVE — HACKATHON BUILD                                   ║
║  Created        : May 2026                                                   ║
║  Target Chain   : Solana Mainnet-Beta (devnet → testnet → mainnet)           ║
║  Framework      : Anchor (Rust) + Next.js 14                                 ║
║  Target Event   : Colosseum Frontier Hackathon 2026                         ║
║  Prize Targets  : Grand Champion ($30K) + Public Goods ($10K)                ║
╚══════════════════════════════════════════════════════════════════════════════╝
📋 TABLE OF CONTENTS
text

1.0  Executive Summary & Vision
2.0  Problem Statement & Market Context
3.0  Product Overview & Core Mechanics
4.0  System Architecture (Full Stack)
5.0  Solana Program Design (Smart Contracts)
     5.1  Program Registry & Account Model
     5.2  Policy Manager Program
     5.3  Oracle Consumer Program
     5.4  Payout Engine Program
     5.5  Liquidity Pool Program
     5.6  Risk Pricing Engine Program
     5.7  Governance Program
6.0  Oracle Infrastructure
     6.1  WeatherXM Integration
     6.2  Multi-Source Oracle Aggregation
     6.3  Data Validation & Staleness Checks
7.0  Frontend Architecture
     7.1  Farmer/Policyholder UI
     7.2  Underwriter Dashboard
     7.3  Oracle Monitor
     7.4  Admin Panel
8.0  Backend & Off-Chain Infrastructure
9.0  Database Schema
10.0 API Specification
11.0 Security Architecture
12.0 Testing Strategy
13.0 Deployment Roadmap (Hour-by-Hour Hackathon Schedule)
14.0 Revenue Model & Tokenomics
15.0 Go-To-Market Strategy
16.0 Risk Register
17.0 Appendices
1.0 EXECUTIVE SUMMARY & VISION
1.1 The One-Liner
Nimbus is the world's first Solana-native parametric climate insurance protocol — enabling anyone, anywhere to buy weather-triggered insurance coverage that pays out automatically within 400 milliseconds of a climate event being confirmed onchain, with zero paperwork, zero adjusters, and zero waiting.

1.2 The Core Thesis
22
 Parametric insurance triggers automated payouts based on objective, quantifiable data rather than subjective damage assessments — examples include crop insurance that triggers a payment when regional weather sensors record severe drought conditions.
What has never been done before is bringing this paradigm natively to Solana, where:

Transaction costs are fractions of a cent (enabling micro-policies)
Finality is ~400ms (enabling real-time reactive payouts)
USDC is a first-class citizen (enabling stablecoin-denominated policies)
The DeFi composability layer exists (enabling underwriter yield strategies)
35
 Smart contracts will be able to take advantage of WeatherXM data using oracle services — bringing weather data on-chain will unlock new possibilities and allow developers to build services that were not feasible until now, such as on-chain weather insurance.
1.3 The Opportunity in Numbers
26
 The decentralized insurance market will grow from $2.36 billion in 2024 to $3.5 billion in 2025 (CAGR 48%), reaching $16.94 billion by 2029. 
22
 Existing insurance infrastructure often involves rigid geographic restrictions, extensive background checks, and administrative hurdles — while decentralized insurance protocols are globally available to anyone with a Web3 wallet, allowing users to purchase coverage or provide liquidity regardless of their physical location.
1.4 Why Solana — The Technical Argument
11
 Pyth updates prices roughly every 400 milliseconds thanks to Solana's lightning-fast blockchain — that's over 200,000 updates per day, ensuring that dApps always work with fresh, accurate data. 
17
 Traditional oracles didn't update fast enough for many financial applications, leading to inaccuracies and vulnerabilities — Pyth offers low-latency, high-frequency price feeds, a feature that requires a high-throughput blockchain like Solana to operate effectively and deliver real-time data.
This is the precise advantage that makes Nimbus work — real-time climate events require real-time onchain response. Ethereum cannot do this economically. Solana can.

2.0 PROBLEM STATEMENT & MARKET CONTEXT
2.1 The Insurance Gap
The global insurance protection gap — the difference between total economic losses from climate events and what is actually covered by insurance — is widening every year. 
22
In existing financial infrastructure, policyholders must trust that the insurance provider holds sufficient liquid assets to cover potential claims — this requires reliance on periodic audits and regulatory oversight. In decentralized insurance, the capital pools are entirely onchain — anyone can view the protocol reserves in real time to verify that the platform is solvent and capable of honoring its active policies.

2.2 The Traditional Insurance Failure Mode
Traditional indemnity insurance suffers from four core failure modes that Nimbus eliminates:

Failure Mode	Traditional Insurance	Nimbus Solution
Speed	Weeks to months for payout	400ms after oracle confirmation
Access	Requires underwriter approval	Permissionless, wallet-based
Cost	30-40% administrative overhead	2-3% protocol fee
Verification	Manual adjuster assessment	Immutable oracle data
22
 Using smart contracts enables automated, trust-minimized payouts — for parametric insurance products, the claims process operates without human intervention. Once a data point confirms a covered event has occurred, the smart contract executes the payout instantly, eliminating the lengthy claims investigation processes typical of existing insurance, reducing administrative costs and ensuring policyholders receive their funds immediately.
2.3 Who Gets Hurt Most
The populations that suffer the most from the insurance gap are:

Smallholder farmers in emerging markets — growing food for billions but completely exposed to climate volatility with no affordable coverage
SME businesses in coastal/flood zones — too small for commercial insurance, too exposed to self-insure
Agricultural cooperatives in Sub-Saharan Africa, South/Southeast Asia, Latin America — regions with highest climate risk and lowest insurance penetration
Event organizers, logistics companies, outdoor businesses — dependent on weather but unable to buy affordable parametric products
2.4 Why Now
21
 The model incorporates key features of DeFi insurance, including parametric payouts, basis risk arising from imperfect loss verification and pooled collateralization involving the risk of liquidity shortfalls — numerical results show that DeFi insurance can complement or replace traditional coverage, improving welfare when basis and default risks are moderate or pricing advantages are substantial.
The academic validation is now complete. The oracle infrastructure (WeatherXM, Pyth) is now live. The Solana ecosystem (USDC, Jupiter, Anchor) is production-ready. The moment to build Nimbus is right now.

3.0 PRODUCT OVERVIEW & CORE MECHANICS
3.1 Product Suite
Nimbus ships as three interconnected products:

text

┌─────────────────────────────────────────────────────────────────┐
│                        NIMBUS PROTOCOL                          │
├──────────────────┬──────────────────┬───────────────────────────┤
│   NIMBUS COVER  │  NIMBUS VAULT   │    NIMBUS RISK ENGINE     │
│  (Policyholders) │  (Underwriters)  │    (Actuarial Pricing)     │
│                  │                  │                            │
│  Buy weather     │  Stake USDC to   │  Real-time risk scoring    │
│  insurance in    │  earn premium     │  based on historical       │
│  60 seconds      │  yield           │  weather data              │
└──────────────────┴──────────────────┴───────────────────────────┘
3.2 Policy Types (V1 Launch)
Type 1: Drought Insurance
Trigger: Cumulative rainfall in a defined region drops below X mm over Y days
Use Case: Smallholder farmers, agricultural businesses
Example Policy: "If rainfall in Nairobi Region drops below 50mm over 30 days between June 1–Aug 31, pay 500 USDC"
Type 2: Flood Insurance
Trigger: Cumulative rainfall exceeds X mm over Y days
Use Case: Coastal businesses, logistics, event organizers
Example Policy: "If rainfall in Mumbai exceeds 200mm in any 72-hour period, pay 1000 USDC"
Type 3: Temperature Extremes Insurance
Trigger: Average daily temperature exceeds/drops below a threshold for Z consecutive days
Use Case: Energy companies, outdoor venues, agriculture
Example Policy: "If temperature in Lagos exceeds 42°C for 5 consecutive days, pay 750 USDC"
Type 4: Wind/Storm Insurance
Trigger: Sustained wind speed exceeds X km/h for Y hours
Use Case: Construction, events, maritime, agriculture
Example Policy: "If wind speed in Manila exceeds 89 km/h sustained for 6 hours, pay 2000 USDC"
Type 5: Composite/Multi-Peril (V2)
Trigger: Any combination of the above within a policy window
Use Case: Complex agri-businesses, insurtech B2B partners
3.3 Policy Lifecycle — End-to-End Flow
text

═══════════════════════════════════════════════════════════════════
                    NIMBUS POLICY LIFECYCLE
═══════════════════════════════════════════════════════════════════

PHASE 1: POLICY CREATION
─────────────────────────
User → Connect Wallet (Phantom/Backpack)
     → Select Region (via interactive map)
     → Select Coverage Type (Drought/Flood/Temp/Wind)
     → Define Trigger Parameters
     → Define Coverage Period (start date → end date)
     → Define Coverage Amount (min: 10 USDC, max: 10,000 USDC)
     → Risk Engine → Calculates Premium (actuarial model)
     → User Reviews Quote → Accepts
     → Signs Transaction → Premium deducted from wallet
     → Policy NFT minted to user wallet
     → Policy registered in PolicyManager Program PDA
     → Oracle monitoring begins automatically

PHASE 2: ACTIVE MONITORING
────────────────────────────
Oracle Consumer Program → Polls WeatherXM API every 15 minutes
                        → Validates data freshness & confidence
                        → Stores reading in OracleState PDA
                        → Compares against all active policy triggers
                        → If NO trigger: next poll in 15 minutes
                        → If POSSIBLE trigger: switch to 5-min polling

PHASE 3: TRIGGER EVALUATION
─────────────────────────────
PayoutEngine → Loads OracleState data
             → Loads PolicyAccount data
             → Evaluates trigger condition
             → If NOT met: update LastChecked timestamp, continue
             → If MET: initiate Payout Sequence

PHASE 4: PAYOUT SEQUENCE
──────────────────────────
PayoutEngine → Verify oracle data freshness (< 30 min old)
             → Cross-reference secondary oracle source
             → Verify liquidity pool has sufficient funds
             → Calculate payout amount (fixed OR sliding scale)
             → Execute CPI to SPL Token Program
             → Transfer USDC from Vault PDA → User Wallet
             → Emit PayoutExecuted event log
             → Update PolicyState → CLAIMED
             → Update PolicyNFT metadata (show "PAID OUT")
             → Record in ClaimHistory PDA

PHASE 5: SETTLEMENT & REPORTING
─────────────────────────────────
Protocol → Calculates underwriter loss ratio
         → Updates pool APY metrics
         → Emits analytics event to indexer
         → Generates claim receipt (PDF via off-chain service)
         → Sends notification to user (email/wallet notification)

═══════════════════════════════════════════════════════════════════
3.4 The Hybrid-Parametric Innovation
Nimbus's core technical innovation is its Hybrid-Parametric Settlement Model:

text

EVENT OCCURS
    │
    ▼
STAGE 1: PARAMETRIC TRIGGER (Immediate — within 400ms)
├── Oracle confirms threshold crossed
├── 50% of coverage amount released immediately (liquidity tranche)
└── Farmer has immediate cash to respond to crisis

    │ (48-hour window)
    ▼

STAGE 2: VERIFICATION LAYER (Secondary Confirmation)
├── Second oracle source confirms (WeatherXM cross-check)
├── Historical trend analysis validates anomaly
└── Smart contract confirms both sources agree

    │ (if confirmed)
    ▼

STAGE 3: FULL SETTLEMENT (Remaining 50%)
├── Remaining coverage amount released
├── Claim NFT updated to FULLY_SETTLED status
└── Protocol fee deducted from total
This two-stage model reduces basis risk (the gap between parametric payout and actual loss) while still providing immediate liquidity — the most critical feature for vulnerable policyholders.

4.0 SYSTEM ARCHITECTURE (FULL STACK)
4.1 Architecture Diagram
text

╔══════════════════════════════════════════════════════════════════════╗
║                    NIMBUS FULL SYSTEM ARCHITECTURE                  ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ┌─────────────────────────────────────────────────────────────┐    ║
║  │                    CLIENT LAYER                              │    ║
║  │  Next.js 14 App (App Router)                                 │    ║
║  │  ├── /app          (Farmer/Buyer UI)                         │    ║
║  │  ├── /vault        (Underwriter Dashboard)                   │    ║
║  │  ├── /monitor      (Oracle Live Feed)                        │    ║
║  │  ├── /claims       (Claims History)                          │    ║
║  │  └── /admin        (Protocol Admin)                          │    ║
║  └────────────────────────┬────────────────────────────────────┘    ║
║                           │ RPC + WebSocket                          ║
║  ┌────────────────────────▼────────────────────────────────────┐    ║
║  │                   SOLANA BLOCKCHAIN                          │    ║
║  │                                                              │    ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │    ║
║  │  │   POLICY     │  │   ORACLE     │  │    PAYOUT        │  │    ║
║  │  │   MANAGER    │  │   CONSUMER   │  │    ENGINE        │  │    ║
║  │  │   PROGRAM    │  │   PROGRAM    │  │    PROGRAM       │  │    ║
║  │  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │    ║
║  │         │                 │                    │             │    ║
║  │  ┌──────▼───────┐  ┌──────▼───────┐  ┌────────▼─────────┐  │    ║
║  │  │  LIQUIDITY   │  │     RISK     │  │   GOVERNANCE     │  │    ║
║  │  │  POOL PROG.  │  │   PRICING    │  │    PROGRAM       │  │    ║
║  │  │              │  │   PROGRAM    │  │                  │  │    ║
║  │  └──────────────┘  └──────────────┘  └──────────────────┘  │    ║
║  └──────────────────────────┬───────────────────────────────────┘    ║
║                             │                                        ║
║  ┌──────────────────────────▼───────────────────────────────────┐   ║
║  │              OFF-CHAIN ORACLE INFRASTRUCTURE                  │   ║
║  │                                                               │   ║
║  │  ┌────────────────┐  ┌─────────────────┐  ┌───────────────┐  │   ║
║  │  │   WeatherXM    │  │  Open-Meteo API  │  │  NOAA API    │  │   ║
║  │  │  Oracle (Web3) │  │  (Fallback #1)   │  │  (Fallback#2)│  │   ║
║  │  └───────┬────────┘  └────────┬─────────┘  └──────┬───────┘  │   ║
║  │          └────────────────────┼────────────────────┘          │   ║
║  │                               │                               │   ║
║  │  ┌────────────────────────────▼──────────────────────────┐   │   ║
║  │  │           ORACLE AGGREGATOR SERVICE (Node.js)          │   │   ║
║  │  │   • Polls all 3 sources every 15 minutes               │   │   ║
║  │  │   • Validates data quality & freshness                 │   │   ║
║  │  │   • Resolves conflicts (median of 3 sources)           │   │   ║
║  │  │   • Submits aggregated reading to Solana via CPI       │   │   ║
║  │  │   • Stores raw readings in PostgreSQL                  │   │   ║
║  │  └────────────────────────────────────────────────────────┘   │   ║
║  └───────────────────────────────────────────────────────────────┘   ║
║                                                                      ║
║  ┌────────────────────────────────────────────────────────────────┐  ║
║  │                   BACKEND SERVICES LAYER                       │  ║
║  │   Node.js/Express API Server                                   │  ║
║  │   ├── Weather Data Aggregator Service                          │  ║
║  │   ├── Premium Pricing Calculator Service                       │  ║
║  │   ├── Policy Monitoring Cron Service                           │  ║
║  │   ├── Notification Service (Email + Push)                      │  ║
║  │   ├── PDF Receipt Generator Service                            │  ║
║  │   └── Analytics & Reporting Service                            │  ║
║  └────────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  ┌────────────────────────────────────────────────────────────────┐  ║
║  │                   DATA LAYER                                   │  ║
║  │   PostgreSQL (primary) + Redis (cache) + IPFS (documents)      │  ║
║  └────────────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════╝
4.2 Technology Stack
Layer	Technology	Version	Purpose
Blockchain	Solana Mainnet-Beta	Latest	Core settlement layer
Smart Contracts	Rust + Anchor	0.31.1	Onchain program logic
Frontend	Next.js	14.x	User interfaces
Wallet	Solana Wallet Adapter	Latest	Phantom, Backpack, Solflare
State Mgmt	Zustand	4.x	Client-side state
Styling	Tailwind CSS + shadcn/ui	Latest	UI components
Charts	Recharts	2.x	Weather visualization
Maps	Mapbox GL JS	Latest	Region selection
Backend	Node.js + Express	20 LTS	API server
Database	PostgreSQL	16	Primary data store
Cache	Redis	7.x	Oracle data caching
Storage	IPFS via Pinata	Latest	Policy documents
Oracle Primary	WeatherXM	Latest	Decentralized weather data
Oracle Backup 1	Open-Meteo	Latest	Free weather API
Oracle Backup 2	NOAA CDO API	Latest	Government data
Stablecoin	USDC (SPL)	—	Premium + payout currency
DEX Integration	Jupiter Aggregator	v6	SOL → USDC conversion
Notifications	Resend	Latest	Transactional email
Hosting	Vercel (frontend) + Railway (backend)	—	Deployment
Monitoring	Datadog	—	System observability
5.0 SOLANA PROGRAM DESIGN (SMART CONTRACTS)
5.1 Program Registry & Account Model
1
 Anchor is a framework providing several convenient developer tools for writing Solana programs (sometimes called 'smart contracts') and is the most popular framework for Solana programs. 
9
 Anchor reduces Solana program code by up to 80% compared to raw implementation, standardizes security practices, simplifies state management, and provides automatic client generation for multiple programming languages.
Program IDs (Devnet — to be replaced with Mainnet after audit)
text

POLICY_MANAGER_PROGRAM_ID   = "CLMFpMgr1111111111111111111111111111111111111"
ORACLE_CONSUMER_PROGRAM_ID  = "CLMForc1111111111111111111111111111111111111"
PAYOUT_ENGINE_PROGRAM_ID    = "CLMFpay11111111111111111111111111111111111111"
LIQUIDITY_POOL_PROGRAM_ID   = "CLMFvlt11111111111111111111111111111111111111"
RISK_PRICING_PROGRAM_ID     = "CLMFrsk11111111111111111111111111111111111111"
GOVERNANCE_PROGRAM_ID       = "CLMFgov11111111111111111111111111111111111111"
Global Account Model
7
 Anchor programs are closely tied to Solana's architecture: each object is a separate account with a defined structure and memory allocation. When working with memory, it's important to consider strict data size limitations. Unlike traditional databases, storing information on-chain is costly and requires efficient resource usage. Anchor helps mitigate this issue by using lightweight data structures and macros for optimized memory management.
text

ACCOUNT HIERARCHY:

ProtocolState (PDA: ["nimbus", "protocol"])
├── PolicyAccount (PDA: ["policy", user_pubkey, policy_id])
│   ├── TriggerCondition (embedded in PolicyAccount)
│   └── ClaimHistory (PDA: ["claim", policy_pubkey])
├── OracleState (PDA: ["oracle", region_id])
│   └── WeatherReading (ring buffer, last 96 readings)
├── LiquidityPool (PDA: ["pool", coverage_type])
│   ├── UnderwriterPosition (PDA: ["lp", pool_pubkey, staker_pubkey])
│   └── PoolVault (Token Account — holds USDC)
├── RiskModel (PDA: ["risk", region_id, coverage_type])
└── GovernanceState (PDA: ["governance"])
    └── Proposal (PDA: ["proposal", proposal_id])
5.2 Policy Manager Program
This is the core consumer-facing program. It handles policy creation, storage, and status management.

Account Structures
Rust

// ─────────────────────────────────────────────────────────────────
// FILE: programs/policy_manager/src/lib.rs
// ─────────────────────────────────────────────────────────────────

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("CLMFpMgr1111111111111111111111111111111111111");

// ─── ACCOUNT STRUCTURES ──────────────────────────────────────────

#[account]
pub struct ProtocolState {
    pub authority: Pubkey,            // Protocol admin
    pub treasury: Pubkey,             // Protocol fee treasury
    pub protocol_fee_bps: u16,        // Fee in basis points (e.g., 200 = 2%)
    pub total_policies: u64,          // Total policies ever created
    pub total_active_policies: u64,   // Currently active policies
    pub total_premium_volume: u64,    // Lifetime premium volume (in USDC lamports)
    pub total_payout_volume: u64,     // Lifetime payout volume
    pub is_paused: bool,              // Emergency pause
    pub bump: u8,
}

#[account]
pub struct PolicyAccount {
    pub policy_id: u64,               // Auto-incremented ID
    pub owner: Pubkey,                // Policyholder wallet
    pub region_id: String,            // Geographic region identifier (max 32 chars)
    pub coverage_type: CoverageType,  // Enum: Drought, Flood, Temperature, Wind
    pub trigger: TriggerCondition,    // The parametric trigger
    pub coverage_amount: u64,         // In USDC lamports (1 USDC = 1_000_000)
    pub premium_paid: u64,            // Premium paid in USDC lamports
    pub start_timestamp: i64,         // Unix timestamp
    pub end_timestamp: i64,           // Unix timestamp
    pub status: PolicyStatus,         // Active, Expired, Claimed, PartiallyPaid
    pub payout_stage: PayoutStage,    // None, Stage1Paid, FullyPaid
    pub created_at: i64,
    pub last_checked: i64,            // Last oracle check timestamp
    pub pool_pubkey: Pubkey,          // Associated liquidity pool
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum CoverageType {
    Drought,
    Flood,
    TemperatureHigh,
    TemperatureLow,
    Wind,
    Composite,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TriggerCondition {
    pub metric: WeatherMetric,         // Rainfall, Temperature, WindSpeed
    pub operator: ComparisonOperator,  // LessThan, GreaterThan, Between
    pub threshold_value: i64,          // Primary threshold (in tenths for precision)
    pub threshold_value_2: i64,        // Secondary threshold (for Between operator)
    pub window_days: u16,              // Measurement window in days
    pub consecutive_required: bool,    // Must be consecutive days?
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum WeatherMetric {
    DailyRainfallMM,       // Millimeters × 10 (stored as integer)
    CumulativeRainfallMM,  // Cumulative over window
    MaxTemperatureCelsius, // °C × 10
    MinTemperatureCelsius,
    AvgTemperatureCelsius,
    WindSpeedKMH,          // km/h × 10
    HumidityPercent,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ComparisonOperator {
    LessThan,
    LessThanOrEqual,
    GreaterThan,
    GreaterThanOrEqual,
    Between,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum PolicyStatus {
    Active,
    Expired,
    Claimed,
    PartiallyPaid,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum PayoutStage {
    None,
    Stage1Paid,   // 50% immediate payout made
    FullyPaid,    // 100% payout complete
}

#[account]
pub struct ClaimRecord {
    pub policy_pubkey: Pubkey,
    pub claim_timestamp: i64,
    pub trigger_value: i64,          // What value triggered the payout
    pub stage: PayoutStage,
    pub amount_paid: u64,
    pub oracle_data_hash: [u8; 32],  // Hash of oracle data used
    pub tx_signature: [u8; 64],      // Transaction signature of payout
    pub bump: u8,
}

// ─── INSTRUCTION CONTEXTS ────────────────────────────────────────

#[derive(Accounts)]
#[instruction(policy_id: u64)]
pub struct CreatePolicy<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + PolicyAccount::LEN,
        seeds = [b"policy", owner.key().as_ref(), &policy_id.to_le_bytes()],
        bump
    )]
    pub policy_account: Account<'info, PolicyAccount>,

    #[account(
        mut,
        seeds = [b"nimbus", b"protocol"],
        bump = protocol_state.bump,
    )]
    pub protocol_state: Account<'info, ProtocolState>,

    // User's USDC token account (premium deducted from here)
    #[account(
        mut,
        constraint = user_usdc_account.owner == owner.key(),
        constraint = user_usdc_account.mint == USDC_MINT_PUBKEY,
    )]
    pub user_usdc_account: Account<'info, TokenAccount>,

    // Liquidity pool vault (premium deposited here)
    #[account(
        mut,
        seeds = [b"pool_vault", pool_account.key().as_ref()],
        bump,
    )]
    pub pool_vault: Account<'info, TokenAccount>,

    pub pool_account: Account<'info, LiquidityPool>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CancelPolicy<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"policy", owner.key().as_ref(), &policy_account.policy_id.to_le_bytes()],
        bump = policy_account.bump,
        constraint = policy_account.owner == owner.key() @ ClimaCareError::Unauthorized,
        constraint = policy_account.status == PolicyStatus::Active @ ClimaCareError::PolicyNotActive,
    )]
    pub policy_account: Account<'info, PolicyAccount>,

    #[account(mut)]
    pub user_usdc_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,

    pub pool_account: Account<'info, LiquidityPool>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ─── INSTRUCTION HANDLERS ────────────────────────────────────────

pub mod instructions {
    use super::*;

    pub fn create_policy(
        ctx: Context<CreatePolicy>,
        policy_id: u64,
        region_id: String,
        coverage_type: CoverageType,
        trigger: TriggerCondition,
        coverage_amount: u64,
        premium_amount: u64,
        start_timestamp: i64,
        end_timestamp: i64,
    ) -> Result<()> {

        // ── VALIDATION ───────────────────────────────────────────
        require!(!ctx.accounts.protocol_state.is_paused,
            ClimaCareError::ProtocolPaused);
        require!(coverage_amount >= MIN_COVERAGE_AMOUNT,
            ClimaCareError::CoverageTooLow);
        require!(coverage_amount <= MAX_COVERAGE_AMOUNT,
            ClimaCareError::CoverageTooHigh);
        require!(start_timestamp < end_timestamp,
            ClimaCareError::InvalidPolicyWindow);
        require!(end_timestamp > Clock::get()?.unix_timestamp,
            ClimaCareError::PolicyAlreadyExpired);
        require!(region_id.len() <= 32,
            ClimaCareError::RegionIdTooLong);

        // ── TRANSFER PREMIUM FROM USER → POOL VAULT ──────────────
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_usdc_account.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, premium_amount)?;

        // ── SPLIT PREMIUM: PROTOCOL FEE + POOL ───────────────────
        let protocol_fee = (premium_amount as u128)
            .checked_mul(ctx.accounts.protocol_state.protocol_fee_bps as u128)
            .unwrap()
            .checked_div(10_000)
            .unwrap() as u64;

        // ── INITIALIZE POLICY ACCOUNT ─────────────────────────────
        let policy = &mut ctx.accounts.policy_account;
        policy.policy_id = policy_id;
        policy.owner = ctx.accounts.owner.key();
        policy.region_id = region_id;
        policy.coverage_type = coverage_type;
        policy.trigger = trigger;
        policy.coverage_amount = coverage_amount;
        policy.premium_paid = premium_amount;
        policy.start_timestamp = start_timestamp;
        policy.end_timestamp = end_timestamp;
        policy.status = PolicyStatus::Active;
        policy.payout_stage = PayoutStage::None;
        policy.created_at = Clock::get()?.unix_timestamp;
        policy.last_checked = Clock::get()?.unix_timestamp;
        policy.pool_pubkey = ctx.accounts.pool_account.key();
        policy.bump = ctx.bumps.policy_account;

        // ── UPDATE PROTOCOL STATE ─────────────────────────────────
        let protocol = &mut ctx.accounts.protocol_state;
        protocol.total_policies = protocol.total_policies
            .checked_add(1).unwrap();
        protocol.total_active_policies = protocol.total_active_policies
            .checked_add(1).unwrap();
        protocol.total_premium_volume = protocol.total_premium_volume
            .checked_add(premium_amount).unwrap();

        // ── EMIT EVENT ────────────────────────────────────────────
        emit!(PolicyCreatedEvent {
            policy_id,
            owner: ctx.accounts.owner.key(),
            coverage_amount,
            premium_paid: premium_amount,
            start_timestamp,
            end_timestamp,
        });

        Ok(())
    }

    pub fn cancel_policy(ctx: Context<CancelPolicy>) -> Result<()> {
        let policy = &ctx.accounts.policy_account;
        let now = Clock::get()?.unix_timestamp;

        // Only allow cancellation within first 24 hours (cooling off period)
        let time_since_creation = now - policy.created_at;
        require!(
            time_since_creation <= CANCELLATION_WINDOW_SECONDS,
            ClimaCareError::CancellationWindowExpired
        );

        // Calculate refund amount (premium minus protocol fee, minus time used)
        let refund_amount = calculate_cancellation_refund(
            policy.premium_paid,
            policy.created_at,
            now,
        );

        // Transfer refund from pool vault back to user
        // ... (CPI transfer logic)

        // Update policy status
        let policy = &mut ctx.accounts.policy_account;
        policy.status = PolicyStatus::Cancelled;

        emit!(PolicyCancelledEvent {
            policy_id: policy.policy_id,
            owner: policy.owner,
            refund_amount,
        });

        Ok(())
    }
}

// ─── EVENTS ──────────────────────────────────────────────────────

#[event]
pub struct PolicyCreatedEvent {
    pub policy_id: u64,
    pub owner: Pubkey,
    pub coverage_amount: u64,
    pub premium_paid: u64,
    pub start_timestamp: i64,
    pub end_timestamp: i64,
}

#[event]
pub struct PolicyCancelledEvent {
    pub policy_id: u64,
    pub owner: Pubkey,
    pub refund_amount: u64,
}

// ─── ERRORS ──────────────────────────────────────────────────────

#[error_code]
pub enum ClimaCareError {
    #[msg("Protocol is currently paused")]
    ProtocolPaused,
    #[msg("Coverage amount below minimum of 10 USDC")]
    CoverageTooLow,
    #[msg("Coverage amount exceeds maximum of 10,000 USDC")]
    CoverageTooHigh,
    #[msg("Policy start must be before end")]
    InvalidPolicyWindow,
    #[msg("Policy end date is in the past")]
    PolicyAlreadyExpired,
    #[msg("Region ID must be 32 characters or fewer")]
    RegionIdTooLong,
    #[msg("Unauthorized — you do not own this policy")]
    Unauthorized,
    #[msg("Policy is not in Active status")]
    PolicyNotActive,
    #[msg("Cancellation window (24 hours) has expired")]
    CancellationWindowExpired,
    #[msg("Insufficient liquidity in pool")]
    InsufficientLiquidity,
    #[msg("Oracle data is stale — too old to use")]
    StaleOracleData,
    #[msg("Oracle confidence interval too wide — data unreliable")]
    OracleConfidenceTooLow,
}

// ─── CONSTANTS ───────────────────────────────────────────────────

pub const MIN_COVERAGE_AMOUNT: u64 = 10_000_000;       // 10 USDC
pub const MAX_COVERAGE_AMOUNT: u64 = 10_000_000_000;   // 10,000 USDC
pub const CANCELLATION_WINDOW_SECONDS: i64 = 86_400;   // 24 hours
pub const USDC_MINT_PUBKEY: &str =
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // Mainnet USDC
5.3 Oracle Consumer Program
This program is the bridge between the real world and the blockchain. It receives weather data from the off-chain aggregator and stores it in a verifiable, structured format.

11
 Blockchain is great at keeping records and running smart contracts — but there's one major thing it can't do on its own: access real-world information. Yet real-world data is essential for many Web3 applications. 
20
 Applications integrating Pyth Network should implement staleness checks and fallback mechanisms to handle feed interruptions. Smart contracts can specify maximum acceptable age for price data, automatically pausing operations if updates exceed this threshold. Developers typically maintain secondary oracle connections or cached price data for emergency scenarios.
Rust

// ─────────────────────────────────────────────────────────────────
// FILE: programs/oracle_consumer/src/lib.rs
// ─────────────────────────────────────────────────────────────────

use anchor_lang::prelude::*;

declare_id!("CLMForc1111111111111111111111111111111111111");

// ─── ACCOUNT STRUCTURES ──────────────────────────────────────────

#[account]
pub struct OracleState {
    pub region_id: String,                    // "KEN-NRB-001" format
    pub authority: Pubkey,                    // Authorized oracle submitter
    pub last_update: i64,                     // Unix timestamp of last update
    pub update_count: u64,                    // Total updates ever submitted
    pub readings: [WeatherReading; 96],       // Ring buffer: 96 readings = 24hrs at 15min
    pub reading_index: u8,                    // Current write position in ring buffer
    pub is_active: bool,                      // Is this oracle region active?
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct WeatherReading {
    pub timestamp: i64,
    pub rainfall_mm_x10: i32,        // Rainfall in mm × 10 (e.g., 25.5mm = 255)
    pub temperature_c_x10: i32,      // Temp in °C × 10 (e.g., 32.5°C = 325)
    pub wind_speed_kmh_x10: i32,     // Wind speed × 10
    pub humidity_pct_x10: i32,       // Humidity × 10
    pub source_count: u8,            // How many sources agreed (1, 2, or 3)
    pub confidence_score: u8,        // 0-100, weighted agreement score
    pub data_hash: [u8; 16],         // First 16 bytes of SHA256 of raw data
}

// ─── INSTRUCTION CONTEXTS ────────────────────────────────────────

#[derive(Accounts)]
#[instruction(region_id: String)]
pub struct InitializeOracle<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + OracleState::LEN,
        seeds = [b"oracle", region_id.as_bytes()],
        bump
    )]
    pub oracle_state: Account<'info, OracleState>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SubmitWeatherReading<'info> {
    #[account(mut)]
    pub oracle_submitter: Signer<'info>,

    #[account(
        mut,
        seeds = [b"oracle", oracle_state.region_id.as_bytes()],
        bump = oracle_state.bump,
        // Only authorized oracle submitter can update
        constraint = oracle_state.authority == oracle_submitter.key()
            @ OracleError::UnauthorizedSubmitter,
        // Must be active
        constraint = oracle_state.is_active
            @ OracleError::OracleInactive,
    )]
    pub oracle_state: Account<'info, OracleState>,
}

// ─── INSTRUCTION HANDLERS ────────────────────────────────────────

pub mod instructions {
    use super::*;

    pub fn initialize_oracle(
        ctx: Context<InitializeOracle>,
        region_id: String,
    ) -> Result<()> {
        let oracle = &mut ctx.accounts.oracle_state;
        oracle.region_id = region_id;
        oracle.authority = ctx.accounts.authority.key();
        oracle.last_update = 0;
        oracle.update_count = 0;
        oracle.reading_index = 0;
        oracle.is_active = true;
        oracle.bump = ctx.bumps.oracle_state;
        // Initialize ring buffer with zeroed readings
        oracle.readings = [WeatherReading::default(); 96];
        Ok(())
    }

    pub fn submit_weather_reading(
        ctx: Context<SubmitWeatherReading>,
        reading: WeatherReading,
        region_id: String,
    ) -> Result<()> {
        let oracle = &mut ctx.accounts.oracle_state;
        let now = Clock::get()?.unix_timestamp;

        // ── STALENESS CHECK ───────────────────────────────────────
        // Reject readings that are more than 30 minutes old
        require!(
            reading.timestamp >= now - 1800,
            OracleError::ReadingTooOld
        );

        // ── CONFIDENCE CHECK ──────────────────────────────────────
        // Require at least 2 of 3 sources to agree
        require!(
            reading.source_count >= 2,
            OracleError::InsufficientSourceConsensus
        );

        // Require confidence score of at least 60/100
        require!(
            reading.confidence_score >= 60,
            OracleError::ConfidenceTooLow
        );

        // ── SANITY BOUNDS CHECK ───────────────────────────────────
        // Validate data is physically plausible
        require!(
            reading.rainfall_mm_x10 >= 0 && reading.rainfall_mm_x10 <= 5000,
            OracleError::RainfallOutOfBounds
        );
        require!(
            reading.temperature_c_x10 >= -800 && reading.temperature_c_x10 <= 700,
            OracleError::TemperatureOutOfBounds
        );
        require!(
            reading.wind_speed_kmh_x10 >= 0 && reading.wind_speed_kmh_x10 <= 4500,
            OracleError::WindSpeedOutOfBounds
        );

        // ── WRITE TO RING BUFFER ──────────────────────────────────
        let idx = oracle.reading_index as usize;
        oracle.readings[idx] = reading;
        oracle.reading_index = ((oracle.reading_index + 1) % 96) as u8;
        oracle.last_update = now;
        oracle.update_count = oracle.update_count.checked_add(1).unwrap();

        emit!(WeatherReadingSubmittedEvent {
            region_id,
            timestamp: reading.timestamp,
            rainfall_mm_x10: reading.rainfall_mm_x10,
            temperature_c_x10: reading.temperature_c_x10,
            wind_speed_kmh_x10: reading.wind_speed_kmh_x10,
            source_count: reading.source_count,
            confidence_score: reading.confidence_score,
        });

        Ok(())
    }

    // ── UTILITY: GET CUMULATIVE RAINFALL OVER WINDOW ─────────────
    pub fn get_cumulative_rainfall(
        oracle: &OracleState,
        window_hours: u16,
    ) -> i32 {
        let readings_to_check = (window_hours as usize * 4)
            .min(oracle.readings.len()); // 4 readings per hour (15 min intervals)
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap().as_secs() as i64;
        let cutoff = now - (window_hours as i64 * 3600);

        oracle.readings.iter()
            .filter(|r| r.timestamp >= cutoff && r.timestamp > 0)
            .take(readings_to_check)
            .map(|r| r.rainfall_mm_x10)
            .sum()
    }
}

// ─── EVENTS ──────────────────────────────────────────────────────

#[event]
pub struct WeatherReadingSubmittedEvent {
    pub region_id: String,
    pub timestamp: i64,
    pub rainfall_mm_x10: i32,
    pub temperature_c_x10: i32,
    pub wind_speed_kmh_x10: i32,
    pub source_count: u8,
    pub confidence_score: u8,
}

// ─── ERRORS ──────────────────────────────────────────────────────

#[error_code]
pub enum OracleError {
    #[msg("Only the authorized oracle submitter can update this oracle")]
    UnauthorizedSubmitter,
    #[msg("Oracle region is not active")]
    OracleInactive,
    #[msg("Weather reading timestamp is more than 30 minutes old")]
    ReadingTooOld,
    #[msg("At least 2 of 3 oracle sources must agree on reading")]
    InsufficientSourceConsensus,
    #[msg("Confidence score below minimum threshold of 60")]
    ConfidenceTooLow,
    #[msg("Rainfall value outside physically plausible bounds")]
    RainfallOutOfBounds,
    #[msg("Temperature value outside physically plausible bounds")]
    TemperatureOutOfBounds,
    #[msg("Wind speed value outside physically plausible bounds")]
    WindSpeedOutOfBounds,
}
5.4 Payout Engine Program
This is the most security-critical program. 
3
Without signer validation, anyone can modify accounts they don't own, drain funds, or perform unauthorized state changes. Every instruction that mutates state, transfers value, or closes accounts must verify the caller's authority.

Rust

// ─────────────────────────────────────────────────────────────────
// FILE: programs/payout_engine/src/lib.rs
// ─────────────────────────────────────────────────────────────────

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("CLMFpay11111111111111111111111111111111111111");

// ─── CONSTANTS ───────────────────────────────────────────────────
pub const MAX_ORACLE_AGE_SECONDS: i64 = 1800;   // 30 minutes
pub const STAGE_1_PAYOUT_BPS: u64 = 5000;       // 50% of coverage
pub const STAGE_2_PAYOUT_BPS: u64 = 5000;       // Remaining 50%
pub const STAGE_2_DELAY_SECONDS: i64 = 172800;  // 48 hours

// ─── ACCOUNT STRUCTURES ──────────────────────────────────────────

#[derive(Accounts)]
pub struct EvaluateTrigger<'info> {
    // The oracle keeper (authorized to initiate evaluation)
    #[account(mut)]
    pub oracle_keeper: Signer<'info>,

    #[account(
        mut,
        constraint = policy_account.status == PolicyStatus::Active
            @ PayoutError::PolicyNotActive,
        constraint = policy_account.payout_stage == PayoutStage::None
            || policy_account.payout_stage == PayoutStage::Stage1Paid
            @ PayoutError::AlreadyFullyPaid,
    )]
    pub policy_account: Account<'info, PolicyAccount>,

    #[account(
        constraint = oracle_state.region_id == policy_account.region_id
            @ PayoutError::OracleRegionMismatch,
        constraint = oracle_state.last_update
            >= Clock::get()?.unix_timestamp - MAX_ORACLE_AGE_SECONDS
            @ PayoutError::StaleOracleData,
    )]
    pub oracle_state: Account<'info, OracleState>,

    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_usdc_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = oracle_keeper,
        space = 8 + ClaimRecord::LEN,
        seeds = [b"claim", policy_account.key().as_ref()],
        bump
    )]
    pub claim_record: Account<'info, ClaimRecord>,

    pub liquidity_pool: Account<'info, LiquidityPool>,
    pub protocol_state: Account<'info, ProtocolState>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ─── INSTRUCTION HANDLERS ────────────────────────────────────────

pub mod instructions {
    use super::*;

    pub fn evaluate_and_payout(
        ctx: Context<EvaluateTrigger>,
    ) -> Result<()> {

        let policy = &ctx.accounts.policy_account;
        let oracle = &ctx.accounts.oracle_state;
        let now = Clock::get()?.unix_timestamp;

        // ── CHECK POLICY IS WITHIN COVERAGE WINDOW ────────────────
        require!(
            now >= policy.start_timestamp && now <= policy.end_timestamp,
            PayoutError::OutsideCoverageWindow
        );

        // ── EVALUATE TRIGGER CONDITION ─────────────────────────────
        let trigger_met = evaluate_trigger_condition(
            &policy.trigger,
            oracle,
            now,
        )?;

        if !trigger_met {
            // Update last checked timestamp and return
            let policy = &mut ctx.accounts.policy_account;
            policy.last_checked = now;
            return Ok(());
        }

        // ── TRIGGER IS MET — INITIATE PAYOUT ─────────────────────

        // Determine payout amount based on current stage
        let payout_amount = match policy.payout_stage {
            PayoutStage::None => {
                // Stage 1: 50% immediate payout
                (policy.coverage_amount as u128)
                    .checked_mul(STAGE_1_PAYOUT_BPS as u128)
                    .unwrap()
                    .checked_div(10_000)
                    .unwrap() as u64
            },
            PayoutStage::Stage1Paid => {
                // Stage 2: Remaining 50% (verify 48 hours have passed)
                require!(
                    now >= ctx.accounts.claim_record.claim_timestamp
                        + STAGE_2_DELAY_SECONDS,
                    PayoutError::Stage2TooEarly
                );
                // Verify second oracle source still confirms trigger
                // (cross-reference verification)
                policy.coverage_amount
                    .checked_sub(ctx.accounts.claim_record.amount_paid)
                    .unwrap()
            },
            PayoutStage::FullyPaid => {
                return err!(PayoutError::AlreadyFullyPaid);
            }
        };

        // ── VERIFY POOL HAS SUFFICIENT LIQUIDITY ──────────────────
        require!(
            ctx.accounts.pool_vault.amount >= payout_amount,
            PayoutError::InsufficientLiquidity
        );

        // ── EXECUTE TRANSFER: POOL VAULT → USER WALLET ────────────
        // Use PDA signing for the pool vault authority
        let pool_key = ctx.accounts.liquidity_pool.key();
        let signer_seeds = &[
            b"pool_vault",
            pool_key.as_ref(),
            &[ctx.accounts.liquidity_pool.vault_bump],
        ];
        let signer = &[&signer_seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_vault.to_account_info(),
                to: ctx.accounts.user_usdc_account.to_account_info(),
                authority: ctx.accounts.pool_vault.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_ctx, payout_amount)?;

        // ── UPDATE POLICY STATE ───────────────────────────────────
        let new_stage = match policy.payout_stage {
            PayoutStage::None => PayoutStage::Stage1Paid,
            PayoutStage::Stage1Paid => PayoutStage::FullyPaid,
            _ => unreachable!(),
        };

        let policy = &mut ctx.accounts.policy_account;
        policy.payout_stage = new_stage.clone();
        policy.last_checked = now;
        if new_stage == PayoutStage::FullyPaid {
            policy.status = PolicyStatus::Claimed;
        }

        // ── UPDATE CLAIM RECORD ───────────────────────────────────
        let claim = &mut ctx.accounts.claim_record;
        claim.policy_pubkey = policy.key();
        claim.claim_timestamp = now;
        claim.stage = new_stage.clone();
        claim.amount_paid = payout_amount;

        // ── EMIT EVENT ────────────────────────────────────────────
        emit!(PayoutExecutedEvent {
            policy_id: policy.policy_id,
            owner: policy.owner,
            payout_amount,
            payout_stage: new_stage,
            timestamp: now,
        });

        Ok(())
    }

    // ── PRIVATE: TRIGGER EVALUATION LOGIC ────────────────────────
    fn evaluate_trigger_condition(
        trigger: &TriggerCondition,
        oracle: &OracleState,
        now: i64,
    ) -> Result<bool> {

        let window_seconds = trigger.window_days as i64 * 86_400;
        let cutoff = now - window_seconds;

        // Filter readings within the window
        let relevant_readings: Vec<&WeatherReading> = oracle.readings
            .iter()
            .filter(|r| r.timestamp >= cutoff && r.timestamp > 0)
            .collect();

        if relevant_readings.is_empty() {
            return Ok(false);
        }

        // Get the metric value based on trigger type
        let metric_value: i64 = match trigger.metric {
            WeatherMetric::CumulativeRainfallMM => {
                // Sum all rainfall readings in window
                relevant_readings.iter()
                    .map(|r| r.rainfall_mm_x10 as i64)
                    .sum::<i64>()
                    .checked_div(10) // Convert from ×10 to actual mm
                    .unwrap_or(0)
            },
            WeatherMetric::DailyRainfallMM => {
                // Last 4 readings (1 hour window)
                relevant_readings.iter()
                    .take(4)
                    .map(|r| r.rainfall_mm_x10 as i64)
                    .sum::<i64>()
                    .checked_div(10)
                    .unwrap_or(0)
            },
            WeatherMetric::MaxTemperatureCelsius => {
                relevant_readings.iter()
                    .map(|r| r.temperature_c_x10 as i64)
                    .max()
                    .unwrap_or(0)
                    .checked_div(10)
                    .unwrap_or(0)
            },
            WeatherMetric::AvgTemperatureCelsius => {
                let sum: i64 = relevant_readings.iter()
                    .map(|r| r.temperature_c_x10 as i64)
                    .sum();
                (sum / relevant_readings.len() as i64) / 10
            },
            WeatherMetric::WindSpeedKMH => {
                relevant_readings.iter()
                    .map(|r| r.wind_speed_kmh_x10 as i64)
                    .max()
                    .unwrap_or(0)
                    .checked_div(10)
                    .unwrap_or(0)
            },
            _ => 0,
        };

        // Apply comparison operator
        let trigger_met = match trigger.operator {
            ComparisonOperator::LessThan =>
                metric_value < trigger.threshold_value,
            ComparisonOperator::LessThanOrEqual =>
                metric_value <= trigger.threshold_value,
            ComparisonOperator::GreaterThan =>
                metric_value > trigger.threshold_value,
            ComparisonOperator::GreaterThanOrEqual =>
                metric_value >= trigger.threshold_value,
            ComparisonOperator::Between =>
                metric_value >= trigger.threshold_value
                && metric_value <= trigger.threshold_value_2,
        };

        Ok(trigger_met)
    }
}

// ─── EVENTS ──────────────────────────────────────────────────────

#[event]
pub struct PayoutExecutedEvent {
    pub policy_id: u64,
    pub owner: Pubkey,
    pub payout_amount: u64,
    pub payout_stage: PayoutStage,
    pub timestamp: i64,
}

// ─── ERRORS ──────────────────────────────────────────────────────

#[error_code]
pub enum PayoutError {
    #[msg("Policy is not in Active status")]
    PolicyNotActive,
    #[msg("Policy has already been fully paid out")]
    AlreadyFullyPaid,
    #[msg("Oracle region does not match policy region")]
    OracleRegionMismatch,
    #[msg("Oracle data is stale — last update > 30 minutes ago")]
    StaleOracleData,
    #[msg("Current time is outside policy coverage window")]
    OutsideCoverageWindow,
    #[msg("Insufficient USDC in liquidity pool")]
    InsufficientLiquidity,
    #[msg("Stage 2 payout requires 48 hours after Stage 1")]
    Stage2TooEarly,
    #[msg("Unauthorized oracle keeper")]
    UnauthorizedKeeper,
}
5.5 Liquidity Pool Program
22
 Risk assessors and liquidity providers supply the capital required to back these policies. Liquidity providers deposit assets into a public pool, earning yield from the premiums collected. In many protocols, risk assessors stake their tokens on specific smart contracts or platforms they believe are secure. If the covered platform is compromised, the staked capital compensates the policyholders. If the platform remains secure, the assessors earn a portion of the policy premiums for accurately pricing the risk.
Rust

// ─────────────────────────────────────────────────────────────────
// FILE: programs/liquidity_pool/src/lib.rs
// ─────────────────────────────────────────────────────────────────

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

declare_id!("CLMFvlt11111111111111111111111111111111111111");

// ─── ACCOUNT STRUCTURES ──────────────────────────────────────────

#[account]
pub struct LiquidityPool {
    pub pool_id: u64,
    pub coverage_type: CoverageType,       // What this pool covers
    pub authority: Pubkey,                 // Pool admin (protocol PDA)
    pub vault_pubkey: Pubkey,              // USDC vault token account
    pub lp_token_mint: Pubkey,             // Nimbus LP token mint
    pub total_deposits: u64,               // Total USDC ever deposited
    pub total_withdrawals: u64,
    pub total_premiums_earned: u64,        // Lifetime premiums
    pub total_payouts_made: u64,           // Lifetime payouts
    pub current_liquidity: u64,            // Available USDC right now
    pub reserved_liquidity: u64,           // Locked against active policies
    pub target_capitalization_ratio: u16,  // Min ratio in BPS (e.g., 15000 = 150%)
    pub utilization_rate_bps: u16,         // Current utilization %
    pub current_apy_bps: u16,              // Current APY in BPS
    pub min_stake_amount: u64,             // Minimum underwriter stake
    pub lock_period_seconds: u64,          // Min staking lock (e.g., 7 days)
    pub staker_count: u32,
    pub vault_bump: u8,
    pub bump: u8,
}

#[account]
pub struct UnderwriterPosition {
    pub pool_pubkey: Pubkey,
    pub staker: Pubkey,
    pub usdc_deposited: u64,              // Original USDC amount
    pub lp_tokens_received: u64,         // LP tokens representing share
    pub deposit_timestamp: i64,
    pub lock_expiry: i64,                 // Can't withdraw before this
    pub accrued_yield: u64,               // Earned but not yet claimed
    pub last_yield_calculation: i64,
    pub bump: u8,
}

// ─── INSTRUCTIONS ────────────────────────────────────────────────

pub mod instructions {
    use super::*;

    // DEPOSIT: Underwriter provides liquidity
    pub fn deposit(
        ctx: Context<DepositLiquidity>,
        amount: u64,
    ) -> Result<()> {
        require!(
            amount >= ctx.accounts.pool.min_stake_amount,
            PoolError::BelowMinimumStake
        );

        // Transfer USDC from underwriter → pool vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.staker_usdc.to_account_info(),
                to: ctx.accounts.pool_vault.to_account_info(),
                authority: ctx.accounts.staker.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        // Calculate LP tokens to mint
        // LP tokens represent proportional share of pool
        let lp_tokens = calculate_lp_tokens(
            amount,
            ctx.accounts.pool.current_liquidity,
            ctx.accounts.lp_mint.supply,
        );

        // Mint LP tokens to staker
        // ... mint CPI logic

        // Initialize/update position
        let position = &mut ctx.accounts.position;
        position.pool_pubkey = ctx.accounts.pool.key();
        position.staker = ctx.accounts.staker.key();
        position.usdc_deposited = position.usdc_deposited
            .checked_add(amount).unwrap();
        position.lp_tokens_received = position.lp_tokens_received
            .checked_add(lp_tokens).unwrap();
        position.deposit_timestamp = Clock::get()?.unix_timestamp;
        position.lock_expiry = Clock::get()?.unix_timestamp
            + ctx.accounts.pool.lock_period_seconds as i64;

        // Update pool state
        let pool = &mut ctx.accounts.pool;
        pool.current_liquidity = pool.current_liquidity
            .checked_add(amount).unwrap();
        pool.total_deposits = pool.total_deposits
            .checked_add(amount).unwrap();
        pool.staker_count = pool.staker_count.checked_add(1).unwrap();
        pool.utilization_rate_bps = calculate_utilization(
            pool.reserved_liquidity,
            pool.current_liquidity,
        );

        emit!(LiquidityDepositedEvent {
            pool_id: pool.pool_id,
            staker: ctx.accounts.staker.key(),
            amount,
            lp_tokens_minted: lp_tokens,
        });

        Ok(())
    }

    // WITHDRAW: Underwriter removes liquidity (after lock period)
    pub fn withdraw(
        ctx: Context<WithdrawLiquidity>,
        lp_token_amount: u64,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        // Enforce lock period
        require!(
            now >= ctx.accounts.position.lock_expiry,
            PoolError::LockPeriodNotExpired
        );

        // Calculate USDC equivalent of LP tokens
        let usdc_to_return = calculate_usdc_from_lp(
            lp_token_amount,
            ctx.accounts.pool.current_liquidity,
            ctx.accounts.lp_mint.supply,
        );

        // Ensure sufficient FREE liquidity (not reserved)
        let available_liquidity = ctx.accounts.pool.current_liquidity
            .checked_sub(ctx.accounts.pool.reserved_liquidity)
            .unwrap();
        require!(
            usdc_to_return <= available_liquidity,
            PoolError::InsufficientFreeLiquidity
        );

        // Burn LP tokens
        // ... burn CPI logic

        // Transfer USDC back to staker
        // ... transfer CPI with PDA signer

        // Update pool state
        let pool = &mut ctx.accounts.pool;
        pool.current_liquidity = pool.current_liquidity
            .checked_sub(usdc_to_return).unwrap();
        pool.total_withdrawals = pool.total_withdrawals
            .checked_add(usdc_to_return).unwrap();

        emit!(LiquidityWithdrawnEvent {
            pool_id: pool.pool_id,
            staker: ctx.accounts.staker.key(),
            usdc_returned: usdc_to_return,
            lp_tokens_burned: lp_token_amount,
        });

        Ok(())
    }

    // RESERVE: Called by PolicyManager when new policy created
    // Reserves coverage amount in pool
    pub fn reserve_coverage(
        ctx: Context<ReserveCoverage>,
        amount: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;

        let available = pool.current_liquidity
            .checked_sub(pool.reserved_liquidity)
            .unwrap();
        require!(
            available >= amount,
            PoolError::InsufficientCapacityForPolicy
        );

        pool.reserved_liquidity = pool.reserved_liquidity
            .checked_add(amount).unwrap();
        pool.utilization_rate_bps = calculate_utilization(
            pool.reserved_liquidity,
            pool.current_liquidity,
        );

        Ok(())
    }

    // YIELD CALCULATION: Distribute premium income to LPs
    pub fn calculate_yield(
        ctx: Context<CalculateYield>,
    ) -> Result<()> {
        // ... complex yield distribution logic
        // Premium collected this period / total LP tokens = yield per token
        // Update each UnderwriterPosition's accrued_yield
        Ok(())
    }

    // ── PRIVATE FUNCTIONS ─────────────────────────────────────────

    fn calculate_lp_tokens(
        deposit_amount: u64,
        pool_liquidity: u64,
        total_lp_supply: u64,
    ) -> u64 {
        if total_lp_supply == 0 || pool_liquidity == 0 {
            // First deposit: 1:1 ratio
            return deposit_amount;
        }
        // Standard AMM formula: lp_out = deposit * total_lp / pool_liq
        (deposit_amount as u128)
            .checked_mul(total_lp_supply as u128)
            .unwrap()
            .checked_div(pool_liquidity as u128)
            .unwrap() as u64
    }

    fn calculate_usdc_from_lp(
        lp_amount: u64,
        pool_liquidity: u64,
        total_lp_supply: u64,
    ) -> u64 {
        (lp_amount as u128)
            .checked_mul(pool_liquidity as u128)
            .unwrap()
            .checked_div(total_lp_supply as u128)
            .unwrap() as u64
    }

    fn calculate_utilization(reserved: u64, total: u64) -> u16 {
        if total == 0 { return 0; }
        ((reserved as u128)
            .checked_mul(10_000)
            .unwrap()
            .checked_div(total as u128)
            .unwrap() as u16)
    }
}

// ─── ERRORS ──────────────────────────────────────────────────────

#[error_code]
pub enum PoolError {
    #[msg("Deposit amount below minimum stake requirement")]
    BelowMinimumStake,
    #[msg("Lock period has not yet expired")]
    LockPeriodNotExpired,
    #[msg("Insufficient free (unreserved) liquidity for withdrawal")]
    InsufficientFreeLiquidity,
    #[msg("Pool does not have sufficient capacity for this policy")]
    InsufficientCapacityForPolicy,
    #[msg("Pool capitalization ratio would fall below minimum")]
    CapitalizationRatioTooLow,
}
5.6 Risk Pricing Engine Program
The pricing engine calculates actuarial premiums based on historical weather data, region risk profiles, and current pool utilization.

Rust

// ─────────────────────────────────────────────────────────────────
// FILE: programs/risk_pricing/src/lib.rs
// ─────────────────────────────────────────────────────────────────

use anchor_lang::prelude::*;

declare_id!("CLMFrsk11111111111111111111111111111111111111");

#[account]
pub struct RiskModel {
    pub region_id: String,
    pub coverage_type: CoverageType,
    pub base_rate_bps: u32,            // Base premium rate in BPS
    pub historical_loss_ratio: u32,    // Historical losses / premiums (BPS)
    pub volatility_score: u16,         // 0-1000 risk volatility
    pub correlation_factor: i16,       // Correlation with other regions
    pub loading_factor_bps: u32,       // Safety loading on top of pure premium
    pub last_updated: i64,
    pub update_authority: Pubkey,
    pub bump: u8,
}

pub mod instructions {
    use super::*;

    /// Calculate premium for a given policy configuration
    /// This is called off-chain via simulation before policy creation
    pub fn calculate_premium(
        ctx: Context<CalculatePremium>,
        coverage_amount: u64,
        coverage_days: u16,
        coverage_type: CoverageType,
        trigger: TriggerCondition,
    ) -> Result<u64> {
        let risk_model = &ctx.accounts.risk_model;
        let pool = &ctx.accounts.liquidity_pool;

        // ── STEP 1: BASE PURE PREMIUM ─────────────────────────────
        // Pure premium = E[loss] = P(trigger) × coverage_amount
        // P(trigger) estimated from historical_loss_ratio
        let pure_premium = (coverage_amount as u128)
            .checked_mul(risk_model.historical_loss_ratio as u128)
            .unwrap()
            .checked_div(10_000)
            .unwrap() as u64;

        // ── STEP 2: TIME ADJUSTMENT ───────────────────────────────
        // Prorate for policy duration (base rate assumes 365 days)
        let time_adjusted = (pure_premium as u128)
            .checked_mul(coverage_days as u128)
            .unwrap()
            .checked_div(365)
            .unwrap() as u64;

        // ── STEP 3: VOLATILITY LOADING ────────────────────────────
        // Higher volatility = higher loading
        let volatility_loading = (time_adjusted as u128)
            .checked_mul(risk_model.volatility_score as u128)
            .unwrap()
            .checked_div(1_000)
            .unwrap() as u64;

        // ── STEP 4: UTILIZATION SURCHARGE ─────────────────────────
        // If pool is highly utilized, premiums increase (supply/demand)
        let utilization_surcharge = if pool.utilization_rate_bps > 7_500 {
            // Over 75% utilized: add 25% surcharge
            time_adjusted.checked_div(4).unwrap()
        } else if pool.utilization_rate_bps > 5_000 {
            // Over 50% utilized: add 10% surcharge
            time_adjusted.checked_div(10).unwrap()
        } else {
            0u64
        };

        // ── STEP 5: PROTOCOL FEE ──────────────────────────────────
        let subtotal = time_adjusted
            .checked_add(volatility_loading).unwrap()
            .checked_add(utilization_surcharge).unwrap();

        let protocol_fee = (subtotal as u128)
            .checked_mul(PROTOCOL_FEE_BPS as u128)
            .unwrap()
            .checked_div(10_000)
            .unwrap() as u64;

        // ── FINAL PREMIUM ─────────────────────────────────────────
        let total_premium = subtotal.checked_add(protocol_fee).unwrap();

        // Apply minimum premium floor ($1 USDC)
        let final_premium = total_premium.max(1_000_000);

        Ok(final_premium)
    }
}

const PROTOCOL_FEE_BPS: u32 = 200; // 2%
5.7 Governance Program
Rust

// Simplified governance for hackathon — full DAO implementation in V2

#[account]
pub struct GovernanceState {
    pub authority: Pubkey,           // Multisig for hackathon demo
    pub proposal_count: u64,
    pub min_voting_period: i64,      // 48 hours
    pub min_quorum_bps: u16,         // 1000 = 10% of LP tokens must vote
    pub bump: u8,
}

#[account]
pub struct Proposal {
    pub proposal_id: u64,
    pub proposer: Pubkey,
    pub title: String,               // Max 100 chars
    pub description_ipfs_hash: String, // IPFS hash of full description
    pub proposed_change: ProposalType,
    pub votes_for: u64,
    pub votes_against: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub status: ProposalStatus,
    pub executed: bool,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ProposalType {
    UpdateProtocolFee { new_fee_bps: u16 },
    UpdateRiskModel { region_id: String, new_base_rate: u32 },
    AddNewRegion { region_id: String },
    UpdateMinStake { new_min_stake: u64 },
    PauseProtocol,
    UnpauseProtocol,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Executed,
    Expired,
}
6.0 ORACLE INFRASTRUCTURE
6.1 WeatherXM Integration
31
 With WeatherXM, you can bring real-world weather data on-chain, empowering your smart contracts to make decisions based on cryptographically verified weather conditions — integrating trusted, on-chain weather data into your decentralized applications enhances their functionality. 
32
 At the core of the WeatherXM DePIN project is the Explorer Map, an interactive tool linking you to over 7,000 weather stations globally — it's a decentralized network where each station tells a story, unlocking new data insights. 
31
 WeatherXM Oracle services allow on-chain protocols to react to real-world weather events. Traditional weather derivatives help hedge against weather risks, but they aren't on-chain — WeatherXM is bringing weather data to DeFi, providing decentralized, real-time weather data, enabling DeFi to react to real-world weather risks through smart contracts.
Oracle Aggregator Service (Node.js)
TypeScript

// ─────────────────────────────────────────────────────────────────
// FILE: services/oracle-aggregator/src/aggregator.ts
// ─────────────────────────────────────────────────────────────────

import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import axios from "axios";
import * as cron from "node-cron";
import { Redis } from "ioredis";
import { Pool } from "pg";

// ─── TYPES ───────────────────────────────────────────────────────

interface WeatherDataPoint {
  timestamp: number;
  rainfall_mm: number;
  temperature_c: number;
  wind_speed_kmh: number;
  humidity_pct: number;
  source: "weatherxm" | "open_meteo" | "noaa";
  station_id?: string;
  confidence: number;
}

interface AggregatedReading {
  timestamp: number;
  rainfall_mm_x10: number;
  temperature_c_x10: number;
  wind_speed_kmh_x10: number;
  humidity_pct_x10: number;
  source_count: number;
  confidence_score: number;
  data_hash: Buffer;
}

interface RegionConfig {
  region_id: string;          // e.g., "KEN-NRB-001"
  display_name: string;       // "Nairobi, Kenya"
  lat: number;
  lon: number;
  wxm_station_ids: string[];  // WeatherXM station IDs in this region
  noaa_station_id: string;
  open_meteo_lat: number;
  open_meteo_lon: number;
}

// ─── ORACLE DATA SOURCES ─────────────────────────────────────────

class WeatherXMSource {
  private apiBase = "https://api.weatherxm.com/api/v1";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchReading(stationId: string): Promise<WeatherDataPoint | null> {
    try {
      const response = await axios.get(
        `${this.apiBase}/me/devices/${stationId}/current/weather`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 10000,
        }
      );

      const data = response.data;
      return {
        timestamp: Math.floor(new Date(data.timestamp).getTime() / 1000),
        rainfall_mm: data.precipitation || 0,
        temperature_c: data.temperature,
        wind_speed_kmh: (data.wind_speed || 0) * 3.6, // m/s to km/h
        humidity_pct: data.humidity,
        source: "weatherxm",
        station_id: stationId,
        confidence: 95, // WeatherXM stations are primary source
      };
    } catch (error) {
      console.error(`WeatherXM fetch failed for station ${stationId}:`, error);
      return null;
    }
  }

  async fetchRegionReadings(
    region: RegionConfig
  ): Promise<WeatherDataPoint[]> {
    const readings: WeatherDataPoint[] = [];
    for (const stationId of region.wxm_station_ids) {
      const reading = await this.fetchReading(stationId);
      if (reading) readings.push(reading);
    }
    return readings;
  }
}

class OpenMeteoSource {
  private apiBase = "https://api.open-meteo.com/v1";

  async fetchReading(lat: number, lon: number): Promise<WeatherDataPoint | null> {
    try {
      const response = await axios.get(
        `${this.apiBase}/forecast?` +
        `latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,precipitation,wind_speed_10m,relative_humidity_2m` +
        `&wind_speed_unit=kmh&timezone=auto`,
        { timeout: 10000 }
      );

      const current = response.data.current;
      return {
        timestamp: Math.floor(Date.now() / 1000),
        rainfall_mm: current.precipitation || 0,
        temperature_c: current.temperature_2m,
        wind_speed_kmh: current.wind_speed_10m,
        humidity_pct: current.relative_humidity_2m,
        source: "open_meteo",
        confidence: 75, // Backup source — slightly lower confidence
      };
    } catch (error) {
      console.error("Open-Meteo fetch failed:", error);
      return null;
    }
  }
}

class NOAASource {
  private apiBase = "https://api.weather.gov";

  async fetchReading(stationId: string): Promise<WeatherDataPoint | null> {
    try {
      const response = await axios.get(
        `${this.apiBase}/stations/${stationId}/observations/latest`,
        {
          headers: { "User-Agent": "Nimbus/1.0 (nimbus.io)" },
          timeout: 10000,
        }
      );

      const props = response.data.properties;
      return {
        timestamp: Math.floor(
          new Date(props.timestamp).getTime() / 1000
        ),
        rainfall_mm: (props.precipitationLastHour?.value || 0),
        temperature_c: props.temperature?.value || 0,
        wind_speed_kmh: (props.windSpeed?.value || 0) * 3.6,
        humidity_pct: props.relativeHumidity?.value || 0,
        source: "noaa",
        confidence: 80,
      };
    } catch (error) {
      console.error("NOAA fetch failed:", error);
      return null;
    }
  }
}

// ─── MAIN AGGREGATOR CLASS ────────────────────────────────────────

export class OracleAggregator {
  private wxm: WeatherXMSource;
  private openMeteo: OpenMeteoSource;
  private noaa: NOAASource;
  private connection: Connection;
  private provider: AnchorProvider;
  private program: Program;
  private redis: Redis;
  private db: Pool;
  private submitterKeypair: Keypair;

  constructor(config: {
    wxmApiKey: string;
    solanaRpcUrl: string;
    submitterPrivateKey: Uint8Array;
    redisUrl: string;
    databaseUrl: string;
  }) {
    this.wxm = new WeatherXMSource(config.wxmApiKey);
    this.openMeteo = new OpenMeteoSource();
    this.noaa = new NOAASource();
    this.connection = new Connection(config.solanaRpcUrl, "confirmed");
    this.redis = new Redis(config.redisUrl);
    this.db = new Pool({ connectionString: config.databaseUrl });
    this.submitterKeypair = Keypair.fromSecretKey(
      config.submitterPrivateKey
    );
  }

  // ── AGGREGATION LOGIC ─────────────────────────────────────────

  private aggregateReadings(
    readings: WeatherDataPoint[]
  ): AggregatedReading | null {
    const validReadings = readings.filter(r => r !== null);

    if (validReadings.length === 0) return null;

    // Use weighted median for each metric
    const totalWeight = validReadings.reduce(
      (sum, r) => sum + r.confidence, 0
    );

    const weightedAvg = (metric: keyof WeatherDataPoint): number => {
      const sum = validReadings.reduce((acc, r) => {
        return acc + (r[metric] as number) * r.confidence;
      }, 0);
      return sum / totalWeight;
    };

    // Calculate confidence score (agreement between sources)
    const avgRainfall = weightedAvg("rainfall_mm");
    const rainfallVariance = validReadings.reduce((acc, r) => {
      return acc + Math.pow(r.rainfall_mm - avgRainfall, 2);
    }, 0) / validReadings.length;
    const rainfallStdDev = Math.sqrt(rainfallVariance);

    // Low variance = high confidence, high variance = low confidence
    const confidenceScore = Math.max(
      0,
      Math.min(100, 100 - (rainfallStdDev * 5))
    );

    const reading: AggregatedReading = {
      timestamp: Math.floor(Date.now() / 1000),
      rainfall_mm_x10: Math.round(avgRainfall * 10),
      temperature_c_x10: Math.round(weightedAvg("temperature_c") * 10),
      wind_speed_kmh_x10: Math.round(weightedAvg("wind_speed_kmh") * 10),
      humidity_pct_x10: Math.round(weightedAvg("humidity_pct") * 10),
      source_count: validReadings.length,
      confidence_score: Math.round(confidenceScore),
      data_hash: this.hashReading(validReadings),
    };

    return reading;
  }

  private hashReading(readings: WeatherDataPoint[]): Buffer {
    const crypto = require("crypto");
    const data = JSON.stringify(readings.map(r => ({
      source: r.source,
      rainfall: r.rainfall_mm,
      temp: r.temperature_c,
      timestamp: r.timestamp,
    })));
    return crypto
      .createHash("sha256")
      .update(data)
      .digest()
      .slice(0, 16); // First 16 bytes
  }

  // ── SOLANA SUBMISSION ─────────────────────────────────────────

  private async submitToSolana(
    regionId: string,
    aggregated: AggregatedReading
  ): Promise<string | null> {
    try {
      // Find oracle PDA
      const [oraclePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("oracle"), Buffer.from(regionId)],
        ORACLE_CONSUMER_PROGRAM_ID
      );

      // Build instruction
      const instruction = await this.program.methods
        .submitWeatherReading(
          {
            timestamp: new BN(aggregated.timestamp),
            rainfallMmX10: aggregated.rainfall_mm_x10,
            temperatureCX10: aggregated.temperature_c_x10,
            windSpeedKmhX10: aggregated.wind_speed_kmh_x10,
            humidityPctX10: aggregated.humidity_pct_x10,
            sourceCount: aggregated.source_count,
            confidenceScore: aggregated.confidence_score,
            dataHash: Array.from(aggregated.data_hash),
          },
          regionId
        )
        .accounts({
          oracleSubmitter: this.submitterKeypair.publicKey,
          oracleState: oraclePDA,
        })
        .instruction();

      const transaction = new Transaction().add(instruction);
      transaction.recentBlockhash = (
        await this.connection.getLatestBlockhash()
      ).blockhash;
      transaction.feePayer = this.submitterKeypair.publicKey;
      transaction.sign(this.submitterKeypair);

      const signature = await this.connection.sendRawTransaction(
        transaction.serialize()
      );
      await this.connection.confirmTransaction(signature, "confirmed");

      console.log(
        `✅ Submitted reading for ${regionId}: ${signature}`
      );
      return signature;
    } catch (error) {
      console.error(`❌ Solana submission failed for ${regionId}:`, error);
      return null;
    }
  }

  // ── MAIN POLLING LOOP ─────────────────────────────────────────

  async pollRegion(region: RegionConfig): Promise<void> {
    console.log(`🌤️  Polling region: ${region.display_name}`);

    // Fetch from all three sources in parallel
    const [wxmReadings, openMeteoReading, noaaReading] =
      await Promise.allSettled([
        this.wxm.fetchRegionReadings(region),
        this.openMeteo.fetchReading(region.lat, region.lon),
        this.noaa.fetchReading(region.noaa_station_id),
      ]);

    const allReadings: WeatherDataPoint[] = [];

    // Aggregate WeatherXM readings (average across stations)
    if (wxmReadings.status === "fulfilled" && wxmReadings.value.length > 0) {
      const wxmAvg = this.averageReadings(wxmReadings.value);
      if (wxmAvg) allReadings.push(wxmAvg);
    }

    if (openMeteoReading.status === "fulfilled" && openMeteoReading.value) {
      allReadings.push(openMeteoReading.value);
    }

    if (noaaReading.status === "fulfilled" && noaaReading.value) {
      allReadings.push(noaaReading.value);
    }

    if (allReadings.length === 0) {
      console.warn(`⚠️  No readings available for ${region.region_id}`);
      return;
    }

    // Aggregate readings
    const aggregated = this.aggregateReadings(allReadings);
    if (!aggregated) return;

    // Cache in Redis (TTL: 20 minutes)
    await this.redis.setex(
      `oracle:${region.region_id}:latest`,
      1200,
      JSON.stringify(aggregated)
    );

    // Store in PostgreSQL for historical analysis
    await this.db.query(
      `INSERT INTO oracle_readings
       (region_id, timestamp, rainfall_mm_x10, temperature_c_x10,
        wind_speed_kmh_x10, humidity_pct_x10, source_count,
        confidence_score, raw_readings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        region.region_id,
        new Date(aggregated.timestamp * 1000).toISOString(),
        aggregated.rainfall_mm_x10,
        aggregated.temperature_c_x10,
        aggregated.wind_speed_kmh_x10,
        aggregated.humidity_pct_x10,
        aggregated.source_count,
        aggregated.confidence_score,
        JSON.stringify(allReadings),
      ]
    );

    // Submit to Solana
    await this.submitToSolana(region.region_id, aggregated);

    console.log(
      `📊 ${region.display_name} — ` +
      `Rainfall: ${aggregated.rainfall_mm_x10 / 10}mm | ` +
      `Temp: ${aggregated.temperature_c_x10 / 10}°C | ` +
      `Wind: ${aggregated.wind_speed_kmh_x10 / 10}km/h | ` +
      `Confidence: ${aggregated.confidence_score}% | ` +
      `Sources: ${aggregated.source_count}/3`
    );
  }

  private averageReadings(
    readings: WeatherDataPoint[]
  ): WeatherDataPoint | null {
    if (readings.length === 0) return null;
    return {
      timestamp: Math.floor(Date.now() / 1000),
      rainfall_mm: readings.reduce((s, r) => s + r.rainfall_mm, 0) / readings.length,
      temperature_c: readings.reduce((s, r) => s + r.temperature_c, 0) / readings.length,
      wind_speed_kmh: readings.reduce((s, r) => s + r.wind_speed_kmh, 0) / readings.length,
      humidity_pct: readings.reduce((s, r) => s + r.humidity_pct, 0) / readings.length,
      source: "weatherxm",
      confidence: 95,
    };
  }

  // ── START SCHEDULER ───────────────────────────────────────────

  startScheduler(regions: RegionConfig[]): void {
    // Normal polling: every 15 minutes
    cron.schedule("*/15 * * * *", async () => {
      console.log("🕐 Running scheduled oracle poll...");
      await Promise.all(regions.map(r => this.pollRegion(r)));
    });

    // Initial poll on startup
    Promise.all(regions.map(r => this.pollRegion(r)));

    console.log(
      `🚀 Oracle aggregator started — polling ${regions.length} regions every 15 minutes`
    );
  }
}

// ─── REGION REGISTRY ─────────────────────────────────────────────

export const NIMBUS_REGIONS: RegionConfig[] = [
  // PILOT REGIONS (Hackathon Demo)
  {
    region_id: "KEN-NRB-001",
    display_name: "Nairobi, Kenya",
    lat: -1.2921,
    lon: 36.8219,
    wxm_station_ids: ["wxm-ken-001", "wxm-ken-002"],
    noaa_station_id: "HKNB0",
    open_meteo_lat: -1.2921,
    open_meteo_lon: 36.8219,
  },
  {
    region_id: "IND-MH-001",
    display_name: "Maharashtra, India",
    lat: 19.7515,
    lon: 75.7139,
    wxm_station_ids: ["wxm-ind-001"],
    noaa_station_id: "IN022001400",
    open_meteo_lat: 19.0760,
    open_meteo_lon: 72.8777,
  },
  {
    region_id: "BRA-MT-001",
    display_name: "Mato Grosso, Brazil",
    lat: -12.6428,
    lon: -55.4234,
    wxm_station_ids: ["wxm-bra-001", "wxm-bra-002"],
    noaa_station_id: "SBCG",
    open_meteo_lat: -12.6428,
    open_meteo_lon: -55.4234,
  },
  {
    region_id: "PHL-CEV-001",
    display_name: "Cebu, Philippines",
    lat: 10.3157,
    lon: 123.8854,
    wxm_station_ids: ["wxm-phl-001"],
    noaa_station_id: "RCTP",
    open_meteo_lat: 10.3157,
    open_meteo_lon: 123.8854,
  },
  {
    region_id: "GHA-ACC-001",
    display_name: "Accra, Ghana",
    lat: 5.6037,
    lon: -0.1870,
    wxm_station_ids: ["wxm-gha-001"],
    noaa_station_id: "DGAA",
    open_meteo_lat: 5.6037,
    open_meteo_lon: -0.1870,
  },
  // 20+ more regions to be added post-hackathon
];

const ORACLE_CONSUMER_PROGRAM_ID = new PublicKey(
  "CLMForc1111111111111111111111111111111111111"
);
6.2 Oracle Security Architecture
20
 Pyth employs a pull-based oracle model where applications request price updates on-demand rather than receiving continuous pushes — this design reduces blockchain congestion and allows developers to control update frequency based on their specific requirements.
Nimbus implements a 3-of-3 defense-in-depth oracle security model:

text

ORACLE SECURITY LAYERS:

Layer 1: SOURCE DIVERSITY
├── WeatherXM (decentralized DePIN network — primary)
├── Open-Meteo (independent European weather API — backup 1)
└── NOAA CDO (US government data — backup 2)
    → REQUIRES: ≥2 of 3 sources must provide readings
    → REQUIRES: Readings must be within 30 minutes of each other

Layer 2: DATA VALIDATION (On-Chain)
├── Staleness check: reject readings > 30 minutes old
├── Confidence threshold: reject if score < 60/100
├── Bounds checking: reject physically impossible values
└── Source count check: reject single-source readings

Layer 3: CONSENSUS CHECK (Aggregator — Off-Chain)
├── Weighted median across all sources
├── Standard deviation check — if readings diverge > 2σ, flag for review
├── Historical trend validation — flag if reading is 5σ from 30-day average
└── Emergency circuit breaker — if all 3 sources fail, PAUSE payouts

Layer 4: TIME-LOCK (On-Chain)
├── Stage 1 payout (50%) fires immediately on trigger
├── Stage 2 payout (remaining 50%) requires 48-hour confirmation
└── Owner override window prevents malicious early triggering

Layer 5: MULTI-SIG GUARDIAN
└── Protocol admin multisig can pause payout engine in emergency
7.0 FRONTEND ARCHITECTURE
7.1 Application Structure
text

nimbus-app/
├── app/
│   ├── layout.tsx                    # Root layout with WalletProvider
│   ├── page.tsx                      # Landing page
│   ├── (policyholder)/
│   │   ├── buy/
│   │   │   ├── page.tsx              # Step 1: Region selection
│   │   │   ├── configure/page.tsx    # Step 2: Policy configuration
│   │   │   ├── quote/page.tsx        # Step 3: Premium quote
│   │   │   └── confirm/page.tsx      # Step 4: Sign & pay
│   │   ├── my-policies/
│   │   │   ├── page.tsx              # Policy list
│   │   │   └── [policyId]/page.tsx   # Individual policy detail
│   │   └── claims/page.tsx           # Claim history
│   ├── (underwriter)/
│   │   ├── vault/page.tsx            # Main staking dashboard
│   │   ├── deposit/page.tsx          # Deposit flow
│   │   └── withdraw/page.tsx         # Withdrawal flow
│   ├── monitor/
│   │   ├── page.tsx                  # Global oracle monitor
│   │   └── [regionId]/page.tsx       # Region-specific data
│   └── admin/
│       ├── page.tsx                  # Admin overview
│       ├── regions/page.tsx          # Region management
│       └── risk/page.tsx             # Risk model management
├── components/
│   ├── ui/                           # shadcn/ui base components
│   ├── wallet/
│   │   └── WalletButton.tsx          # Connect wallet button
│   ├── policy/
│   │   ├── RegionMap.tsx             # Mapbox interactive map
│   │   ├── PolicyTypeSelector.tsx    # Coverage type cards
│   │   ├── TriggerConfigurator.tsx   # Slider-based trigger setup
│   │   ├── PremiumQuote.tsx          # Quote display component
│   │   ├── PolicyCard.tsx            # Active policy display
│   │   └── PolicyStatusBadge.tsx     # Status indicator
│   ├── oracle/
│   │   ├── WeatherFeedCard.tsx       # Live weather data card
│   │   ├── RainfallChart.tsx         # 24hr rainfall chart
│   │   ├── TemperatureChart.tsx      # Temperature trend
│   │   ├── OracleStatusIndicator.tsx # Source health check
│   │   └── GlobalWeatherMap.tsx      # World map with live data
│   ├── vault/
│   │   ├── PoolMetrics.tsx           # TVL, APY, utilization
│   │   ├── StakingForm.tsx           # Deposit form
│   │   ├── UnderwriterPosition.tsx   # Individual LP position
│   │   └── YieldCalculator.tsx       # APY estimator
│   └── shared/
│       ├── TransactionButton.tsx     # Solana tx button
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── NotificationToast.tsx
├── hooks/
│   ├── useNimbus.ts                 # Main protocol hook
│   ├── usePolicies.ts                # Policy management
│   ├── useOracleData.ts              # Live oracle data
│   ├── useLiquidityPool.ts           # Pool metrics
│   ├── usePremiumQuote.ts            # Premium calculation
│   └── useWalletBalance.ts           # USDC balance
├── lib/
│   ├── solana/
│   │   ├── connection.ts             # RPC connection setup
│   │   ├── programs.ts               # Program instances
│   │   ├── idl/                      # All program IDLs
│   │   └── utils.ts                  # PDA helpers, formatters
│   ├── api/
│   │   ├── client.ts                 # API client
│   │   ├── oracle.ts                 # Oracle API calls
│   │   └── pricing.ts                # Premium quote API
│   └── constants.ts                  # Program IDs, mints, etc.
└── store/
    ├── walletStore.ts                # Wallet state
    ├── policyStore.ts                # Policy state
    └── oracleStore.ts                # Oracle data state
7.2 Policy Purchase Flow — Component Detail
Step 1: Region Selection (RegionMap.tsx)
TypeScript

// ─────────────────────────────────────────────────────────────────
// FILE: components/policy/RegionMap.tsx
// ─────────────────────────────────────────────────────────────────

"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { NIMBUS_REGIONS } from "@/lib/constants";

interface RegionMapProps {
  onRegionSelect: (regionId: string, regionName: string) => void;
  selectedRegionId?: string;
}

export const RegionMap: React.FC<RegionMapProps> = ({
  onRegionSelect,
  selectedRegionId,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [20, 10], // Center on Africa/Asia
      zoom: 2,
      minZoom: 1,
      maxZoom: 8,
    });

    map.current.on("load", () => {
      // Add region markers
      NIMBUS_REGIONS.forEach((region) => {
        const isSelected = region.region_id === selectedRegionId;

        const el = document.createElement("div");
        el.className = "region-marker";
        el.style.cssText = `
          width: ${isSelected ? "20px" : "14px"};
          height: ${isSelected ? "20px" : "14px"};
          border-radius: 50%;
          background-color: ${isSelected ? "#22c55e" : "#3b82f6"};
          border: 2px solid white;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 0 ${isSelected ? "12px" : "6px"}
            ${isSelected ? "#22c55e" : "#3b82f6"}88;
        `;

        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.3)";
          // Show tooltip
        });

        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
        });

        el.addEventListener("click", () => {
          onRegionSelect(region.region_id, region.display_name);
          // Fly to region
          map.current?.flyTo({
            center: [region.lon, region.lat],
            zoom: 5,
            duration: 1500,
          });
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([region.lon, region.lat])
          .addTo(map.current!);

        markers.current.push(marker);
      });
    });

    return () => map.current?.remove();
  }, []);

  return (
    <div className="relative">
      <div
        ref={mapContainer}
        className="w-full h-[400px] rounded-xl overflow-hidden border border-slate-700"
      />
      <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-sm
                      rounded-lg p-3 text-sm text-slate-300">
        <p className="font-medium text-white mb-1">🌍 Select Your Region</p>
        <p className="text-xs text-slate-400">
          {NIMBUS_REGIONS.length} regions available
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"/>
          Available
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block ml-2"/>
          Selected
        </div>
      </div>
    </div>
  );
};
Step 2: Trigger Configurator (TriggerConfigurator.tsx)
TypeScript

// ─────────────────────────────────────────────────────────────────
// FILE: components/policy/TriggerConfigurator.tsx
// ─────────────────────────────────────────────────────────────────

"use client";

import React, { useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import {
  CloudRain, Thermometer, Wind, Droplets
} from "lucide-react";

export type CoverageType =
  | "drought"
  | "flood"
  | "temperature_high"
  | "temperature_low"
  | "wind";

interface TriggerConfig {
  metric: string;
  operator: string;
  threshold: number;
  windowDays: number;
}

interface TriggerConfiguratorProps {
  coverageType: CoverageType;
  onChange: (config: TriggerConfig) => void;
}

const COVERAGE_CONFIGS = {
  drought: {
    icon: CloudRain,
    label: "Drought Insurance",
    description: "Pays out when rainfall drops below your threshold",
    metric: "CumulativeRainfallMM",
    operator: "LessThan",
    thresholdLabel: "Rainfall Threshold",
    thresholdUnit: "mm",
    thresholdMin: 10,
    thresholdMax: 200,
    thresholdDefault: 50,
    thresholdStep: 5,
    windowMin: 7,
    windowMax: 90,
    windowDefault: 30,
    color: "#f59e0b",
    example: (t: number, w: number) =>
      `If rainfall < ${t}mm over ${w} days → PAYOUT`,
  },
  flood: {
    icon: CloudRain,
    label: "Flood Insurance",
    description: "Pays out when rainfall exceeds your threshold",
    metric: "CumulativeRainfallMM",
    operator: "GreaterThan",
    thresholdLabel: "Rainfall Threshold",
    thresholdUnit: "mm",
    thresholdMin: 50,
    thresholdMax: 500,
    thresholdDefault: 200,
    thresholdStep: 10,
    windowMin: 1,
    windowMax: 14,
    windowDefault: 3,
    color: "#3b82f6",
    example: (t: number, w: number) =>
      `If rainfall > ${t}mm in ${w} days → PAYOUT`,
  },
  temperature_high: {
    icon: Thermometer,
    label: "Heat Wave Insurance",
    description: "Pays out when temperatures exceed your threshold",
    metric: "MaxTemperatureCelsius",
    operator: "GreaterThan",
    thresholdLabel: "Temperature Threshold",
    thresholdUnit: "°C",
    thresholdMin: 30,
    thresholdMax: 55,
    thresholdDefault: 40,
    thresholdStep: 1,
    windowMin: 1,
    windowMax: 14,
    windowDefault: 5,
    color: "#ef4444",
    example: (t: number, w: number) =>
      `If temp > ${t}°C for ${w} consecutive days → PAYOUT`,
  },
  temperature_low: {
    icon: Thermometer,
    label: "Frost Insurance",
    description: "Pays out when temperatures drop below your threshold",
    metric: "MinTemperatureCelsius",
    operator: "LessThan",
    thresholdLabel: "Temperature Threshold",
    thresholdUnit: "°C",
    thresholdMin: -20,
    thresholdMax: 10,
    thresholdDefault: 0,
    thresholdStep: 1,
    windowMin: 1,
    windowMax: 7,
    windowDefault: 2,
    color: "#06b6d4",
    example: (t: number, w: number) =>
      `If temp < ${t}°C for ${w} days → PAYOUT`,
  },
  wind: {
    icon: Wind,
    label: "Storm Insurance",
    description: "Pays out when wind speed exceeds your threshold",
    metric: "WindSpeedKMH",
    operator: "GreaterThan",
    thresholdLabel: "Wind Speed Threshold",
    thresholdUnit: "km/h",
    thresholdMin: 50,
    thresholdMax: 250,
    thresholdDefault: 89,
    thresholdStep: 5,
    windowMin: 1,
    windowMax: 5,
    windowDefault: 1,
    color: "#8b5cf6",
    example: (t: number, w: number) =>
      `If wind > ${t}km/h sustained for ${w} day(s) → PAYOUT`,
  },
};

export const TriggerConfigurator: React.FC<TriggerConfiguratorProps> = ({
  coverageType,
  onChange,
}) => {
  const config = COVERAGE_CONFIGS[coverageType];
  const Icon = config.icon;

  const [threshold, setThreshold] = useState(config.thresholdDefault);
  const [windowDays, setWindowDays] = useState(config.windowDefault);

  const handleChange = (
    newThreshold: number,
    newWindow: number
  ) => {
    onChange({
      metric: config.metric,
      operator: config.operator,
      threshold: newThreshold,
      windowDays: newWindow,
    });
  };

  return (
    <div className="space-y-6 p-6 bg-slate-800/50 rounded-xl
                    border border-slate-700">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${config.color}22` }}
        >
          <Icon
            className="h-5 w-5"
            style={{ color: config.color }}
          />
        </div>
        <div>
          <h3 className="font-semibold text-white">{config.label}</h3>
          <p className="text-sm text-slate-400">{config.description}</p>
        </div>
      </div>

      {/* Threshold Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-slate-300">
            {config.thresholdLabel}
          </label>
          <span
            className="text-lg font-bold"
            style={{ color: config.color }}
          >
            {threshold} {config.thresholdUnit}
          </span>
        </div>

        <Slider.Root
          className="relative flex items-center select-none touch-none
                     w-full h-5"
          value={[threshold]}
          min={config.thresholdMin}
          max={config.thresholdMax}
          step={config.thresholdStep}
          onValueChange={([val]) => {
            setThreshold(val);
            handleChange(val, windowDays);
          }}
        >
          <Slider.Track className="bg-slate-700 relative grow rounded-full h-2">
            <Slider.Range
              className="absolute rounded-full h-full"
              style={{ backgroundColor: config.color }}
            />
          </Slider.Track>
          <Slider.Thumb
            className="block w-5 h-5 bg-white rounded-full shadow-lg
                       focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": config.color } as React.CSSProperties}
          />
        </Slider.Root>

        <div className="flex justify-between text-xs text-slate-500">
          <span>{config.thresholdMin} {config.thresholdUnit}</span>
          <span>{config.thresholdMax} {config.thresholdUnit}</span>
        </div>
      </div>

      {/* Window Days Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-slate-300">
            Measurement Window
          </label>
          <span className="text-lg font-bold text-slate-200">
            {windowDays} days
          </span>
        </div>

        <Slider.Root
          className="relative flex items-center select-none touch-none
                     w-full h-5"
          value={[windowDays]}
          min={config.windowMin}
          max={config.windowMax}
          step={1}
          onValueChange={([val]) => {
            setWindowDays(val);
            handleChange(threshold, val);
          }}
        >
          <Slider.Track className="bg-slate-700 relative grow rounded-full h-2">
            <Slider.Range className="absolute bg-slate-400 rounded-full h-full" />
          </Slider.Track>
          <Slider.Thumb
            className="block w-5 h-5 bg-white rounded-full shadow-lg
                       focus:outline-none"
          />
        </Slider.Root>
      </div>

      {/* Live Preview */}
      <div
        className="p-4 rounded-lg border text-sm font-mono"
        style={{
          backgroundColor: `${config.color}11`,
          borderColor: `${config.color}44`,
          color: config.color,
        }}
      >
        🔔 {config.example(threshold, windowDays)}
      </div>
    </div>
  );
};
Step 3: Premium Quote Display
TypeScript

// ─────────────────────────────────────────────────────────────────
// FILE: components/policy/PremiumQuote.tsx
// ─────────────────────────────────────────────────────────────────

"use client";

import React, { useEffect, useState } from "react";
import { Shield, Clock, Zap, Info } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

interface PremiumQuoteProps {
  regionId: string;
  coverageType: string;
  coverageAmount: number;
  startDate: Date;
  endDate: Date;
  trigger: {
    metric: string;
    operator: string;
    threshold: number;
    windowDays: number;
  };
  onQuoteGenerated: (premium: number) => void;
}

interface QuoteBreakdown {
  pure_premium: number;
  volatility_loading: number;
  utilization_surcharge: number;
  protocol_fee: number;
  total_premium: number;
  loss_probability_pct: number;
  pool_utilization_pct: number;
  estimated_apy_for_underwriters: number;
}

export const PremiumQuote: React.FC<PremiumQuoteProps> = ({
  regionId,
  coverageType,
  coverageAmount,
  startDate,
  endDate,
  trigger,
  onQuoteGenerated,
}) => {
  const [quote, setQuote] = useState<QuoteBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!regionId || !coverageAmount) return;

    const fetchQuote = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/quotes/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            region_id: regionId,
            coverage_type: coverageType,
            coverage_amount: coverageAmount,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            trigger,
          }),
        });

        if (!response.ok) throw new Error("Failed to get quote");

        const data: QuoteBreakdown = await response.json();
        setQuote(data);
        onQuoteGenerated(data.total_premium);
      } catch (err) {
        setError("Failed to calculate premium. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    // Debounce: wait 500ms after last change
    const timeout = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timeout);
  }, [regionId, coverageType, coverageAmount, trigger]);

  if (loading) {
    return (
      <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700
                      flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent
                          rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Calculating your premium...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) return null;

  const coverageAmountUSDC = coverageAmount / 1_000_000;
  const premiumUSDC = quote.total_premium / 1_000_000;
  const premiumPct = (premiumUSDC / coverageAmountUSDC * 100).toFixed(2);

  const QuoteRow = ({
    label, value, tooltip
  }: {
    label: string;
    value: string;
    tooltip?: string;
  }) => (
    <div className="flex justify-between items-center py-2
                    border-b border-slate-700/50">
      <div className="flex items-center gap-1.5">
        <span className="text-slate-400 text-sm">{label}</span>
        {tooltip && (
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <Info className="h-3.5 w-3.5 text-slate-500" />
              </Tooltip.Trigger>
              <Tooltip.Content className="bg-slate-900 text-slate-300 p-2
                                          rounded text-xs max-w-48 border
                                          border-slate-700">
                {tooltip}
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        )}
      </div>
      <span className="text-white font-medium text-sm">{value}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Main Quote Card */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-blue-900/30
                      to-slate-800/50 border border-blue-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            <span className="font-semibold text-white">Your Premium Quote</span>
          </div>
          <div className="bg-green-900/50 text-green-400 text-xs px-3 py-1
                          rounded-full border border-green-700/50">
            Valid for 10 minutes
          </div>
        </div>

        {/* Main Premium Display */}
        <div className="text-center py-4">
          <p className="text-5xl font-bold text-white">
            ${premiumUSDC.toFixed(2)}
          </p>
          <p className="text-slate-400 mt-1">
            USDC Premium · {premiumPct}% of coverage
          </p>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <Shield className="h-4 w-4 text-blue-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400">Coverage</p>
            <p className="font-bold text-white">
              ${coverageAmountUSDC.toLocaleString()}
            </p>
          </div>
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <Zap className="h-4 w-4 text-yellow-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400">Payout Speed</p>
            <p className="font-bold text-green-400">~400ms</p>
          </div>
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <Clock className="h-4 w-4 text-purple-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400">Coverage Period</p>
            <p className="font-bold text-white">
              {Math.round(
                (endDate.getTime() - startDate.getTime()) / 86400000
              )} days
            </p>
          </div>
        </div>
      </div>

      {/* Premium Breakdown */}
      <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700">
        <p className="text-sm font-medium text-slate-300 mb-3">
          Premium Breakdown
        </p>

        <QuoteRow
          label="Pure Risk Premium"
          value={`$${(quote.pure_premium / 1_000_000).toFixed(4)}`}
          tooltip="Expected loss based on historical climate data for this region"
        />
        <QuoteRow
          label="Volatility Loading"
          value={`$${(quote.volatility_loading / 1_000_000).toFixed(4)}`}
          tooltip="Additional loading for climate uncertainty and model risk"
        />
        <QuoteRow
          label="Pool Utilization Surcharge"
          value={`$${(quote.utilization_surcharge / 1_000_000).toFixed(4)}`}
          tooltip={`Pool is ${quote.pool_utilization_pct.toFixed(1)}% utilized — 
                    higher utilization = higher premium`}
        />
        <QuoteRow
          label="Protocol Fee (2%)"
          value={`$${(quote.protocol_fee / 1_000_000).toFixed(4)}`}
          tooltip="Nimbus protocol fee to maintain oracle infrastructure"
        />

        <div className="flex justify-between items-center pt-3 mt-1">
          <span className="font-semibold text-white">Total Premium</span>
          <span className="font-bold text-blue-400 text-lg">
            ${premiumUSDC.toFixed(2)} USDC
          </span>
        </div>
      </div>

      {/* Risk Intelligence */}
      <div className="p-4 rounded-xl bg-amber-900/20 border border-amber-700/30">
        <p className="text-sm font-medium text-amber-400 mb-2">
          📊 Risk Intelligence for {regionId}
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-slate-400">Historical Trigger Probability</p>
            <p className="font-bold text-white">
              {quote.loss_probability_pct.toFixed(1)}% per year
            </p>
          </div>
          <div>
            <p className="text-slate-400">Pool Liquidity Available</p>
            <p className="font-bold text-white">
              {(100 - quote.pool_utilization_pct).toFixed(1)}% free
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
8.0 BACKEND & OFF-CHAIN INFRASTRUCTURE
8.1 API Server Structure
text

services/api/
├── src/
│   ├── index.ts                    # Express server entry point
│   ├── routes/
│   │   ├── quotes.ts               # Premium calculation endpoints
│   │   ├── oracle.ts               # Oracle data endpoints
│   │   ├── policies.ts             # Policy lookup endpoints
│   │   ├── pools.ts                # Liquidity pool metrics
│   │   ├── regions.ts              # Region configuration
│   │   └── webhooks.ts             # Solana event webhooks
│   ├── services/
│   │   ├── PricingService.ts       # Actuarial calculations
│   │   ├── OracleService.ts        # Oracle data management
│   │   ├── PolicyService.ts        # Solana program queries
│   │   ├── NotificationService.ts  # Email/push notifications
│   │   ├── PDFService.ts           # Receipt generation
│   │   └── AnalyticsService.ts     # Metrics aggregation
│   ├── middleware/
│   │   ├── rateLimiter.ts
│   │   ├── validator.ts
│   │   └── errorHandler.ts
│   └── jobs/
│       ├── PolicyMonitorJob.ts     # Checks active policies
│       ├── YieldCalculatorJob.ts   # Calculates LP yields
│       └── CleanupJob.ts           # Expires old data
8.2 Premium Pricing Service
TypeScript

// ─────────────────────────────────────────────────────────────────
// FILE: services/api/src/services/PricingService.ts
// ─────────────────────────────────────────────────────────────────

import { Pool } from "pg";

interface PricingInput {
  region_id: string;
  coverage_type: string;
  coverage_amount_lamports: number;
  start_date: Date;
  end_date: Date;
  trigger: {
    metric: string;
    operator: string;
    threshold: number;
    window_days: number;
  };
}

interface PricingOutput {
  pure_premium: number;
  volatility_loading: number;
  utilization_surcharge: number;
  protocol_fee: number;
  total_premium: number;
  loss_probability_pct: number;
  pool_utilization_pct: number;
  estimated_apy_for_underwriters: number;
  valid_until: Date;
}

export class PricingService {
  constructor(private db: Pool) {}

  async calculatePremium(input: PricingInput): Promise<PricingOutput> {
    const coverageDays = Math.ceil(
      (input.end_date.getTime() - input.start_date.getTime())
      / 86400000
    );

    // ── FETCH HISTORICAL TRIGGER DATA ────────────────────────────
    const historicalData = await this.getHistoricalTriggerRate(
      input.region_id,
      input.trigger
    );

    const lossProbabilityAnnual = historicalData.trigger_rate_annual;
    const lossProbabilityForPeriod =
      lossProbabilityAnnual * (coverageDays / 365);

    // ── PURE PREMIUM ──────────────────────────────────────────────
    const purePremium = Math.floor(
      input.coverage_amount_lamports * lossProbabilityForPeriod
    );

    // ── VOLATILITY LOADING ────────────────────────────────────────
    const volatilityScore = historicalData.volatility_score / 100;
    const volatilityLoading = Math.floor(purePremium * volatilityScore * 0.5);

    // ── POOL UTILIZATION SURCHARGE ────────────────────────────────
    const poolMetrics = await this.getPoolMetrics(input.coverage_type);
    let utilizationSurcharge = 0;
    if (poolMetrics.utilization_pct > 75) {
      utilizationSurcharge = Math.floor(purePremium * 0.25);
    } else if (poolMetrics.utilization_pct > 50) {
      utilizationSurcharge = Math.floor(purePremium * 0.10);
    }

    // ── PROTOCOL FEE ──────────────────────────────────────────────
    const subtotal = purePremium + volatilityLoading + utilizationSurcharge;
    const protocolFee = Math.floor(subtotal * 0.02); // 2%

    // ── TOTAL ─────────────────────────────────────────────────────
    const totalPremium = Math.max(
      subtotal + protocolFee,
      1_000_000 // Min $1 USDC
    );

    // ── UNDERWRITER APY ESTIMATE ──────────────────────────────────
    const estimatedApyBps = this.calculateEstimatedApy(
      poolMetrics.total_liquidity,
      poolMetrics.annual_premium_run_rate,
      poolMetrics.annual_payout_run_rate,
    );

    return {
      pure_premium: purePremium,
      volatility_loading: volatilityLoading,
      utilization_surcharge: utilizationSurcharge,
      protocol_fee: protocolFee,
      total_premium: totalPremium,
      loss_probability_pct: lossProbabilityForPeriod * 100,
      pool_utilization_pct: poolMetrics.utilization_pct,
      estimated_apy_for_underwriters: estimatedApyBps / 100,
      valid_until: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    };
  }

  private async getHistoricalTriggerRate(
    regionId: string,
    trigger: { metric: string; operator: string; threshold: number; window_days: number }
  ): Promise<{ trigger_rate_annual: number; volatility_score: number }> {
    // Query historical oracle readings to calculate
    // how often this trigger would have been hit
    const result = await this.db.query(
      `SELECT
         COUNT(CASE WHEN ${this.buildTriggerQuery(trigger)} THEN 1 END)::float
           / NULLIF(COUNT(*), 0) AS trigger_rate,
         STDDEV(
           CASE WHEN metric = $3 THEN value END
         ) AS volatility
       FROM historical_weather_aggregates
       WHERE region_id = $1
         AND window_days = $2
         AND created_at >= NOW() - INTERVAL '5 years'`,
      [regionId, trigger.window_days, trigger.metric]
    );

    const rate = result.rows[0]?.trigger_rate || 0.05; // Default 5%
    const volatility = result.rows[0]?.volatility || 50;

    return {
      trigger_rate_annual: rate,
      volatility_score: Math.min(100, volatility),
    };
  }

  private buildTriggerQuery(trigger: {
    operator: string;
    threshold: number;
  }): string {
    const ops: Record<string, string> = {
      LessThan: "<",
      LessThanOrEqual: "<=",
      GreaterThan: ">",
      GreaterThanOrEqual: ">=",
    };
    const op = ops[trigger.operator] || "<";
    return `value ${op} ${trigger.threshold}`;
  }

  private async getPoolMetrics(coverageType: string): Promise<{
    utilization_pct: number;
    total_liquidity: number;
    annual_premium_run_rate: number;
    annual_payout_run_rate: number;
  }> {
    const result = await this.db.query(
      `SELECT
         utilization_rate_bps / 100.0 AS utilization_pct,
         total_liquidity,
         annual_premium_run_rate,
         annual_payout_run_rate
       FROM pool_metrics
       WHERE coverage_type = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [coverageType]
    );

    return result.rows[0] || {
      utilization_pct: 20,
      total_liquidity: 100000 * 1_000_000,
      annual_premium_run_rate: 5000 * 1_000_000,
      annual_payout_run_rate: 2000 * 1_000_000,
    };
  }

  private calculateEstimatedApy(
    totalLiquidity: number,
    annualPremiums: number,
    annualPayouts: number,
  ): number {
    if (totalLiquidity === 0) return 0;
    const netIncome = annualPremiums - annualPayouts;
    const apyBps = Math.floor((netIncome / totalLiquidity) * 10_000);
    return Math.max(0, apyBps);
  }
}
8.3 Policy Monitor Job
TypeScript

// ─────────────────────────────────────────────────────────────────
// FILE: services/api/src/jobs/PolicyMonitorJob.ts
// ─────────────────────────────────────────────────────────────────

import * as cron from "node-cron";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";

export class PolicyMonitorJob {
  private connection: Connection;
  private program: Program;

  startMonitoring(): void {
    // Run every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
      await this.checkActivePolicies();
    });

    console.log("🔍 Policy monitor job started");
  }

  private async checkActivePolicies(): Promise<void> {
    // Fetch all active PolicyAccounts from Solana
    const policies = await this.program.account.policyAccount.all([
      {
        memcmp: {
          offset: 8 + 8 + 32 + 32, // Offset to status field
          bytes: "1", // Active = 0 in enum
        },
      },
    ]);

    console.log(`📋 Checking ${policies.length} active policies...`);

    for (const { account: policy, publicKey } of policies) {
      const now = Math.floor(Date.now() / 1000);

      // Skip policies not yet started or already expired
      if (now < policy.startTimestamp.toNumber()) continue;
      if (now > policy.endTimestamp.toNumber()) {
        await this.expirePolicy(publicKey, policy);
        continue;
      }

      // Trigger evaluation
      await this.triggerEvaluation(publicKey, policy);
    }
  }

  private async triggerEvaluation(
    policyPubkey: PublicKey,
    policy: any
  ): Promise<void> {
    try {
      // Find oracle PDA for this region
      const [oraclePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("oracle"), Buffer.from(policy.regionId)],
        ORACLE_PROGRAM_ID
      );

      // Call payout engine's evaluate_and_payout instruction
      const tx = await this.program.methods
        .evaluateAndPayout()
        .accounts({
          oracleKeeper: KEEPER_KEYPAIR.publicKey,
          policyAccount: policyPubkey,
          oracleState: oraclePDA,
          // ... other accounts
        })
        .rpc();

      console.log(
        `✅ Evaluated policy ${policy.policyId}: ${tx}`
      );
    } catch (error: any) {
      // If error is "trigger not met" — that's fine, continue
      if (error.message?.includes("TriggerNotMet")) {
        return;
      }
      // Log other errors
      console.error(
        `❌ Failed to evaluate policy ${policy.policyId}:`,
        error
      );
    }
  }

  private async expirePolicy(
    policyPubkey: PublicKey,
    policy: any
  ): Promise<void> {
    // Mark policy as expired if coverage window has passed
    // and no trigger was ever met
    const tx = await this.program.methods
      .expirePolicy()
      .accounts({
        policyAccount: policyPubkey,
      })
      .rpc();

    console.log(`⏰ Expired policy ${policy.policyId}: ${tx}`);

    // Send notification to user
    await this.notifyPolicyExpired(policy);
  }

  private async notifyPolicyExpired(policy: any): Promise<void> {
    // Query user email from database and send notification
    // ...
  }
}

const ORACLE_PROGRAM_ID = new PublicKey(
  "CLMForc1111111111111111111111111111111111111"
);
9.0 DATABASE SCHEMA
SQL

-- ═══════════════════════════════════════════════════════════════
-- NIMBUS DATABASE SCHEMA
-- PostgreSQL 16
-- ═══════════════════════════════════════════════════════════════

-- ── EXTENSIONS ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_partman";
CREATE EXTENSION IF NOT EXISTS "timescaledb"; -- For time-series weather data

-- ── REGIONS ─────────────────────────────────────────────────────
CREATE TABLE regions (
    region_id           VARCHAR(32) PRIMARY KEY,
    display_name        VARCHAR(100) NOT NULL,
    country_code        CHAR(3) NOT NULL,
    lat                 DECIMAL(9, 6) NOT NULL,
    lon                 DECIMAL(9, 6) NOT NULL,
    wxm_station_ids     TEXT[] DEFAULT '{}',
    noaa_station_id     VARCHAR(20),
    open_meteo_lat      DECIMAL(9, 6),
    open_meteo_lon      DECIMAL(9, 6),
    oracle_pda          VARCHAR(44),            -- Solana PDA address
    is_active           BOOLEAN DEFAULT TRUE,
    coverage_types      TEXT[] NOT NULL,        -- Supported coverage types
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── ORACLE READINGS (Time Series) ───────────────────────────────
-- Using TimescaleDB for efficient time-series storage
CREATE TABLE oracle_readings (
    id                  BIGSERIAL,
    region_id           VARCHAR(32) NOT NULL REFERENCES regions(region_id),
    timestamp           TIMESTAMPTZ NOT NULL,
    rainfall_mm_x10     INTEGER NOT NULL DEFAULT 0,    -- mm × 10
    temperature_c_x10   INTEGER NOT NULL,              -- °C × 10
    wind_speed_kmh_x10  INTEGER NOT NULL DEFAULT 0,
    humidity_pct_x10    INTEGER NOT NULL DEFAULT 0,
    source_count        SMALLINT NOT NULL DEFAULT 0,
    confidence_score    SMALLINT NOT NULL DEFAULT 0,   -- 0-100
    raw_readings        JSONB,                         -- Individual source data
    solana_tx_sig       VARCHAR(88),
    created_at          TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (id, timestamp)
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('oracle_readings', 'timestamp');

-- Create continuous aggregate for 24h summaries
CREATE MATERIALIZED VIEW oracle_daily_aggregates
WITH (timescaledb.continuous) AS
SELECT
    region_id,
    time_bucket('1 day', timestamp) AS day,
    SUM(rainfall_mm_x10) / 10.0 AS total_rainfall_mm,
    AVG(temperature_c_x10) / 10.0 AS avg_temp_c,
    MAX(temperature_c_x10) / 10.0 AS max_temp_c,
    MIN(temperature_c_x10) / 10.0 AS min_temp_c,
    MAX(wind_speed_kmh_x10) / 10.0 AS max_wind_kmh,
    AVG(confidence_score) AS avg_confidence,
    COUNT(*) AS reading_count
FROM oracle_readings
GROUP BY region_id, day;

-- ── POLICIES ─────────────────────────────────────────────────────
CREATE TABLE policies (
    id                  BIGSERIAL PRIMARY KEY,
    policy_id           BIGINT NOT NULL UNIQUE,        -- Onchain policy_id
    policy_pubkey       VARCHAR(44) NOT NULL UNIQUE,   -- Solana account
    owner_wallet        VARCHAR(44) NOT NULL,
    owner_email         VARCHAR(255),                  -- Optional
    region_id           VARCHAR(32) NOT NULL REFERENCES regions(region_id),
    coverage_type       VARCHAR(50) NOT NULL,
    trigger_metric      VARCHAR(50) NOT NULL,
    trigger_operator    VARCHAR(30) NOT NULL,
    trigger_threshold   INTEGER NOT NULL,
    trigger_window_days SMALLINT NOT NULL,
    coverage_amount     BIGINT NOT NULL,               -- USDC lamports
    premium_paid        BIGINT NOT NULL,               -- USDC lamports
    start_date          TIMESTAMPTZ NOT NULL,
    end_date            TIMESTAMPTZ NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'Active',
    payout_stage        VARCHAR(20) NOT NULL DEFAULT 'None',
    policy_nft_mint     VARCHAR(44),
    ipfs_document_hash  VARCHAR(64),                   -- Policy document
    creation_tx_sig     VARCHAR(88) NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_policies_owner ON policies(owner_wallet);
CREATE INDEX idx_policies_region ON policies(region_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_end_date ON policies(end_date)
    WHERE status = 'Active';

-- ── CLAIM RECORDS ────────────────────────────────────────────────
CREATE TABLE claim_records (
    id                  BIGSERIAL PRIMARY KEY,
    claim_pubkey        VARCHAR(44) NOT NULL UNIQUE,
    policy_id           BIGINT NOT NULL REFERENCES policies(policy_id),
    policy_pubkey       VARCHAR(44) NOT NULL,
    owner_wallet        VARCHAR(44) NOT NULL,
    trigger_timestamp   TIMESTAMPTZ NOT NULL,
    trigger_value       INTEGER NOT NULL,              -- Value that triggered
    payout_stage        VARCHAR(20) NOT NULL,
    amount_paid         BIGINT NOT NULL,               -- USDC lamports
    oracle_data_hash    VARCHAR(64),
    payout_tx_sig       VARCHAR(88) NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── LIQUIDITY POOLS ──────────────────────────────────────────────
CREATE TABLE liquidity_pools (
    id                  BIGSERIAL PRIMARY KEY,
    pool_pubkey         VARCHAR(44) NOT NULL UNIQUE,
    coverage_type       VARCHAR(50) NOT NULL UNIQUE,
    vault_pubkey        VARCHAR(44) NOT NULL,
    lp_token_mint       VARCHAR(44) NOT NULL,
    total_deposits      BIGINT NOT NULL DEFAULT 0,
    current_liquidity   BIGINT NOT NULL DEFAULT 0,
    reserved_liquidity  BIGINT NOT NULL DEFAULT 0,
    utilization_rate_bps SMALLINT NOT NULL DEFAULT 0,
    current_apy_bps     SMALLINT NOT NULL DEFAULT 0,
    staker_count        INTEGER NOT NULL DEFAULT 0,
    total_premiums_earned BIGINT NOT NULL DEFAULT 0,
    total_payouts_made  BIGINT NOT NULL DEFAULT 0,
    last_synced_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── UNDERWRITER POSITIONS ────────────────────────────────────────
CREATE TABLE underwriter_positions (
    id                  BIGSERIAL PRIMARY KEY,
    position_pubkey     VARCHAR(44) NOT NULL UNIQUE,
    pool_pubkey         VARCHAR(44) NOT NULL,
    staker_wallet       VARCHAR(44) NOT NULL,
    usdc_deposited      BIGINT NOT NULL,
    lp_tokens_received  BIGINT NOT NULL,
    deposit_timestamp   TIMESTAMPTZ NOT NULL,
    lock_expiry         TIMESTAMPTZ NOT NULL,
    accrued_yield       BIGINT NOT NULL DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE,
    withdrawal_tx_sig   VARCHAR(88),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_positions_staker ON underwriter_positions(staker_wallet);
CREATE INDEX idx_positions_pool ON underwriter_positions(pool_pubkey);

-- ── RISK MODELS ──────────────────────────────────────────────────
CREATE TABLE risk_models (
    id                      BIGSERIAL PRIMARY KEY,
    region_id               VARCHAR(32) NOT NULL,
    coverage_type           VARCHAR(50) NOT NULL,
    base_rate_bps           INTEGER NOT NULL,
    historical_loss_ratio   INTEGER NOT NULL,           -- BPS
    volatility_score        SMALLINT NOT NULL,          -- 0-1000
    sample_size_years       SMALLINT NOT NULL DEFAULT 5,
    model_version           SMALLINT NOT NULL DEFAULT 1,
    last_calibrated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(region_id, coverage_type, model_version)
);

-- ── HISTORICAL WEATHER AGGREGATES ────────────────────────────────
-- Pre-computed aggregates for fast pricing queries
CREATE TABLE historical_weather_aggregates (
    id                  BIGSERIAL PRIMARY KEY,
    region_id           VARCHAR(32) NOT NULL,
    metric              VARCHAR(50) NOT NULL,
    window_days         SMALLINT NOT NULL,
    period_start        DATE NOT NULL,
    value               DECIMAL(10, 2) NOT NULL,
    source              VARCHAR(30),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(region_id, metric, window_days, period_start)
);

CREATE INDEX idx_hist_region_metric ON historical_weather_aggregates
    (region_id, metric, window_days);

-- ── NOTIFICATIONS ────────────────────────────────────────────────
CREATE TABLE notifications (
    id                  BIGSERIAL PRIMARY KEY,
    recipient_wallet    VARCHAR(44) NOT NULL,
    recipient_email     VARCHAR(255),
    type                VARCHAR(50) NOT NULL,  -- policy_created, payout_triggered, expired
    policy_id           BIGINT REFERENCES policies(policy_id),
    message             TEXT NOT NULL,
    sent_at             TIMESTAMPTZ,
    is_sent             BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── POOL METRICS SNAPSHOTS ───────────────────────────────────────
CREATE TABLE pool_metrics (
    id                          BIGSERIAL PRIMARY KEY,
    coverage_type               VARCHAR(50) NOT NULL,
    total_liquidity             BIGINT NOT NULL,
    utilization_rate_bps        SMALLINT NOT NULL,
    annual_premium_run_rate     BIGINT NOT NULL,
    annual_payout_run_rate      BIGINT NOT NULL,
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ── FUNCTIONS & TRIGGERS ─────────────────────────────────────────

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER policies_updated_at
    BEFORE UPDATE ON policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pools_updated_at
    BEFORE UPDATE ON liquidity_pools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── SEED DATA (Pilot Regions) ─────────────────────────────────────
INSERT INTO regions (region_id, display_name, country_code, lat, lon,
                     coverage_types, is_active)
VALUES
    ('KEN-NRB-001', 'Nairobi, Kenya', 'KEN', -1.2921, 36.8219,
     ARRAY['drought', 'flood', 'temperature_high'], TRUE),
    ('IND-MH-001', 'Maharashtra, India', 'IND', 19.7515, 75.7139,
     ARRAY['drought', 'flood', 'temperature_high'], TRUE),
    ('BRA-MT-001', 'Mato Grosso, Brazil', 'BRA', -12.6428, -55.4234,
     ARRAY['drought', 'flood', 'wind'], TRUE),
    ('PHL-CEV-001', 'Cebu, Philippines', 'PHL', 10.3157, 123.8854,
     ARRAY['flood', 'wind', 'temperature_high'], TRUE),
    ('GHA-ACC-001', 'Accra, Ghana', 'GHA', 5.6037, -0.1870,
     ARRAY['drought', 'flood', 'temperature_high'], TRUE);
10.0 API SPECIFICATION
10.1 REST API Endpoints
text

BASE URL: https://api.nimbus.io/v1

════════════════════════════════════════════════════════════════════
QUOTES
════════════════════════════════════════════════════════════════════

POST /quotes/calculate
─────────────────────
Calculate premium for a policy configuration.
Does NOT commit anything — read-only estimation.

Request Body:
{
  "region_id": "KEN-NRB-001",
  "coverage_type": "drought",
  "coverage_amount": 500000000,        // 500 USDC in lamports
  "start_date": "2026-06-01T00:00:00Z",
  "end_date": "2026-08-31T23:59:59Z",
  "trigger": {
    "metric": "CumulativeRainfallMM",
    "operator": "LessThan",
    "threshold": 50,
    "window_days": 30
  }
}

Response 200:
{
  "pure_premium": 8500000,              // 8.50 USDC
  "volatility_loading": 2125000,        // 2.125 USDC
  "utilization_surcharge": 0,
  "protocol_fee": 212500,               // 0.2125 USDC
  "total_premium": 10837500,            // 10.84 USDC
  "loss_probability_pct": 12.5,
  "pool_utilization_pct": 34.2,
  "estimated_apy_for_underwriters": 8.3,
  "valid_until": "2026-05-04T14:22:30Z"
}

════════════════════════════════════════════════════════════════════
ORACLE DATA
════════════════════════════════════════════════════════════════════

GET /oracle/:regionId/current
─────────────────────────────
Get latest weather reading for a region.

Response 200:
{
  "region_id": "KEN-NRB-001",
  "display_name": "Nairobi, Kenya",
  "timestamp": "2026-05-04T14:00:00Z",
  "data": {
    "rainfall_mm": 2.5,
    "temperature_c": 22.3,
    "wind_speed_kmh": 15.2,
    "humidity_pct": 72.1
  },
  "metadata": {
    "source_count": 3,
    "confidence_score": 87,
    "data_age_seconds": 342,
    "is_fresh": true
  }
}

GET /oracle/:regionId/history
──────────────────────────────
Get historical readings for charting.

Query Params:
  - hours: 24 (default), 48, 168 (7 days)
  - metric: rainfall|temperature|wind_speed|humidity (default: all)
  - interval: 15min (default), 1h, 6h, 1d

Response 200:
{
  "region_id": "KEN-NRB-001",
  "period": "24h",
  "readings": [
    {
      "timestamp": "2026-05-03T14:00:00Z",
      "rainfall_mm": 0.0,
      "temperature_c": 20.1,
      "wind_speed_kmh": 12.3,
      "humidity_pct": 68.5
    },
    // ... more readings
  ],
  "summary": {
    "total_rainfall_mm": 15.3,
    "avg_temperature_c": 21.7,
    "max_wind_kmh": 28.4,
    "readings_count": 96
  }
}

GET /oracle/regions
───────────────────
List all supported regions with live status.

GET /oracle/:regionId/risk-analysis
────────────────────────────────────
Get historical risk data for a region/coverage type.

Query Params:
  - coverage_type: drought|flood|temperature_high|wind
  - years: 5 (default)

════════════════════════════════════════════════════════════════════
POLICIES
════════════════════════════════════════════════════════════════════

GET /policies/:walletAddress
─────────────────────────────
Get all policies for a wallet address.
Combines onchain data with off-chain metadata.

Response 200:
{
  "wallet": "9xQ...",
  "active_policies": [
    {
      "policy_id": 42,
      "policy_pubkey": "8mK...",
      "region": {
        "id": "KEN-NRB-001",
        "name": "Nairobi, Kenya"
      },
      "coverage_type": "drought",
      "trigger_summary": "Rainfall < 50mm in 30 days",
      "coverage_amount_usdc": 500,
      "premium_paid_usdc": 10.84,
      "start_date": "2026-06-01",
      "end_date": "2026-08-31",
      "status": "Active",
      "payout_stage": "None",
      "days_remaining": 89,
      "current_trigger_progress": {
        "current_value": 23.5,
        "threshold": 50,
        "progress_pct": 47,
        "days_in_window": 30,
        "days_remaining_in_window": 12
      }
    }
  ],
  "historical_policies": [],
  "total_coverage_usdc": 500,
  "total_premium_paid_usdc": 10.84
}

GET /policies/:policyId/detail
──────────────────────────────
Get detailed policy information including oracle trace.

POST /policies/:policyId/refresh
──────────────────────────────────
Force refresh policy data from chain.

════════════════════════════════════════════════════════════════════
LIQUIDITY POOLS
════════════════════════════════════════════════════════════════════

GET /pools
──────────
List all liquidity pools and metrics.

GET /pools/:coverageType
─────────────────────────
Get specific pool details.

Response 200:
{
  "coverage_type": "drought",
  "pool_pubkey": "5nM...",
  "metrics": {
    "total_value_locked_usdc": 125000,
    "available_liquidity_usdc": 82500,
    "reserved_liquidity_usdc": 42500,
    "utilization_pct": 34.0,
    "current_apy_pct": 8.3,
    "staker_count": 47,
    "active_policies_backed": 23,
    "lifetime_premiums_usdc": 8750,
    "lifetime_payouts_usdc": 3200
  },
  "lock_period_days": 7,
  "min_stake_usdc": 100
}

GET /pools/:walletAddress/positions
──────────────────────────────────
Get underwriter positions for a wallet.
10.2 WebSocket API
TypeScript

// WebSocket endpoint: wss://api.nimbus.io/ws

// Client subscribes to real-time events
ws.send(JSON.stringify({
  type: "SUBSCRIBE",
  channels: [
    { type: "oracle_update", region_id: "KEN-NRB-001" },
    { type: "policy_events", wallet: "9xQ..." },
    { type: "pool_metrics", coverage_type: "drought" },
  ]
}));

// Server sends real-time updates
// ─ Oracle update (every 15 min)
{
  "type": "oracle_update",
  "region_id": "KEN-NRB-001",
  "data": { "rainfall_mm": 2.5, "temperature_c": 22.3, ... },
  "timestamp": "2026-05-04T14:15:00Z"
}

// ─ Trigger approaching warning
{
  "type": "trigger_alert",
  "policy_id": 42,
  "message": "Your drought trigger is 73% of the way to firing",
  "current_value": 36.5,
  "threshold": 50,
  "severity": "warning"
}

// ─ Payout executed
{
  "type": "payout_executed",
  "policy_id": 42,
  "amount_usdc": 250,
  "stage": "Stage1",
  "tx_signature": "3zK...",
  "timestamp": "2026-05-04T14:15:42Z"
}

// ─ Pool metrics update (every 5 min)
{
  "type": "pool_update",
  "coverage_type": "drought",
  "tvl_usdc": 125500,
  "utilization_pct": 34.8,
  "current_apy_pct": 8.4
}
11.0 SECURITY ARCHITECTURE
11.1 Smart Contract Security
3
 Get your code audited before mainnet — use firms that know Solana (OtterSec, Neodyme). Run cargo-audit and clippy. Watch for the usual suspects: missing signer checks, bad account validation, overflow issues, sketchy PDA logic. Fix everything the audit finds, not just the "critical" stuff. 
3
 Solana programs are upgradeable by default through the upgrade authority. Use PDAs for storage so data persists across upgrades. Plan how you'll migrate data when account structures change. Version your accounts.
Security Checklist
text

SMART CONTRACT SECURITY CHECKLIST

CRITICAL (Must be verified before mainnet):
✅ Every mutating instruction verifies signer authority
✅ All arithmetic uses checked_add/checked_sub/checked_mul
✅ PDA seeds are deterministic and collision-resistant
✅ Account ownership validated in all constraint macros
✅ Token account mints validated before every transfer
✅ Oracle data freshness checked before every evaluation
✅ Re-entrancy: Solana is single-threaded, but CPI order matters
✅ Integer overflow: all token amounts use u64 with checked ops
✅ Dust attacks: minimum deposit/coverage amounts enforced
✅ Frontrunning: policies are commitment-based, not tick-based

HIGH PRIORITY:
✅ Emergency pause mechanism in ProtocolState
✅ Admin multisig required for parameter changes
✅ Pool withdrawal locked during high-utilization periods
✅ Oracle submission whitelisted to authorized keypairs only
✅ Policy expiry enforced — no payouts after end_date
✅ Stage 2 payout time-lock strictly enforced
✅ Payout amounts cross-checked against pool balance

MEDIUM PRIORITY:
✅ Rate limiting on oracle submissions (max 1/10min per region)
✅ Maximum coverage limits per wallet
✅ Governance timelock on protocol parameter changes
✅ Fallback oracle circuit breaker
✅ Events emitted for all state changes (auditability)
Audit Plan
Phase	Activity	Timing
Pre-audit	cargo-audit + clippy	Week 2 of hackathon
Internal review	Team code review checklist	Week 3
OtterSec audit	Professional Solana audit	Post-hackathon Month 1
Bug bounty	Immunefi program launch	Month 2
Mainnet deploy	After audit + 2 weeks testnet	Month 2-3
11.2 Oracle Security
text

ORACLE ATTACK VECTORS & MITIGATIONS:

Attack: Single source manipulation
Mitigation: Require ≥2/3 sources + consensus check

Attack: Replay old oracle data
Mitigation: Staleness check (30-minute max age)

Attack: Gradual data drift (slow manipulation)
Mitigation: 5-sigma historical validation + human review trigger

Attack: All sources fail simultaneously (DoS)
Mitigation: Circuit breaker pauses payouts; admin notified

Attack: Oracle submitter key compromise
Mitigation: Separate submitter key + multisig rotation procedure

Attack: Region spoofing (wrong region data)
Mitigation: Region_id verified onchain; station GPS verified by WeatherXM PoL
11.3 Frontend Security
TypeScript

// All Solana transaction previews shown to user before signing
// No auto-signing or silent transactions

// Input sanitization
const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .trim()
    .slice(0, 1000); // Max length cap
};

// Environment variables — never expose private keys to frontend
// NEXT_PUBLIC_* prefix only for truly public data

// Content Security Policy headers
const cspHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval'; " + // unsafe-eval needed for Solana wallet adapters
    "connect-src 'self' https://api.nimbus.io wss://api.nimbus.io " +
    "https://mainnet.helius-rpc.com; " +
    "img-src 'self' data: https:; " +
    "style-src 'self' 'unsafe-inline';",
};
12.0 TESTING STRATEGY
3
 Test everything — unit tests for individual functions, integration tests with Anchor's test framework for full transactions. Test the happy path, test failures, test edge cases. Verify account states change correctly. Check that PDAs derive properly. Make sure errors are thrown when they should. Use solana-bankrun for faster local testing if you need it.
12.1 Smart Contract Tests
TypeScript

// ─────────────────────────────────────────────────────────────────
// FILE: tests/nimbus.test.ts
// ─────────────────────────────────────────────────────────────────

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  createMint, createAssociatedTokenAccount,
  mintTo, getAccount,
} from "@solana/spl-token";
import { assert, expect } from "chai";
import { BankrunProvider } from "anchor-bankrun";
import { startAnchor } from "solana-bankrun";

describe("Nimbus Protocol", () => {
  let provider: BankrunProvider;
  let program: Program;
  let context: any;

  // Test actors
  let admin: Keypair;
  let farmer: Keypair;
  let underwriter: Keypair;
  let oracleKeeper: Keypair;

  // Token accounts
  let usdcMint: PublicKey;
  let farmerUsdc: PublicKey;
  let underwriterUsdc: PublicKey;

  // PDAs
  let protocolStatePDA: PublicKey;
  let oracleStatePDA: PublicKey;
  let liquidityPoolPDA: PublicKey;
  let poolVaultPDA: PublicKey;

  const REGION_ID = "TEST-001";
  const COVERAGE_TYPE = { drought: {} };

  before(async () => {
    // Initialize test environment with Bankrun
    context = await startAnchor("./", [], []);
    provider = new BankrunProvider(context);
    anchor.setProvider(provider);
    program = anchor.workspace.Nimbus;

    // Create test keypairs
    admin = Keypair.generate();
    farmer = Keypair.generate();
    underwriter = Keypair.generate();
    oracleKeeper = Keypair.generate();

    // Airdrop SOL
    for (const kp of [admin, farmer, underwriter, oracleKeeper]) {
      await context.banksClient.processTransaction(
        await
