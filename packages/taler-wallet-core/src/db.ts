import {
  openDatabase,
  Database,
  Store,
  Index,
  AnyStoreMap,
} from "./util/query";
import {
  IDBFactory,
  IDBDatabase,
  IDBObjectStore,
  IDBTransaction,
  IDBKeyPath,
} from "@gnu-taler/idb-bridge";
import { Logger } from "./util/logging";
import {
  AmountJson,
  AmountString,
  Auditor,
  CoinDepositPermission,
  ContractTerms,
  Duration,
  ExchangeSignKeyJson,
  InternationalizedString,
  MerchantInfo,
  Product,
  RefreshReason,
  TalerErrorDetails,
  Timestamp,
} from "@gnu-taler/taler-util";
import { RetryInfo } from "./util/retries.js";
import { PayCoinSelection } from "./util/coinSelection.js";

/**
 * Name of the Taler database.  This is effectively the major
 * version of the DB schema. Whenever it changes, custom import logic
 * for all previous versions must be written, which should be
 * avoided.
 */
const TALER_DB_NAME = "taler-wallet-main-v2";

const TALER_META_DB_NAME = "taler-wallet-meta";

const CURRENT_DB_CONFIG_KEY = "currentMainDbName";

/**
 * Current database minor version, should be incremented
 * each time we do minor schema changes on the database.
 * A change is considered minor when fields are added in a
 * backwards-compatible way or object stores and indices
 * are added.
 */
export const WALLET_DB_MINOR_VERSION = 1;

const logger = new Logger("db.ts");

function upgradeFromStoreMap(
  storeMap: AnyStoreMap,
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number,
  upgradeTransaction: IDBTransaction,
): void {
  if (oldVersion === 0) {
    for (const n in storeMap) {
      if ((storeMap as any)[n] instanceof Store) {
        const si: Store<string, any> = (storeMap as any)[n];
        const s = db.createObjectStore(si.name, si.storeParams);
        for (const indexName in si as any) {
          if ((si as any)[indexName] instanceof Index) {
            const ii: Index<string, string, any, any> = (si as any)[indexName];
            s.createIndex(ii.indexName, ii.keyPath, ii.options);
          }
        }
      }
    }
    return;
  }
  if (oldVersion === newVersion) {
    return;
  }
  logger.info(`upgrading database from ${oldVersion} to ${newVersion}`);
  for (const n in Stores) {
    if ((Stores as any)[n] instanceof Store) {
      const si: Store<string, any> = (Stores as any)[n];
      let s: IDBObjectStore;
      const storeVersionAdded = si.storeParams?.versionAdded ?? 1;
      if (storeVersionAdded > oldVersion) {
        s = db.createObjectStore(si.name, si.storeParams);
      } else {
        s = upgradeTransaction.objectStore(si.name);
      }
      for (const indexName in si as any) {
        if ((si as any)[indexName] instanceof Index) {
          const ii: Index<string, string, any, any> = (si as any)[indexName];
          const indexVersionAdded = ii.options?.versionAdded ?? 0;
          if (
            indexVersionAdded > oldVersion ||
            storeVersionAdded > oldVersion
          ) {
            s.createIndex(ii.indexName, ii.keyPath, ii.options);
          }
        }
      }
    }
  }
}

function onTalerDbUpgradeNeeded(
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number,
  upgradeTransaction: IDBTransaction,
) {
  upgradeFromStoreMap(Stores, db, oldVersion, newVersion, upgradeTransaction);
}

function onMetaDbUpgradeNeeded(
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number,
  upgradeTransaction: IDBTransaction,
) {
  upgradeFromStoreMap(
    MetaStores,
    db,
    oldVersion,
    newVersion,
    upgradeTransaction,
  );
}

/**
 * Return a promise that resolves
 * to the taler wallet db.
 */
export async function openTalerDatabase(
  idbFactory: IDBFactory,
  onVersionChange: () => void,
): Promise<Database<typeof Stores>> {
  const metaDbHandle = await openDatabase(
    idbFactory,
    TALER_META_DB_NAME,
    1,
    () => {},
    onMetaDbUpgradeNeeded,
  );

  const metaDb = new Database(metaDbHandle, MetaStores);
  let currentMainVersion: string | undefined;
  await metaDb.runWithWriteTransaction([MetaStores.metaConfig], async (tx) => {
    const dbVersionRecord = await tx.get(
      MetaStores.metaConfig,
      CURRENT_DB_CONFIG_KEY,
    );
    if (!dbVersionRecord) {
      currentMainVersion = TALER_DB_NAME;
      await tx.put(MetaStores.metaConfig, {
        key: CURRENT_DB_CONFIG_KEY,
        value: TALER_DB_NAME,
      });
    } else {
      currentMainVersion = dbVersionRecord.value;
    }
  });

  if (currentMainVersion !== TALER_DB_NAME) {
    // In the future, the migration logic will be implemented here.
    throw Error(`migration from database ${currentMainVersion} not supported`);
  }

  const mainDbHandle = await openDatabase(
    idbFactory,
    TALER_DB_NAME,
    WALLET_DB_MINOR_VERSION,
    onVersionChange,
    onTalerDbUpgradeNeeded,
  );

  return new Database(mainDbHandle, Stores);
}

export function deleteTalerDatabase(idbFactory: IDBFactory): void {
  Database.deleteDatabase(idbFactory, TALER_DB_NAME);
}

export enum ReserveRecordStatus {
  /**
   * Reserve must be registered with the bank.
   */
  REGISTERING_BANK = "registering-bank",

  /**
   * We've registered reserve's information with the bank
   * and are now waiting for the user to confirm the withdraw
   * with the bank (typically 2nd factor auth).
   */
  WAIT_CONFIRM_BANK = "wait-confirm-bank",

