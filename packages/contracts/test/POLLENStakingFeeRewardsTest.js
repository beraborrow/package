const Decimal = require("decimal.js");
const deploymentHelper = require("../utils/deploymentHelpers.js")
const { BNConverter } = require("../utils/BNConverter.js")
const testHelpers = require("../utils/testHelpers.js")

const POLLENStakingTester = artifacts.require('POLLENStakingTester')
const TroveManagerTester = artifacts.require("TroveManagerTester")
const NonPayable = artifacts.require("./NonPayable.sol")

const th = testHelpers.TestHelper
const timeValues = testHelpers.TimeValues
const dec = th.dec
const assertRevert = th.assertRevert

const toBN = th.toBN
const ZERO = th.toBN('0')

const GAS_PRICE = 10000000

/* NOTE: These tests do not test for specific ETH and NECT gain values. They only test that the 
 * gains are non-zero, occur when they should, and are in correct proportion to the user's stake. 
 *
 * Specific ETH/NECT gain values will depend on the final fee schedule used, and the final choices for
 * parameters BETA and MINUTE_DECAY_FACTOR in the TroveManager, which are still TBD based on economic
 * modelling.
 * 
 */ 

contract('POLLENStaking revenue share tests', async accounts => {

  const [bountyAddress, lpRewardsAddress, multisig] = accounts.slice(997, 1000)
  
  const [owner, A, B, C, D, E, F, G, whale] = accounts;

  let priceFeed
  let nectToken
  let sortedTroves
  let troveManager
  let activePool
  let stabilityPool
  let defaultPool
  let borrowerOperations
  let pollenStaking
  let pollenToken

  let contracts

  const openTrove = async (params) => th.openTrove(contracts, params)

  beforeEach(async () => {
    contracts = await deploymentHelper.deployBeraBorrowCore()
    contracts.troveManager = await TroveManagerTester.new()
    contracts = await deploymentHelper.deployNECTTokenTester(contracts)
    const POLLENContracts = await deploymentHelper.deployPOLLENTesterContractsHardhat(bountyAddress, lpRewardsAddress, multisig)
    
    await deploymentHelper.connectPOLLENContracts(POLLENContracts)
    await deploymentHelper.connectCoreContracts(contracts, POLLENContracts)
    await deploymentHelper.connectPOLLENContractsToCore(POLLENContracts, contracts)

    nonPayable = await NonPayable.new() 
    priceFeed = contracts.priceFeedTestnet
    nectToken = contracts.nectToken
    sortedTroves = contracts.sortedTroves
    troveManager = contracts.troveManager
    activePool = contracts.activePool
    stabilityPool = contracts.stabilityPool
    defaultPool = contracts.defaultPool
    borrowerOperations = contracts.borrowerOperations
    hintHelpers = contracts.hintHelpers

    pollenToken = POLLENContracts.pollenToken
    pollenStaking = POLLENContracts.pollenStaking
  })

  it('stake(): reverts if amount is zero', async () => {
    // FF time one year so owner can transfer POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers POLLEN to staker A
    await pollenToken.transfer(A, dec(100, 18), {from: multisig})

    // console.log(`A pollen bal: ${await pollenToken.balanceOf(A)}`)

    // A makes stake
    await pollenToken.approve(pollenStaking.address, dec(100, 18), {from: A})
    await assertRevert(pollenStaking.stake(0, {from: A}), "POLLENStaking: Amount must be non-zero")
  })

  it("ETH fee per POLLEN staked increases when a redemption fee is triggered and totalStakes > 0", async () => {
    await openTrove({ extraNECTAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraNECTAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraNECTAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraNECTAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })

    // FF time one year so owner can transfer POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers POLLEN to staker A
    await pollenToken.transfer(A, dec(100, 18), {from: multisig, gasPrice: GAS_PRICE})

    // console.log(`A pollen bal: ${await pollenToken.balanceOf(A)}`)

    // A makes stake
    await pollenToken.approve(pollenStaking.address, dec(100, 18), {from: A})
    await pollenStaking.stake(dec(100, 18), {from: A})

    // Check ETH fee per unit staked is zero
    const F_ETH_Before = await pollenStaking.F_ETH()
    assert.equal(F_ETH_Before, '0')

    const B_BalBeforeREdemption = await nectToken.balanceOf(B)
    // B redeems
    const redemptionTx = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), GAS_PRICE)
    
    const B_BalAfterRedemption = await nectToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // check ETH fee emitted in event is non-zero
    const emittedETHFee = toBN((await th.getEmittedRedemptionValues(redemptionTx))[3])
    assert.isTrue(emittedETHFee.gt(toBN('0')))

    // Check ETH fee per unit staked has increased by correct amount
    const F_ETH_After = await pollenStaking.F_ETH()

    // Expect fee per unit staked = fee/100, since there is 100 NECT totalStaked
    const expected_F_ETH_After = emittedETHFee.div(toBN('100')) 

    assert.isTrue(expected_F_ETH_After.eq(F_ETH_After))
  })

  it("ETH fee per POLLEN staked doesn't change when a redemption fee is triggered and totalStakes == 0", async () => {
    await openTrove({ extraNECTAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraNECTAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraNECTAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraNECTAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraNECTAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

    // FF time one year so owner can transfer POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers POLLEN to staker A
    await pollenToken.transfer(A, dec(100, 18), {from: multisig, gasPrice: GAS_PRICE})

    // Check ETH fee per unit staked is zero
    const F_ETH_Before = await pollenStaking.F_ETH()
    assert.equal(F_ETH_Before, '0')

    const B_BalBeforeREdemption = await nectToken.balanceOf(B)
    // B redeems
    const redemptionTx = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), GAS_PRICE)
    
    const B_BalAfterRedemption = await nectToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // check ETH fee emitted in event is non-zero
    const emittedETHFee = toBN((await th.getEmittedRedemptionValues(redemptionTx))[3])
    assert.isTrue(emittedETHFee.gt(toBN('0')))

    // Check ETH fee per unit staked has not increased 
    const F_ETH_After = await pollenStaking.F_ETH()
    assert.equal(F_ETH_After, '0')
  })

  it("NECT fee per POLLEN staked increases when a redemption fee is triggered and totalStakes > 0", async () => {
    await openTrove({ extraNECTAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraNECTAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraNECTAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraNECTAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraNECTAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

    // FF time one year so owner can transfer POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers POLLEN to staker A
    await pollenToken.transfer(A, dec(100, 18), {from: multisig})

    // A makes stake
    await pollenToken.approve(pollenStaking.address, dec(100, 18), {from: A})
    await pollenStaking.stake(dec(100, 18), {from: A})

    // Check NECT fee per unit staked is zero
    const F_NECT_Before = await pollenStaking.F_ETH()
    assert.equal(F_NECT_Before, '0')

    const B_BalBeforeREdemption = await nectToken.balanceOf(B)
    // B redeems
    const redemptionTx = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), gasPrice= GAS_PRICE)
    
    const B_BalAfterRedemption = await nectToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // Check base rate is now non-zero
    const baseRate = await troveManager.baseRate()
    assert.isTrue(baseRate.gt(toBN('0')))

    // D draws debt
    const tx = await borrowerOperations.withdrawNECT(th._100pct, dec(27, 18), D, D, {from: D})
    
    // Check NECT fee value in event is non-zero
    const emittedNECTFee = toBN(th.getNECTFeeFromNECTBorrowingEvent(tx))
    assert.isTrue(emittedNECTFee.gt(toBN('0')))
    
    // Check NECT fee per unit staked has increased by correct amount
    const F_NECT_After = await pollenStaking.F_NECT()

    // Expect fee per unit staked = fee/100, since there is 100 NECT totalStaked
    const expected_F_NECT_After = emittedNECTFee.div(toBN('100')) 

    assert.isTrue(expected_F_NECT_After.eq(F_NECT_After))
  })

  it("NECT fee per POLLEN staked doesn't change when a redemption fee is triggered and totalStakes == 0", async () => {
    await openTrove({ extraNECTAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraNECTAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraNECTAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraNECTAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraNECTAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

    // FF time one year so owner can transfer POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers POLLEN to staker A
    await pollenToken.transfer(A, dec(100, 18), {from: multisig})

    // Check NECT fee per unit staked is zero
    const F_NECT_Before = await pollenStaking.F_ETH()
    assert.equal(F_NECT_Before, '0')

    const B_BalBeforeREdemption = await nectToken.balanceOf(B)
    // B redeems
    const redemptionTx = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const B_BalAfterRedemption = await nectToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // Check base rate is now non-zero
    const baseRate = await troveManager.baseRate()
    assert.isTrue(baseRate.gt(toBN('0')))

    // D draws debt
    const tx = await borrowerOperations.withdrawNECT(th._100pct, dec(27, 18), D, D, {from: D})
    
    // Check NECT fee value in event is non-zero
    const emittedNECTFee = toBN(th.getNECTFeeFromNECTBorrowingEvent(tx))
    assert.isTrue(emittedNECTFee.gt(toBN('0')))
    
    // Check NECT fee per unit staked did not increase, is still zero
    const F_NECT_After = await pollenStaking.F_NECT()
    assert.equal(F_NECT_After, '0')
  })

  it("POLLEN Staking: A single staker earns all ETH and POLLEN fees that occur", async () => {
    await openTrove({ extraNECTAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraNECTAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraNECTAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraNECTAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraNECTAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

    // FF time one year so owner can transfer POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers POLLEN to staker A
    await pollenToken.transfer(A, dec(100, 18), {from: multisig})

    // A makes stake
    await pollenToken.approve(pollenStaking.address, dec(100, 18), {from: A})
    await pollenStaking.stake(dec(100, 18), {from: A})

    const B_BalBeforeREdemption = await nectToken.balanceOf(B)
    // B redeems
    const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const B_BalAfterRedemption = await nectToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // check ETH fee 1 emitted in event is non-zero
    const emittedETHFee_1 = toBN((await th.getEmittedRedemptionValues(redemptionTx_1))[3])
    assert.isTrue(emittedETHFee_1.gt(toBN('0')))

    const C_BalBeforeREdemption = await nectToken.balanceOf(C)
    // C redeems
    const redemptionTx_2 = await th.redeemCollateralAndGetTxObject(C, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const C_BalAfterRedemption = await nectToken.balanceOf(C)
    assert.isTrue(C_BalAfterRedemption.lt(C_BalBeforeREdemption))
 
     // check ETH fee 2 emitted in event is non-zero
     const emittedETHFee_2 = toBN((await th.getEmittedRedemptionValues(redemptionTx_2))[3])
     assert.isTrue(emittedETHFee_2.gt(toBN('0')))

    // D draws debt
    const borrowingTx_1 = await borrowerOperations.withdrawNECT(th._100pct, dec(104, 18), D, D, {from: D})
    
    // Check NECT fee value in event is non-zero
    const emittedNECTFee_1 = toBN(th.getNECTFeeFromNECTBorrowingEvent(borrowingTx_1))
    assert.isTrue(emittedNECTFee_1.gt(toBN('0')))

    // B draws debt
    const borrowingTx_2 = await borrowerOperations.withdrawNECT(th._100pct, dec(17, 18), B, B, {from: B})
    
    // Check NECT fee value in event is non-zero
    const emittedNECTFee_2 = toBN(th.getNECTFeeFromNECTBorrowingEvent(borrowingTx_2))
    assert.isTrue(emittedNECTFee_2.gt(toBN('0')))

    const expectedTotalETHGain = emittedETHFee_1.add(emittedETHFee_2)
    const expectedTotalNECTGain = emittedNECTFee_1.add(emittedNECTFee_2)

    const A_ETHBalance_Before = toBN(await web3.eth.getBalance(A))
    const A_NECTBalance_Before = toBN(await nectToken.balanceOf(A))

    // A un-stakes
    const GAS_Used = th.gasUsed(await pollenStaking.unstake(dec(100, 18), {from: A, gasPrice: GAS_PRICE }))

    const A_ETHBalance_After = toBN(await web3.eth.getBalance(A))
    const A_NECTBalance_After = toBN(await nectToken.balanceOf(A))


    const A_ETHGain = A_ETHBalance_After.sub(A_ETHBalance_Before).add(toBN(GAS_Used * GAS_PRICE))
    const A_NECTGain = A_NECTBalance_After.sub(A_NECTBalance_Before)

    assert.isAtMost(th.getDifference(expectedTotalETHGain, A_ETHGain), 1000)
    assert.isAtMost(th.getDifference(expectedTotalNECTGain, A_NECTGain), 1000)
  })

  it("stake(): Top-up sends out all accumulated ETH and NECT gains to the staker", async () => { 
    await openTrove({ extraNECTAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraNECTAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraNECTAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraNECTAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraNECTAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

    // FF time one year so owner can transfer POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers POLLEN to staker A
    await pollenToken.transfer(A, dec(100, 18), {from: multisig})

    // A makes stake
    await pollenToken.approve(pollenStaking.address, dec(100, 18), {from: A})
    await pollenStaking.stake(dec(50, 18), {from: A})

    const B_BalBeforeREdemption = await nectToken.balanceOf(B)
    // B redeems
    const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const B_BalAfterRedemption = await nectToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // check ETH fee 1 emitted in event is non-zero
    const emittedETHFee_1 = toBN((await th.getEmittedRedemptionValues(redemptionTx_1))[3])
    assert.isTrue(emittedETHFee_1.gt(toBN('0')))

    const C_BalBeforeREdemption = await nectToken.balanceOf(C)
    // C redeems
    const redemptionTx_2 = await th.redeemCollateralAndGetTxObject(C, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const C_BalAfterRedemption = await nectToken.balanceOf(C)
    assert.isTrue(C_BalAfterRedemption.lt(C_BalBeforeREdemption))
 
     // check ETH fee 2 emitted in event is non-zero
     const emittedETHFee_2 = toBN((await th.getEmittedRedemptionValues(redemptionTx_2))[3])
     assert.isTrue(emittedETHFee_2.gt(toBN('0')))

    // D draws debt
    const borrowingTx_1 = await borrowerOperations.withdrawNECT(th._100pct, dec(104, 18), D, D, {from: D})
    
    // Check NECT fee value in event is non-zero
    const emittedNECTFee_1 = toBN(th.getNECTFeeFromNECTBorrowingEvent(borrowingTx_1))
    assert.isTrue(emittedNECTFee_1.gt(toBN('0')))

    // B draws debt
    const borrowingTx_2 = await borrowerOperations.withdrawNECT(th._100pct, dec(17, 18), B, B, {from: B})
    
    // Check NECT fee value in event is non-zero
    const emittedNECTFee_2 = toBN(th.getNECTFeeFromNECTBorrowingEvent(borrowingTx_2))
    assert.isTrue(emittedNECTFee_2.gt(toBN('0')))

    const expectedTotalETHGain = emittedETHFee_1.add(emittedETHFee_2)
    const expectedTotalNECTGain = emittedNECTFee_1.add(emittedNECTFee_2)

    const A_ETHBalance_Before = toBN(await web3.eth.getBalance(A))
    const A_NECTBalance_Before = toBN(await nectToken.balanceOf(A))

    // A tops up
    const GAS_Used = th.gasUsed(await pollenStaking.stake(dec(50, 18), {from: A, gasPrice: GAS_PRICE }))

    const A_ETHBalance_After = toBN(await web3.eth.getBalance(A))
    const A_NECTBalance_After = toBN(await nectToken.balanceOf(A))

    const A_ETHGain = A_ETHBalance_After.sub(A_ETHBalance_Before).add(toBN(GAS_Used * GAS_PRICE))
    const A_NECTGain = A_NECTBalance_After.sub(A_NECTBalance_Before)

    assert.isAtMost(th.getDifference(expectedTotalETHGain, A_ETHGain), 1000)
    assert.isAtMost(th.getDifference(expectedTotalNECTGain, A_NECTGain), 1000)
  })

  it("getPendingETHGain(): Returns the staker's correct pending ETH gain", async () => { 
    await openTrove({ extraNECTAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraNECTAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraNECTAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraNECTAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraNECTAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

    // FF time one year so owner can transfer POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers POLLEN to staker A
    await pollenToken.transfer(A, dec(100, 18), {from: multisig})

    // A makes stake
    await pollenToken.approve(pollenStaking.address, dec(100, 18), {from: A})
    await pollenStaking.stake(dec(50, 18), {from: A})

    const B_BalBeforeREdemption = await nectToken.balanceOf(B)
    // B redeems
    const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const B_BalAfterRedemption = await nectToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // check ETH fee 1 emitted in event is non-zero
    const emittedETHFee_1 = toBN((await th.getEmittedRedemptionValues(redemptionTx_1))[3])
    assert.isTrue(emittedETHFee_1.gt(toBN('0')))

    const C_BalBeforeREdemption = await nectToken.balanceOf(C)
    // C redeems
    const redemptionTx_2 = await th.redeemCollateralAndGetTxObject(C, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const C_BalAfterRedemption = await nectToken.balanceOf(C)
    assert.isTrue(C_BalAfterRedemption.lt(C_BalBeforeREdemption))
 
     // check ETH fee 2 emitted in event is non-zero
     const emittedETHFee_2 = toBN((await th.getEmittedRedemptionValues(redemptionTx_2))[3])
     assert.isTrue(emittedETHFee_2.gt(toBN('0')))

    const expectedTotalETHGain = emittedETHFee_1.add(emittedETHFee_2)

    const A_ETHGain = await pollenStaking.getPendingETHGain(A)

    assert.isAtMost(th.getDifference(expectedTotalETHGain, A_ETHGain), 1000)
  })

  it("getPendingNECTGain(): Returns the staker's correct pending NECT gain", async () => { 
    await openTrove({ extraNECTAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraNECTAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraNECTAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraNECTAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraNECTAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

    // FF time one year so owner can transfer POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers POLLEN to staker A
    await pollenToken.transfer(A, dec(100, 18), {from: multisig})

    // A makes stake
    await pollenToken.approve(pollenStaking.address, dec(100, 18), {from: A})
    await pollenStaking.stake(dec(50, 18), {from: A})

    const B_BalBeforeREdemption = await nectToken.balanceOf(B)
    // B redeems
    const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(B, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const B_BalAfterRedemption = await nectToken.balanceOf(B)
    assert.isTrue(B_BalAfterRedemption.lt(B_BalBeforeREdemption))

    // check ETH fee 1 emitted in event is non-zero
    const emittedETHFee_1 = toBN((await th.getEmittedRedemptionValues(redemptionTx_1))[3])
    assert.isTrue(emittedETHFee_1.gt(toBN('0')))

    const C_BalBeforeREdemption = await nectToken.balanceOf(C)
    // C redeems
    const redemptionTx_2 = await th.redeemCollateralAndGetTxObject(C, contracts, dec(100, 18), gasPrice = GAS_PRICE)
    
    const C_BalAfterRedemption = await nectToken.balanceOf(C)
    assert.isTrue(C_BalAfterRedemption.lt(C_BalBeforeREdemption))
 
     // check ETH fee 2 emitted in event is non-zero
     const emittedETHFee_2 = toBN((await th.getEmittedRedemptionValues(redemptionTx_2))[3])
     assert.isTrue(emittedETHFee_2.gt(toBN('0')))

    // D draws debt
    const borrowingTx_1 = await borrowerOperations.withdrawNECT(th._100pct, dec(104, 18), D, D, {from: D})
    
    // Check NECT fee value in event is non-zero
    const emittedNECTFee_1 = toBN(th.getNECTFeeFromNECTBorrowingEvent(borrowingTx_1))
    assert.isTrue(emittedNECTFee_1.gt(toBN('0')))

    // B draws debt
    const borrowingTx_2 = await borrowerOperations.withdrawNECT(th._100pct, dec(17, 18), B, B, {from: B})
    
    // Check NECT fee value in event is non-zero
    const emittedNECTFee_2 = toBN(th.getNECTFeeFromNECTBorrowingEvent(borrowingTx_2))
    assert.isTrue(emittedNECTFee_2.gt(toBN('0')))

    const expectedTotalNECTGain = emittedNECTFee_1.add(emittedNECTFee_2)
    const A_NECTGain = await pollenStaking.getPendingNECTGain(A)

    assert.isAtMost(th.getDifference(expectedTotalNECTGain, A_NECTGain), 1000)
  })

  // - multi depositors, several rewards
  it("POLLEN Staking: Multiple stakers earn the correct share of all ETH and POLLEN fees, based on their stake size", async () => {
    await openTrove({ extraNECTAmount: toBN(dec(10000, 18)), ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ extraNECTAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraNECTAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraNECTAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraNECTAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })
    await openTrove({ extraNECTAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: E } })
    await openTrove({ extraNECTAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: F } })
    await openTrove({ extraNECTAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: G } })

    // FF time one year so owner can transfer POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers POLLEN to staker A, B, C
    await pollenToken.transfer(A, dec(100, 18), {from: multisig})
    await pollenToken.transfer(B, dec(200, 18), {from: multisig})
    await pollenToken.transfer(C, dec(300, 18), {from: multisig})

    // A, B, C make stake
    await pollenToken.approve(pollenStaking.address, dec(100, 18), {from: A})
    await pollenToken.approve(pollenStaking.address, dec(200, 18), {from: B})
    await pollenToken.approve(pollenStaking.address, dec(300, 18), {from: C})
    await pollenStaking.stake(dec(100, 18), {from: A})
    await pollenStaking.stake(dec(200, 18), {from: B})
    await pollenStaking.stake(dec(300, 18), {from: C})

    // Confirm staking contract holds 600 POLLEN
    // console.log(`pollen staking POLLEN bal: ${await pollenToken.balanceOf(pollenStaking.address)}`)
    assert.equal(await pollenToken.balanceOf(pollenStaking.address), dec(600, 18))
    assert.equal(await pollenStaking.totalPOLLENStaked(), dec(600, 18))

    // F redeems
    const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(F, contracts, dec(45, 18), gasPrice = GAS_PRICE)
    const emittedETHFee_1 = toBN((await th.getEmittedRedemptionValues(redemptionTx_1))[3])
    assert.isTrue(emittedETHFee_1.gt(toBN('0')))

     // G redeems
     const redemptionTx_2 = await th.redeemCollateralAndGetTxObject(G, contracts, dec(197, 18), gasPrice = GAS_PRICE)
     const emittedETHFee_2 = toBN((await th.getEmittedRedemptionValues(redemptionTx_2))[3])
     assert.isTrue(emittedETHFee_2.gt(toBN('0')))

    // F draws debt
    const borrowingTx_1 = await borrowerOperations.withdrawNECT(th._100pct, dec(104, 18), F, F, {from: F})
    const emittedNECTFee_1 = toBN(th.getNECTFeeFromNECTBorrowingEvent(borrowingTx_1))
    assert.isTrue(emittedNECTFee_1.gt(toBN('0')))

    // G draws debt
    const borrowingTx_2 = await borrowerOperations.withdrawNECT(th._100pct, dec(17, 18), G, G, {from: G})
    const emittedNECTFee_2 = toBN(th.getNECTFeeFromNECTBorrowingEvent(borrowingTx_2))
    assert.isTrue(emittedNECTFee_2.gt(toBN('0')))

    // D obtains POLLEN from owner and makes a stake
    await pollenToken.transfer(D, dec(50, 18), {from: multisig})
    await pollenToken.approve(pollenStaking.address, dec(50, 18), {from: D})
    await pollenStaking.stake(dec(50, 18), {from: D})

    // Confirm staking contract holds 650 POLLEN
    assert.equal(await pollenToken.balanceOf(pollenStaking.address), dec(650, 18))
    assert.equal(await pollenStaking.totalPOLLENStaked(), dec(650, 18))

     // G redeems
     const redemptionTx_3 = await th.redeemCollateralAndGetTxObject(C, contracts, dec(197, 18), gasPrice = GAS_PRICE)
     const emittedETHFee_3 = toBN((await th.getEmittedRedemptionValues(redemptionTx_3))[3])
     assert.isTrue(emittedETHFee_3.gt(toBN('0')))

     // G draws debt
    const borrowingTx_3 = await borrowerOperations.withdrawNECT(th._100pct, dec(17, 18), G, G, {from: G})
    const emittedNECTFee_3 = toBN(th.getNECTFeeFromNECTBorrowingEvent(borrowingTx_3))
    assert.isTrue(emittedNECTFee_3.gt(toBN('0')))
     
    /*  
    Expected rewards:

    A_ETH: (100* ETHFee_1)/600 + (100* ETHFee_2)/600 + (100*ETH_Fee_3)/650
    B_ETH: (200* ETHFee_1)/600 + (200* ETHFee_2)/600 + (200*ETH_Fee_3)/650
    C_ETH: (300* ETHFee_1)/600 + (300* ETHFee_2)/600 + (300*ETH_Fee_3)/650
    D_ETH:                                             (100*ETH_Fee_3)/650

    A_NECT: (100*NECTFee_1 )/600 + (100* NECTFee_2)/600 + (100*NECTFee_3)/650
    B_NECT: (200* NECTFee_1)/600 + (200* NECTFee_2)/600 + (200*NECTFee_3)/650
    C_NECT: (300* NECTFee_1)/600 + (300* NECTFee_2)/600 + (300*NECTFee_3)/650
    D_NECT:                                               (100*NECTFee_3)/650
    */

    // Expected ETH gains
    const expectedETHGain_A = toBN('100').mul(emittedETHFee_1).div( toBN('600'))
                            .add(toBN('100').mul(emittedETHFee_2).div( toBN('600')))
                            .add(toBN('100').mul(emittedETHFee_3).div( toBN('650')))

    const expectedETHGain_B = toBN('200').mul(emittedETHFee_1).div( toBN('600'))
                            .add(toBN('200').mul(emittedETHFee_2).div( toBN('600')))
                            .add(toBN('200').mul(emittedETHFee_3).div( toBN('650')))

    const expectedETHGain_C = toBN('300').mul(emittedETHFee_1).div( toBN('600'))
                            .add(toBN('300').mul(emittedETHFee_2).div( toBN('600')))
                            .add(toBN('300').mul(emittedETHFee_3).div( toBN('650')))

    const expectedETHGain_D = toBN('50').mul(emittedETHFee_3).div( toBN('650'))

    // Expected NECT gains:
    const expectedNECTGain_A = toBN('100').mul(emittedNECTFee_1).div( toBN('600'))
                            .add(toBN('100').mul(emittedNECTFee_2).div( toBN('600')))
                            .add(toBN('100').mul(emittedNECTFee_3).div( toBN('650')))

    const expectedNECTGain_B = toBN('200').mul(emittedNECTFee_1).div( toBN('600'))
                            .add(toBN('200').mul(emittedNECTFee_2).div( toBN('600')))
                            .add(toBN('200').mul(emittedNECTFee_3).div( toBN('650')))

    const expectedNECTGain_C = toBN('300').mul(emittedNECTFee_1).div( toBN('600'))
                            .add(toBN('300').mul(emittedNECTFee_2).div( toBN('600')))
                            .add(toBN('300').mul(emittedNECTFee_3).div( toBN('650')))
    
    const expectedNECTGain_D = toBN('50').mul(emittedNECTFee_3).div( toBN('650'))


    const A_ETHBalance_Before = toBN(await web3.eth.getBalance(A))
    const A_NECTBalance_Before = toBN(await nectToken.balanceOf(A))
    const B_ETHBalance_Before = toBN(await web3.eth.getBalance(B))
    const B_NECTBalance_Before = toBN(await nectToken.balanceOf(B))
    const C_ETHBalance_Before = toBN(await web3.eth.getBalance(C))
    const C_NECTBalance_Before = toBN(await nectToken.balanceOf(C))
    const D_ETHBalance_Before = toBN(await web3.eth.getBalance(D))
    const D_NECTBalance_Before = toBN(await nectToken.balanceOf(D))

    // A-D un-stake
    const A_GAS_Used = th.gasUsed(await pollenStaking.unstake(dec(100, 18), {from: A, gasPrice: GAS_PRICE }))
    const B_GAS_Used = th.gasUsed(await pollenStaking.unstake(dec(200, 18), {from: B, gasPrice: GAS_PRICE }))
    const C_GAS_Used = th.gasUsed(await pollenStaking.unstake(dec(400, 18), {from: C, gasPrice: GAS_PRICE }))
    const D_GAS_Used = th.gasUsed(await pollenStaking.unstake(dec(50, 18), {from: D, gasPrice: GAS_PRICE }))

    // Confirm all depositors could withdraw

    //Confirm pool Size is now 0
    assert.equal((await pollenToken.balanceOf(pollenStaking.address)), '0')
    assert.equal((await pollenStaking.totalPOLLENStaked()), '0')

    // Get A-D ETH and NECT balances
    const A_ETHBalance_After = toBN(await web3.eth.getBalance(A))
    const A_NECTBalance_After = toBN(await nectToken.balanceOf(A))
    const B_ETHBalance_After = toBN(await web3.eth.getBalance(B))
    const B_NECTBalance_After = toBN(await nectToken.balanceOf(B))
    const C_ETHBalance_After = toBN(await web3.eth.getBalance(C))
    const C_NECTBalance_After = toBN(await nectToken.balanceOf(C))
    const D_ETHBalance_After = toBN(await web3.eth.getBalance(D))
    const D_NECTBalance_After = toBN(await nectToken.balanceOf(D))

    // Get ETH and NECT gains
    const A_ETHGain = A_ETHBalance_After.sub(A_ETHBalance_Before).add(toBN(A_GAS_Used * GAS_PRICE))
    const A_NECTGain = A_NECTBalance_After.sub(A_NECTBalance_Before)
    const B_ETHGain = B_ETHBalance_After.sub(B_ETHBalance_Before).add(toBN(B_GAS_Used * GAS_PRICE))
    const B_NECTGain = B_NECTBalance_After.sub(B_NECTBalance_Before)
    const C_ETHGain = C_ETHBalance_After.sub(C_ETHBalance_Before).add(toBN(C_GAS_Used * GAS_PRICE))
    const C_NECTGain = C_NECTBalance_After.sub(C_NECTBalance_Before)
    const D_ETHGain = D_ETHBalance_After.sub(D_ETHBalance_Before).add(toBN(D_GAS_Used * GAS_PRICE))
    const D_NECTGain = D_NECTBalance_After.sub(D_NECTBalance_Before)

    // Check gains match expected amounts
    assert.isAtMost(th.getDifference(expectedETHGain_A, A_ETHGain), 1000)
    assert.isAtMost(th.getDifference(expectedNECTGain_A, A_NECTGain), 1000)
    assert.isAtMost(th.getDifference(expectedETHGain_B, B_ETHGain), 1000)
    assert.isAtMost(th.getDifference(expectedNECTGain_B, B_NECTGain), 1000)
    assert.isAtMost(th.getDifference(expectedETHGain_C, C_ETHGain), 1000)
    assert.isAtMost(th.getDifference(expectedNECTGain_C, C_NECTGain), 1000)
    assert.isAtMost(th.getDifference(expectedETHGain_D, D_ETHGain), 1000)
    assert.isAtMost(th.getDifference(expectedNECTGain_D, D_NECTGain), 1000)
  })
 
  it("unstake(): reverts if caller has ETH gains and can't receive ETH",  async () => {
    await openTrove({ extraNECTAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: whale } })  
    await openTrove({ extraNECTAmount: toBN(dec(20000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ extraNECTAmount: toBN(dec(30000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ extraNECTAmount: toBN(dec(40000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: C } })
    await openTrove({ extraNECTAmount: toBN(dec(50000, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: D } })

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

    // multisig transfers POLLEN to staker A and the non-payable proxy
    await pollenToken.transfer(A, dec(100, 18), {from: multisig})
    await pollenToken.transfer(nonPayable.address, dec(100, 18), {from: multisig})

    //  A makes stake
    const A_stakeTx = await pollenStaking.stake(dec(100, 18), {from: A})
    assert.isTrue(A_stakeTx.receipt.status)

    //  A tells proxy to make a stake
    const proxystakeTxData = await th.getTransactionData('stake(uint256)', ['0x56bc75e2d63100000'])  // proxy stakes 100 POLLEN
    await nonPayable.forward(pollenStaking.address, proxystakeTxData, {from: A})


    // B makes a redemption, creating ETH gain for proxy
    const redemptionTx_1 = await th.redeemCollateralAndGetTxObject(B, contracts, dec(45, 18), gasPrice = GAS_PRICE)
    
    const proxy_ETHGain = await pollenStaking.getPendingETHGain(nonPayable.address)
    assert.isTrue(proxy_ETHGain.gt(toBN('0')))

    // Expect this tx to revert: stake() tries to send nonPayable proxy's accumulated ETH gain (albeit 0),
    //  A tells proxy to unstake
    const proxyUnStakeTxData = await th.getTransactionData('unstake(uint256)', ['0x56bc75e2d63100000'])  // proxy stakes 100 POLLEN
    const proxyUnstakeTxPromise = nonPayable.forward(pollenStaking.address, proxyUnStakeTxData, {from: A})
   
    // but nonPayable proxy can not accept ETH - therefore stake() reverts.
    await assertRevert(proxyUnstakeTxPromise)
  })

  it("receive(): reverts when it receives ETH from an address that is not the Active Pool",  async () => { 
    const ethSendTxPromise1 = web3.eth.sendTransaction({to: pollenStaking.address, from: A, value: dec(1, 'ether')})
    const ethSendTxPromise2 = web3.eth.sendTransaction({to: pollenStaking.address, from: owner, value: dec(1, 'ether')})

    await assertRevert(ethSendTxPromise1)
    await assertRevert(ethSendTxPromise2)
  })

  it("unstake(): reverts if user has no stake",  async () => {  
    const unstakeTxPromise1 = pollenStaking.unstake(1, {from: A})
    const unstakeTxPromise2 = pollenStaking.unstake(1, {from: owner})

    await assertRevert(unstakeTxPromise1)
    await assertRevert(unstakeTxPromise2)
  })

  it('Test requireCallerIsTroveManager', async () => {
    const pollenStakingTester = await POLLENStakingTester.new()
    await assertRevert(pollenStakingTester.requireCallerIsTroveManager(), 'POLLENStaking: caller is not TroveM')
  })
})