  /**
   * Querying reserve status with the exchange.
   */
  QUERYING_STATUS = "querying-status",

  /**
   * The corresponding withdraw record has been created.
   * No further processing is done, unless explicitly requested
   * by the user.
   */
  DORMANT = "dormant",

  /**
   * The bank aborted the withdrawal.
   */
  BANK_ABORTED = "bank-aborted",
}

export interface ReserveBankInfo {
  /**
   * Status URL that the wallet will use to query the status
   * of the Taler withdrawal operation on the bank's side.
   */
  statusUrl: string;

  confirmUrl?: string;

  /**
   * Exchange payto URI that the bank will use to fund the reserve.
   */
  exchangePaytoUri: string;
}

/**
 * A reserve record as stored in the wallet's database.
 */
export interface ReserveRecord {
  /**
   * The reserve public key.
   */
  reservePub: string;

  /**
   * The reserve private key.
   */
  reservePriv: string;

  /**
   * The exchange base URL.
   */
  exchangeBaseUrl: string;

  /**
   * Currency of the reserve.
   */
  currency: string;

  /**
   * Time when the reserve was created.
   */
  timestampCreated: Timestamp;

  /**
   * Time when the information about this reserve was posted to the bank.
   *
   * Only applies if bankWithdrawStatusUrl is defined.
   *
   * Set to 0 if that hasn't happened yet.
   */
  timestampReserveInfoPosted: Timestamp | undefined;

  /**
   * Time when the reserve was confirmed by the bank.
   *
   * Set to undefined if not confirmed yet.
   */
  timestampBankConfirmed: Timestamp | undefined;

  /**
   * Wire information (as payto URI) for the bank account that
   * transferred funds for this reserve.
   */
  senderWire?: string;

  /**
   * Amount that was sent by the user to fund the reserve.
   */
  instructedAmount: AmountJson;

  /**
   * Extra state for when this is a withdrawal involving
   * a Taler-integrated bank.
   */
  bankInfo?: ReserveBankInfo;

  initialWithdrawalGroupId: string;

  /**
   * Did we start the first withdrawal for this reserve?
   *
   * We only report a pending withdrawal for the reserve before
   * the first withdrawal has started.
   */
  initialWithdrawalStarted: boolean;

  /**
   * Initial denomination selection, stored here so that
   * we can show this information in the transactions/balances
   * before we have a withdrawal group.
   */
  initialDenomSel: DenomSelectionState;

  reserveStatus: ReserveRecordStatus;

  /**
   * Was a reserve query requested?  If so, query again instead
   * of going into dormant status.
   */
  requestedQuery: boolean;

  /**
   * Time of the last successful status query.
   */
  lastSuccessfulStatusQuery: Timestamp | undefined;

  /**
   * Retry info.  This field is present even if no retry is scheduled,
   * because we need it to be present for the index on the object store
   * to work.
   */
  retryInfo: RetryInfo;

  /**
   * Last error that happened in a reserve operation
   * (either talking to the bank or the exchange).
   */
  lastError: TalerErrorDetails | undefined;
}

/**
 * Auditor record as stored with currencies in the exchange database.
 */
export interface AuditorRecord {
  /**
   * Base url of the auditor.
   */
  baseUrl: string;

  /**
   * Public signing key of the auditor.
   */
  auditorPub: string;

  /**
   * Time when the auditing expires.
   */
  expirationStamp: number;
}

export interface AuditorTrustRecord {
  /**
   * Currency that we trust this auditor for.
   */
  currency: string;

  /**
   * Base URL of the auditor.
   */
  auditorBaseUrl: string;

  /**
   * Public key of the auditor.
   */
  auditorPub: string;

  /**
   * UIDs for the operation of adding this auditor
   * as a trusted auditor.
   */
  uids: string[];
}

export interface ExchangeTrustRecord {
  /**
   * Currency that we trust this exchange for.
   */
  currency: string;

  /**
   * Canonicalized exchange base URL.
   */
  exchangeBaseUrl: string;

  /**
   * Master public key of the exchange.
   */
  exchangeMasterPub: string;

  /**
   * UIDs for the operation of adding this exchange
   * as trusted.
   */
  uids: string[];
}

/**
 * Status of a denomination.
 */
export enum DenominationStatus {
  /**
   * Verification was delayed.
   */
  Unverified = "unverified",
  /**
   * Verified as valid.
   */
  VerifiedGood = "verified-good",
  /**
   * Verified as invalid.
   */
  VerifiedBad = "verified-bad",
}

/**
 * Denomination record as stored in the wallet's database.
 */
export interface DenominationRecord {
  /**
   * Value of one coin of the denomination.
   */
  value: AmountJson;

  /**
   * The denomination public key.
   */
  denomPub: string;

  /**
   * Hash of the denomination public key.
   * Stored in the database for faster lookups.
   */
  denomPubHash: string;

  /**
   * Fee for withdrawing.
   */
  feeWithdraw: AmountJson;

  /**
   * Fee for depositing.
   */
  feeDeposit: AmountJson;

  /**
   * Fee for refreshing.
   */
  feeRefresh: AmountJson;

  /**
   * Fee for refunding.
   */
  feeRefund: AmountJson;

  /**
   * Validity start date of the denomination.
   */
  stampStart: Timestamp;

  /**
   * Date after which the currency can't be withdrawn anymore.
   */
  stampExpireWithdraw: Timestamp;

  /**
   * Date after the denomination officially doesn't exist anymore.
   */
  stampExpireLegal: Timestamp;

  /**
   * Data after which coins of this denomination can't be deposited anymore.
   */
  stampExpireDeposit: Timestamp;

  /**
   * Signature by the exchange's master key over the denomination
   * information.
   */
  masterSig: string;

  /**
   * Did we verify the signature on the denomination?
   *
   * FIXME:  Rename to "verificationStatus"?
   */
  status: DenominationStatus;

  /**
   * Was this denomination still offered by the exchange the last time
   * we checked?
   * Only false when the exchange redacts a previously published denomination.
   */
  isOffered: boolean;

  /**
   * Did the exchange revoke the denomination?
   * When this field is set to true in the database, the same transaction
   * should also mark all affected coins as revoked.
   */
  isRevoked: boolean;

  /**
   * Base URL of the exchange.
   */
  exchangeBaseUrl: string;
}

export enum ExchangeUpdateStatus {
  FetchKeys = "fetch-keys",
  FetchWire = "fetch-wire",
  FetchTerms = "fetch-terms",
  FinalizeUpdate = "finalize-update",
  Finished = "finished",
}

export interface ExchangeBankAccount {
  payto_uri: string;
  master_sig: string;
}

export enum ExchangeUpdateReason {
  Initial = "initial",
  Forced = "forced",
  Scheduled = "scheduled",
}

export interface ExchangeDetailsRecord {
  /**
   * Master public key of the exchange.
   */
  masterPublicKey: string;

  exchangeBaseUrl: string;

  /**
   * Currency that the exchange offers.
   */
  currency: string;

  /**
   * Auditors (partially) auditing the exchange.
   */
  auditors: Auditor[];

  /**
   * Last observed protocol version.
   */
  protocolVersion: string;

  reserveClosingDelay: Duration;

  /**
   * Signing keys we got from the exchange, can also contain
   * older signing keys that are not returned by /keys anymore.
   */
  signingKeys: ExchangeSignKeyJson[];

  /**
   * Terms of service text or undefined if not downloaded yet.
   *
   * This is just used as a cache of the last downloaded ToS.
   */
  termsOfServiceText: string | undefined;

  /**
   * ETag for last terms of service download.
   */
  termsOfServiceLastEtag: string | undefined;

  /**
   * ETag for last terms of service download.
   */
  termsOfServiceAcceptedEtag: string | undefined;

  /**
   * Timestamp for last update.
   */
  lastUpdateTime: Timestamp;

  /**
   * When should we next update the information about the exchange?
   */
  nextUpdateTime: Timestamp;

  wireInfo: WireInfo;
}

export interface WireInfo {
  feesForType: { [wireMethod: string]: WireFee[] };

  accounts: ExchangeBankAccount[];
}

export interface ExchangeDetailsPointer {
  masterPublicKey: string;
  currency: string;

  /**
   * Timestamp when the (masterPublicKey, currency) pointer
   * has been updated.
   */
  updateClock: Timestamp;
}

/**
 * Exchange record as stored in the wallet's database.
 */
export interface ExchangeRecord {
  /**
   * Base url of the exchange.
   */
  baseUrl: string;

  detailsPointer: ExchangeDetailsPointer | undefined;

  /**
   * Is this a permanent or temporary exchange record?
   */
  permanent: boolean;

  /**
   * Time when the update to the exchange has been started or
   * undefined if no update is in progress.
   */
  updateStarted: Timestamp | undefined;

  /**
   * Status of updating the info about the exchange.
   * 
   * FIXME:  Adapt this to recent changes regarding how
   * updating exchange details works.
   */
  updateStatus: ExchangeUpdateStatus;

  updateReason?: ExchangeUpdateReason;

  lastError?: TalerErrorDetails;

  /**
   * Retry status for fetching updated information about the exchange.
   */
  retryInfo: RetryInfo;

  /**
   * Next time that we should check if coins need to be refreshed.
   *
   * Updated whenever the exchange's denominations are updated or when
   * the refresh check has been done.
   */
  nextRefreshCheck?: Timestamp;
}

/**
 * A coin that isn't yet signed by an exchange.
 */
export interface PlanchetRecord {
  /**
   * Public key of the coin.
   */
  coinPub: string;

  /**
   * Private key of the coin.
   */
  coinPriv: string;

  /**
   * Withdrawal group that this planchet belongs to
   * (or the empty string).
   */
  withdrawalGroupId: string;

  /**
   * Index within the withdrawal group (or -1).
   */
  coinIdx: number;

  withdrawalDone: boolean;

  lastError: TalerErrorDetails | undefined;

  /**
   * Public key of the reserve that this planchet
   * is being withdrawn from.
   *
   * Can be the empty string (non-null/undefined for DB indexing)
   * if this is a tipping reserve.
   */
  reservePub: string;

  denomPubHash: string;

  denomPub: string;

  blindingKey: string;

  withdrawSig: string;

  coinEv: string;

  coinEvHash: string;

  coinValue: AmountJson;

  isFromTip: boolean;
}

/**
 * Planchet for a coin during refrehs.
 */
export interface RefreshPlanchet {
  /**
   * Public key for the coin.
   */
  publicKey: string;

  /**
   * Private key for the coin.
   */
  privateKey: string;

  /**
   * Blinded public key.
   */
  coinEv: string;

  coinEvHash: string;

  /**
   * Blinding key used.
   */
  blindingKey: string;
}

/**
 * Status of a coin.
 */
export enum CoinStatus {
  /**
   * Withdrawn and never shown to anybody.
   */
  Fresh = "fresh",
  /**
   * A coin that has been spent and refreshed.
   */
  Dormant = "dormant",
}

export enum CoinSourceType {
  Withdraw = "withdraw",
  Refresh = "refresh",
  Tip = "tip",
}

export interface WithdrawCoinSource {
  type: CoinSourceType.Withdraw;

  /**
   * Can be the empty string for orphaned coins.
   */
  withdrawalGroupId: string;

  /**
   * Index of the coin in the withdrawal session.
   */
  coinIndex: number;

  /**
   * Reserve public key for the reserve we got this coin from.
   */
  reservePub: string;
}

export interface RefreshCoinSource {
  type: CoinSourceType.Refresh;
  oldCoinPub: string;
}

export interface TipCoinSource {
  type: CoinSourceType.Tip;
  walletTipId: string;
  coinIndex: number;
}

export type CoinSource = WithdrawCoinSource | RefreshCoinSource | TipCoinSource;

/**
 * CoinRecord as stored in the "coins" data store
 * of the wallet database.
 */
export interface CoinRecord {
  /**
   * Where did the coin come from?  Used for recouping coins.
   */
  coinSource: CoinSource;

  /**
   * Public key of the coin.
   */
  coinPub: string;

  /**
   * Private key to authorize operations on the coin.
   */
  coinPriv: string;

  /**
   * Key used by the exchange used to sign the coin.
   */
  denomPub: string;

  /**
   * Hash of the public key that signs the coin.
   */
  denomPubHash: string;

  /**
   * Unblinded signature by the exchange.
   */
  denomSig: string;

  /**
   * Amount that's left on the coin.
   */
  currentAmount: AmountJson;

  /**
   * Base URL that identifies the exchange from which we got the
   * coin.
   */
  exchangeBaseUrl: string;

  /**
   * The coin is currently suspended, and will not be used for payments.
   */
  suspended: boolean;

  /**
   * Blinding key used when withdrawing the coin.
   * Potentionally used again during payback.
   */
  blindingKey: string;

  /**
   * Hash of the coin envelope.
   *
   * Stored here for indexing purposes, so that when looking at a
   * reserve history, we can quickly find the coin for a withdrawal transaction.
   */
  coinEvHash: string;

  /**
   * Status of the coin.
   */
  status: CoinStatus;
}

export enum ProposalStatus {
  /**
   * Not downloaded yet.
   */
  DOWNLOADING = "downloading",
  /**
   * Proposal downloaded, but the user needs to accept/reject it.
   */
  PROPOSED = "proposed",
  /**
   * The user has accepted the proposal.
   */
  ACCEPTED = "accepted",
  /**
   * The user has rejected the proposal.
   */
  REFUSED = "refused",
  /**
   * Downloading or processing the proposal has failed permanently.
   */
  PERMANENTLY_FAILED = "permanently-failed",
  /**
   * Downloaded proposal was detected as a re-purchase.
   */
  REPURCHASE = "repurchase",
}

export interface ProposalDownload {
  /**
   * The contract that was offered by the merchant.
   */
  contractTermsRaw: any;

  contractData: WalletContractData;
}

/**
 * Record for a downloaded order, stored in the wallet's database.
 */
export interface ProposalRecord {
  orderId: string;

  merchantBaseUrl: string;

  /**
   * Downloaded data from the merchant.
   */
  download: ProposalDownload | undefined;

  /**
   * Unique ID when the order is stored in the wallet DB.
   */
  proposalId: string;

  /**
   * Timestamp (in ms) of when the record
   * was created.
   */
  timestamp: Timestamp;

  /**
   * Private key for the nonce.
   */
  noncePriv: string;

  /**
   * Public key for the nonce.
   */
  noncePub: string;

  claimToken: string | undefined;

  proposalStatus: ProposalStatus;

  repurchaseProposalId: string | undefined;

  /**
   * Session ID we got when downloading the contract.
   */
  downloadSessionId?: string;

  /**
   * Retry info, even present when the operation isn't active to allow indexing
   * on the next retry timestamp.
   */
  retryInfo: RetryInfo;

  lastError: TalerErrorDetails | undefined;
}

/**
 * Status of a tip we got from a merchant.
 */
export interface TipRecord {
  lastError: TalerErrorDetails | undefined;

  /**
   * Has the user accepted the tip?  Only after the tip has been accepted coins
   * withdrawn from the tip may be used.
   */
  acceptedTimestamp: Timestamp | undefined;

  /**
   * The tipped amount.
   */
  tipAmountRaw: AmountJson;

  tipAmountEffective: AmountJson;

  /**
   * Timestamp, the tip can't be picked up anymore after this deadline.
   */
  tipExpiration: Timestamp;

  /**
   * The exchange that will sign our coins, chosen by the merchant.
   */
  exchangeBaseUrl: string;

  /**
   * Base URL of the merchant that is giving us the tip.
   */
  merchantBaseUrl: string;

  /**
   * Denomination selection made by the wallet for picking up
   * this tip.
   */
  denomsSel: DenomSelectionState;

  denomSelUid: string;

  /**
   * Tip ID chosen by the wallet.
   */
  walletTipId: string;

  /**
   * Secret seed used to derive planchets for this tip.
   */
  secretSeed: string;

  /**
   * The merchant's identifier for this tip.
   */
  merchantTipId: string;

  createdTimestamp: Timestamp;

  /**
   * Timestamp for when the wallet finished picking up the tip
   * from the merchant.
   */
  pickedUpTimestamp: Timestamp | undefined;

  /**
   * Retry info, even present when the operation isn't active to allow indexing
   * on the next retry timestamp.
   */
  retryInfo: RetryInfo;
}

export interface RefreshGroupRecord {
  /**
   * Retry info, even present when the operation isn't active to allow indexing
   * on the next retry timestamp.
   */
  retryInfo: RetryInfo;

  lastError: TalerErrorDetails | undefined;

  lastErrorPerCoin: { [coinIndex: number]: TalerErrorDetails };

  refreshGroupId: string;

  reason: RefreshReason;

  oldCoinPubs: string[];

  refreshSessionPerCoin: (RefreshSessionRecord | undefined)[];

  inputPerCoin: AmountJson[];

  estimatedOutputPerCoin: AmountJson[];

  /**
   * Flag for each coin whether refreshing finished.
   * If a coin can't be refreshed (remaining value too small),
   * it will be marked as finished, but no refresh session will
   * be created.
   */
  finishedPerCoin: boolean[];

  timestampCreated: Timestamp;

  /**
   * Timestamp when the refresh session finished.
   */
  timestampFinished: Timestamp | undefined;
}

/**
 * Ongoing refresh
 */
export interface RefreshSessionRecord {
  /**
   * 512-bit secret that can be used to derive
   * the other cryptographic material for the refresh session.
   *
   * FIXME:  We currently store the derived material, but
   * should always derive it.
   */
  sessionSecretSeed: string;

  /**
   * Sum of the value of denominations we want
   * to withdraw in this session, without fees.
   */
  amountRefreshOutput: AmountJson;

  /**
   * Hashed denominations of the newly requested coins.
   */
  newDenoms: {
    denomPubHash: string;
    count: number;
  }[];

  /**
   * The no-reveal-index after we've done the melting.
   */
  norevealIndex?: number;
}

/**
 * Wire fee for one wire method as stored in the
 * wallet's database.
 */
export interface WireFee {
  /**
   * Fee for wire transfers.
   */
  wireFee: AmountJson;

  /**
   * Fees to close and refund a reserve.
   */
  closingFee: AmountJson;

  /**
   * Start date of the fee.
   */
  startStamp: Timestamp;

  /**
   * End date of the fee.
   */
  endStamp: Timestamp;

  /**
   * Signature made by the exchange master key.
   */
  sig: string;
}

/**
 * Record to store information about a refund event.
 *
 * All information about a refund is stored with the purchase,
 * this event is just for the history.
 *
 * The event is only present for completed refunds.
 */
export interface RefundEventRecord {
  timestamp: Timestamp;
  merchantExecutionTimestamp: Timestamp;
  refundGroupId: string;
  proposalId: string;
}

export enum RefundState {
  Failed = "failed",
  Applied = "applied",
  Pending = "pending",
}

/**
 * State of one refund from the merchant, maintained by the wallet.
 */
export type WalletRefundItem =
  | WalletRefundFailedItem
  | WalletRefundPendingItem
  | WalletRefundAppliedItem;

export interface WalletRefundItemCommon {
  // Execution time as claimed by the merchant
  executionTime: Timestamp;

  /**
   * Time when the wallet became aware of the refund.
   */
  obtainedTime: Timestamp;

  refundAmount: AmountJson;

  refundFee: AmountJson;

  /**
   * Upper bound on the refresh cost incurred by
   * applying this refund.
   *
   * Might be lower in practice when two refunds on the same
   * coin are refreshed in the same refresh operation.
   */
  totalRefreshCostBound: AmountJson;

  coinPub: string;

  rtransactionId: number;
}

/**
 * Failed refund, either because the merchant did
 * something wrong or it expired.
 */
export interface WalletRefundFailedItem extends WalletRefundItemCommon {
  type: RefundState.Failed;
}

export interface WalletRefundPendingItem extends WalletRefundItemCommon {
  type: RefundState.Pending;
}

export interface WalletRefundAppliedItem extends WalletRefundItemCommon {
  type: RefundState.Applied;
}

export enum RefundReason {
  /**
   * Normal refund given by the merchant.
   */
  NormalRefund = "normal-refund",
  /**
   * Refund from an aborted payment.
   */
  AbortRefund = "abort-pay-refund",
}

export interface AllowedAuditorInfo {
  auditorBaseUrl: string;
  auditorPub: string;
}

export interface AllowedExchangeInfo {
  exchangeBaseUrl: string;
  exchangePub: string;
}

/**
 * Data extracted from the contract terms that is relevant for payment
 * processing in the wallet.
 */
export interface WalletContractData {
  products?: Product[];
  summaryI18n: { [lang_tag: string]: string } | undefined;

  /**
   * Fulfillment URL, or the empty string if the order has no fulfillment URL.
   *
   * Stored as a non-nullable string as we use this field for IndexedDB indexing.
   */
  fulfillmentUrl: string;

  contractTermsHash: string;
  fulfillmentMessage?: string;
  fulfillmentMessageI18n?: InternationalizedString;
  merchantSig: string;
  merchantPub: string;
  merchant: MerchantInfo;
  amount: AmountJson;
  orderId: string;
  merchantBaseUrl: string;
  summary: string;
  autoRefund: Duration | undefined;
  maxWireFee: AmountJson;
  wireFeeAmortization: number;
  payDeadline: Timestamp;
  refundDeadline: Timestamp;
  allowedAuditors: AllowedAuditorInfo[];
  allowedExchanges: AllowedExchangeInfo[];
  timestamp: Timestamp;
  wireMethod: string;
  wireInfoHash: string;
  maxDepositFee: AmountJson;
}

export enum AbortStatus {
  None = "none",
  AbortRefund = "abort-refund",
  AbortFinished = "abort-finished",
}

/**
 * Record that stores status information about one purchase, starting from when
 * the customer accepts a proposal.  Includes refund status if applicable.
 */
export interface PurchaseRecord {
  /**
   * Proposal ID for this purchase.  Uniquely identifies the
   * purchase and the proposal.
   */
  proposalId: string;

  /**
   * Private key for the nonce.
   */
  noncePriv: string;

  /**
   * Public key for the nonce.
   */
  noncePub: string;

  /**
   * Downloaded and parsed proposal data.
   */
  download: ProposalDownload;

  /**
   * Deposit permissions, available once the user has accepted the payment.
   *
   * This value is cached and derived from payCoinSelection.
   */
  coinDepositPermissions: CoinDepositPermission[] | undefined;

  payCoinSelection: PayCoinSelection;

  payCoinSelectionUid: string;

  /**
   * Pending removals from pay coin selection.
   *
   * Used when a the pay coin selection needs to be changed
   * because a coin became known as double-spent or invalid,
   * but a new coin selection can't immediately be done, as
   * there is not enough balance (e.g. when waiting for a refresh).
   */
  pendingRemovedCoinPubs?: string[];

  totalPayCost: AmountJson;

  /**
   * Timestamp of the first time that sending a payment to the merchant
   * for this purchase was successful.
   */
  timestampFirstSuccessfulPay: Timestamp | undefined;

  merchantPaySig: string | undefined;

  /**
   * When was the purchase made?
   * Refers to the time that the user accepted.
   */
  timestampAccept: Timestamp;

  /**
   * Pending refunds for the purchase.  A refund is pending
   * when the merchant reports a transient error from the exchange.
   */
  refunds: { [refundKey: string]: WalletRefundItem };

  /**
   * When was the last refund made?
   * Set to 0 if no refund was made on the purchase.
   */
  timestampLastRefundStatus: Timestamp | undefined;

  /**
   * Last session signature that we submitted to /pay (if any).
   */
  lastSessionId: string | undefined;

  /**
   * Set for the first payment, or on re-plays.
   */
  paymentSubmitPending: boolean;

  /**
   * Do we need to query the merchant for the refund status
   * of the payment?
   */
  refundQueryRequested: boolean;

  abortStatus: AbortStatus;

  payRetryInfo: RetryInfo;

  lastPayError: TalerErrorDetails | undefined;

  /**
   * Retry information for querying the refund status with the merchant.
   */
  refundStatusRetryInfo: RetryInfo;

  /**
   * Last error (or undefined) for querying the refund status with the merchant.
   */
  lastRefundStatusError: TalerErrorDetails | undefined;

  /**
   * Continue querying the refund status until this deadline has expired.
   */
  autoRefundDeadline: Timestamp | undefined;
}

/**
 * Configuration key/value entries to configure
 * the wallet.
 */
export interface ConfigRecord<T> {
  key: string;
  value: T;
}

/**
 * FIXME: Eliminate this in favor of DenomSelectionState.
 */
export interface DenominationSelectionInfo {
  totalCoinValue: AmountJson;
  totalWithdrawCost: AmountJson;
  selectedDenoms: {
    /**
     * How many times do we withdraw this denomination?
     */
    count: number;
    denom: DenominationRecord;
  }[];
}

/**
 * Selected denominations withn some extra info.
 */
export interface DenomSelectionState {
  totalCoinValue: AmountJson;
  totalWithdrawCost: AmountJson;
  selectedDenoms: {
    denomPubHash: string;
    count: number;
  }[];
}

/**
 * Group of withdrawal operations that need to be executed.
 * (Either for a normal withdrawal or from a tip.)
 *
 * The withdrawal group record is only created after we know
 * the coin selection we want to withdraw.
 */
export interface WithdrawalGroupRecord {
  withdrawalGroupId: string;

  /**
   * Secret seed used to derive planchets.
   */
  secretSeed: string;

  reservePub: string;

  exchangeBaseUrl: string;

  /**
   * When was the withdrawal operation started started?
   * Timestamp in milliseconds.
   */
  timestampStart: Timestamp;

  /**
   * When was the withdrawal operation completed?
   */
  timestampFinish?: Timestamp;

  /**
   * Amount including fees (i.e. the amount subtracted from the
   * reserve to withdraw all coins in this withdrawal session).
   */
  rawWithdrawalAmount: AmountJson;

  denomsSel: DenomSelectionState;

  denomSelUid: string;

  /**
   * Retry info, always present even on completed operations so that indexing works.
   */
  retryInfo: RetryInfo;

  lastError: TalerErrorDetails | undefined;
}

export interface BankWithdrawUriRecord {
  /**
   * The withdraw URI we got from the bank.
   */
  talerWithdrawUri: string;

  /**
   * Reserve that was created for the withdraw URI.
   */
  reservePub: string;
}

/**
 * Status of recoup operations that were grouped together.
 *
 * The remaining amount of involved coins should be set to zero
 * in the same transaction that inserts the RecoupGroupRecord.
 */
export interface RecoupGroupRecord {
  /**
   * Unique identifier for the recoup group record.
   */
  recoupGroupId: string;

  timestampStarted: Timestamp;

  timestampFinished: Timestamp | undefined;

  /**
   * Public keys that identify the coins being recouped
   * as part of this session.
   *
   * (Structured like this to enable multiEntry indexing in IndexedDB.)
   */
  coinPubs: string[];

  /**
   * Array of flags to indicate whether the recoup finished on each individual coin.
   */
  recoupFinishedPerCoin: boolean[];

  /**
   * We store old amount (i.e. before recoup) of recouped coins here,
   * as the balance of a recouped coin is set to zero when the
   * recoup group is created.
   */
  oldAmountPerCoin: AmountJson[];

  /**
   * Public keys of coins that should be scheduled for refreshing
   * after all individual recoups are done.
   */
  scheduleRefreshCoins: string[];

  /**
   * Retry info.
   */
  retryInfo: RetryInfo;

  /**
   * Last error that occurred, if any.
   */
  lastError: TalerErrorDetails | undefined;
}

export enum ImportPayloadType {
  CoreSchema = "core-schema",
}

export enum BackupProviderStatus {
  PaymentRequired = "payment-required",
  Ready = "ready",
}

export interface BackupProviderTerms {
  supportedProtocolVersion: string;
  annualFee: AmountString;
  storageLimitInMegabytes: number;
}

export interface BackupProviderRecord {
  /**
   * Base URL of the provider.
   *
   * Primary key for the record.
   */
  baseUrl: string;

  /**
   * Terms of service of the provider.
   * Might be unavailable in the DB in certain situations
   * (such as loading a recovery document).
   */
  terms?: BackupProviderTerms;

  active: boolean;

  /**
   * Hash of the last encrypted backup that we already merged
   * or successfully uploaded ourselves.
   */
  lastBackupHash?: string;

  lastBackupTimestamp?: Timestamp;

  /**
   * Proposal that we're currently trying to pay for.
   *
   * (Also included in paymentProposalIds.)
   */
  currentPaymentProposalId?: string;

  /**
   * Proposals that were used to pay (or attempt to pay) the provider.
   *
   * Stored to display a history of payments to the provider, and
   * to make sure that the wallet isn't overpaying.
   */
  paymentProposalIds: string[];

  /**
   * Next scheduled backup.
   */
  nextBackupTimestamp?: Timestamp;

  /**
   * Retry info.
   */
  retryInfo: RetryInfo;

  /**
   * Last error that occurred, if any.
   */
  lastError: TalerErrorDetails | undefined;

  /**
   * UIDs for the operation that added the backup provider.
   */
  uids: string[];
}

/**
 * Group of deposits made by the wallet.
 */
export interface DepositGroupRecord {
  depositGroupId: string;

  merchantPub: string;
  merchantPriv: string;

  noncePriv: string;
  noncePub: string;

  /**
   * Wire information used by all deposits in this
   * deposit group.
   */
  wire: {
    payto_uri: string;
    salt: string;
  };

  /**
   * Verbatim contract terms.
   */
  contractTermsRaw: ContractTerms;

  contractTermsHash: string;

  payCoinSelection: PayCoinSelection;

  totalPayCost: AmountJson;

  effectiveDepositAmount: AmountJson;

  depositedPerCoin: boolean[];

  timestampCreated: Timestamp;

  timestampFinished: Timestamp | undefined;

  lastError: TalerErrorDetails | undefined;

  /**
   * Retry info.
   */
  retryInfo: RetryInfo;
}

/**
 * Record for a deposits that the wallet observed
 * as a result of double spending, but which is not
 * present in the wallet's own database otherwise.
 */
export interface GhostDepositGroupRecord {
  /**
   * When multiple deposits for the same contract terms hash
   * have a different timestamp, we choose the earliest one.
   */
  timestamp: Timestamp;

  contractTermsHash: string;

  deposits: {
    coinPub: string;
    amount: AmountString;
    timestamp: Timestamp;
    depositFee: AmountString;
    merchantPub: string;
    coinSig: string;
    wireHash: string;
  }[];
}

export interface TombstoneRecord {
  /**
   * Tombstone ID, with the syntax "<type>:<key>".
   */
  id: string;
}

class ExchangesStore extends Store<"exchanges", ExchangeRecord> {
  constructor() {
    super("exchanges", { keyPath: "baseUrl" });
  }
}

class ExchangeDetailsStore extends Store<
  "exchangeDetails",
  ExchangeDetailsRecord
> {
  constructor() {
    super("exchangeDetails", {
      keyPath: ["exchangeBaseUrl", "currency", "masterPublicKey"],
    });
  }
}

class CoinsStore extends Store<"coins", CoinRecord> {
  constructor() {
    super("coins", { keyPath: "coinPub" });
  }

  exchangeBaseUrlIndex = new Index<
    "coins",
    "exchangeBaseUrl",
    string,
    CoinRecord
  >(this, "exchangeBaseUrl", "exchangeBaseUrl");

  denomPubHashIndex = new Index<
    "coins",
    "denomPubHashIndex",
    string,
    CoinRecord
  >(this, "denomPubHashIndex", "denomPubHash");

  coinEvHashIndex = new Index<"coins", "coinEvHashIndex", string, CoinRecord>(
    this,
    "coinEvHashIndex",
    "coinEvHash",
  );
}

class ProposalsStore extends Store<"proposals", ProposalRecord> {
  constructor() {
    super("proposals", { keyPath: "proposalId" });
  }
  urlAndOrderIdIndex = new Index<
    "proposals",
    "urlIndex",
    string,
    ProposalRecord
  >(this, "urlIndex", ["merchantBaseUrl", "orderId"]);
}

class PurchasesStore extends Store<"purchases", PurchaseRecord> {
  constructor() {
    super("purchases", { keyPath: "proposalId" });
  }

  fulfillmentUrlIndex = new Index<
    "purchases",
    "fulfillmentUrlIndex",
    string,
    PurchaseRecord
  >(this, "fulfillmentUrlIndex", "download.contractData.fulfillmentUrl");

  orderIdIndex = new Index<"purchases", "orderIdIndex", string, PurchaseRecord>(
    this,
    "orderIdIndex",
    ["download.contractData.merchantBaseUrl", "download.contractData.orderId"],
  );
}

class DenominationsStore extends Store<"denominations", DenominationRecord> {
  constructor() {
    // cast needed because of bug in type annotations
    super("denominations", {
      keyPath: (["exchangeBaseUrl", "denomPubHash"] as any) as IDBKeyPath,
    });
  }
  exchangeBaseUrlIndex = new Index<
    "denominations",
    "exchangeBaseUrlIndex",
    string,
    DenominationRecord
  >(this, "exchangeBaseUrlIndex", "exchangeBaseUrl");
}

class AuditorTrustStore extends Store<"auditorTrust", AuditorTrustRecord> {
  constructor() {
    super("auditorTrust", {
      keyPath: ["currency", "auditorBaseUrl", "auditorPub"],
    });
  }
  auditorPubIndex = new Index<
    "auditorTrust",
    "auditorPubIndex",
    string,
    AuditorTrustRecord
  >(this, "auditorPubIndex", "auditorPub");
  uidIndex = new Index<"auditorTrust", "uidIndex", string, AuditorTrustRecord>(
    this,
    "uidIndex",
    "uids",
    { multiEntry: true },
  );
}

class ExchangeTrustStore extends Store<"exchangeTrust", ExchangeTrustRecord> {
  constructor() {
    super("exchangeTrust", {
      keyPath: ["currency", "exchangeBaseUrl", "exchangeMasterPub"],
    });
  }
  exchangeMasterPubIndex = new Index<
    "exchangeTrust",
    "exchangeMasterPubIndex",
    string,
    ExchangeTrustRecord
  >(this, "exchangeMasterPubIndex", "exchangeMasterPub");
  uidIndex = new Index<
    "exchangeTrust",
    "uidIndex",
    string,
    ExchangeTrustRecord
  >(this, "uidIndex", "uids", { multiEntry: true });
}

class ConfigStore extends Store<"config", ConfigRecord<any>> {
  constructor() {
    super("config", { keyPath: "key" });
  }
}

class ReservesStore extends Store<"reserves", ReserveRecord> {
  constructor() {
    super("reserves", { keyPath: "reservePub" });
  }
  byInitialWithdrawalGroupId = new Index<
    "reserves",
    "initialWithdrawalGroupIdIndex",
    string,
    ReserveRecord
  >(this, "initialWithdrawalGroupIdIndex", "initialWithdrawalGroupId");
}

class TipsStore extends Store<"tips", TipRecord> {
  constructor() {
    super("tips", { keyPath: "walletTipId" });
  }
  // Added in version 2
  byMerchantTipIdAndBaseUrl = new Index<
    "tips",
    "tipsByMerchantTipIdAndOriginIndex",
    [string, string],
    TipRecord
  >(this, "tipsByMerchantTipIdAndOriginIndex", [
    "merchantTipId",
    "merchantBaseUrl",
  ]);
}

class WithdrawalGroupsStore extends Store<
  "withdrawals",
  WithdrawalGroupRecord
> {
  constructor() {
    super("withdrawals", { keyPath: "withdrawalGroupId" });
  }
  byReservePub = new Index<
    "withdrawals",
    "withdrawalsByReserveIndex",
    string,
    WithdrawalGroupRecord
  >(this, "withdrawalsByReserveIndex", "reservePub");
}

class PlanchetsStore extends Store<"planchets", PlanchetRecord> {
  constructor() {
    super("planchets", { keyPath: "coinPub" });
  }
  byGroupAndIndex = new Index<
    "planchets",
    "withdrawalGroupAndCoinIdxIndex",
    string,
    PlanchetRecord
  >(this, "withdrawalGroupAndCoinIdxIndex", ["withdrawalGroupId", "coinIdx"]);
  byGroup = new Index<
    "planchets",
    "withdrawalGroupIndex",
    string,
    PlanchetRecord
  >(this, "withdrawalGroupIndex", "withdrawalGroupId");

  coinEvHashIndex = new Index<
    "planchets",
    "coinEvHashIndex",
    string,
    PlanchetRecord
  >(this, "coinEvHashIndex", "coinEvHash");
}

/**
 * This store is effectively a materialized index for
 * reserve records that are for a bank-integrated withdrawal.
 */
class BankWithdrawUrisStore extends Store<
  "bankWithdrawUris",
  BankWithdrawUriRecord
> {
  constructor() {
    super("bankWithdrawUris", { keyPath: "talerWithdrawUri" });
  }
}

/**
 */
class BackupProvidersStore extends Store<
  "backupProviders",
  BackupProviderRecord
> {
  constructor() {
    super("backupProviders", { keyPath: "baseUrl" });
  }
}

class DepositGroupsStore extends Store<"depositGroups", DepositGroupRecord> {
  constructor() {
    super("depositGroups", { keyPath: "depositGroupId" });
  }
}

class TombstonesStore extends Store<"tombstones", TombstoneRecord> {
  constructor() {
    super("tombstones", { keyPath: "id" });
  }
}

/**
 * The stores and indices for the wallet database.
 */
export const Stores = {
  coins: new CoinsStore(),
  config: new ConfigStore(),
  auditorTrustStore: new AuditorTrustStore(),
  exchangeTrustStore: new ExchangeTrustStore(),
  denominations: new DenominationsStore(),
  exchanges: new ExchangesStore(),
  exchangeDetails: new ExchangeDetailsStore(),
  proposals: new ProposalsStore(),
  refreshGroups: new Store<"refreshGroups", RefreshGroupRecord>(
    "refreshGroups",
    {
      keyPath: "refreshGroupId",
    },
  ),
  recoupGroups: new Store<"recoupGroups", RecoupGroupRecord>("recoupGroups", {
    keyPath: "recoupGroupId",
  }),
  reserves: new ReservesStore(),
  purchases: new PurchasesStore(),
  tips: new TipsStore(),
  withdrawalGroups: new WithdrawalGroupsStore(),
  planchets: new PlanchetsStore(),
  bankWithdrawUris: new BankWithdrawUrisStore(),
  backupProviders: new BackupProvidersStore(),
  depositGroups: new DepositGroupsStore(),
  tombstones: new TombstonesStore(),
  ghostDepositGroups: new Store<"ghostDepositGroups", GhostDepositGroupRecord>(
    "ghostDepositGroups",
    {
      keyPath: "contractTermsHash",
    },
  ),
};

export class MetaConfigStore extends Store<"metaConfig", ConfigRecord<any>> {
  constructor() {
    super("metaConfig", { keyPath: "key" });
  }
}

export const MetaStores = {
  metaConfig: new MetaConfigStore(),
};
