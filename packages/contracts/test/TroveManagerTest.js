const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")
const TroveManagerTester = artifacts.require("./TroveManagerTester.sol")
const NECTTokenTester = artifacts.require("./NECTTokenTester.sol")

const th = testHelpers.TestHelper
const dec = th.dec
const toBN = th.toBN
const assertRevert = th.assertRevert
const mv = testHelpers.MoneyValues
const timeValues = testHelpers.TimeValues

const GAS_PRICE = 10000000


/* NOTE: Some tests involving iBGT redemption fees do not test for specific fee values.
 * Some only test that the fees are non-zero when they should occur.
 *
 * Specific iBGT gain values will depend on the final fee schedule used, and the final choices for
 * the parameter BETA in the TroveManager, which is still TBD based on economic modelling.
 * 
 */ 
contract('TroveManager', async accounts => {

  const _18_zeros = '000000000000000000'
  const ZERO_ADDRESS = th.ZERO_ADDRESS

  const [
    owner,
    alice, bob, carol, dennis, erin, flyn, graham, harriet, ida,
    defaulter_1, defaulter_2, defaulter_3, defaulter_4, whale,
    A, B, C, D, E] = accounts;

    const [bountyAddress, lpRewardsAddress, multisig] = accounts.slice(997, 1000)

  let priceFeed
  let nectToken
  let sortedTroves
  let troveManager
  let activePool
  let stabilityPool
  let collSurplusPool
  let defaultPool
  let borrowerOperations
  let hintHelpers

  let contracts
  let iBGTToken

  const getOpenTroveTotalDebt = async (nectAmount) => th.getOpenTroveTotalDebt(contracts, nectAmount)
  const getOpenTroveNECTAmount = async (totalDebt) => th.getOpenTroveNECTAmount(contracts, totalDebt)
  const getActualDebtFromComposite = async (compositeDebt) => th.getActualDebtFromComposite(compositeDebt, contracts)
  const getNetBorrowingAmount = async (debtWithFee) => th.getNetBorrowingAmount(contracts, debtWithFee)
  const openTrove = async (params) => th.openTrove(contracts, params)
  const withdrawNECT = async (params) => th.withdrawNECT(contracts, params)

  beforeEach(async () => {
    contracts = await deploymentHelper.deployBeraBorrowCore()
    contracts.troveManager = await TroveManagerTester.new()
    contracts.nectToken = await NECTTokenTester.new(
      contracts.troveManager.address,
      contracts.stabilityPool.address,
      contracts.borrowerOperations.address
    )
    const POLLENContracts = await deploymentHelper.deployPOLLENContracts(bountyAddress, lpRewardsAddress, multisig)

    priceFeed = contracts.priceFeedTestnet
    nectToken = contracts.nectToken
    sortedTroves = contracts.sortedTroves
    troveManager = contracts.troveManager
    activePool = contracts.activePool
    stabilityPool = contracts.stabilityPool
    defaultPool = contracts.defaultPool
    collSurplusPool = contracts.collSurplusPool
    borrowerOperations = contracts.borrowerOperations
    hintHelpers = contracts.hintHelpers
    iBGTToken = contracts.iBGTToken

    pollenStaking = POLLENContracts.pollenStaking
    pollenToken = POLLENContracts.pollenToken
    communityIssuance = POLLENContracts.communityIssuance
    lockupContractFactory = POLLENContracts.lockupContractFactory

    await deploymentHelper.connectCoreContracts(contracts, POLLENContracts)
    await deploymentHelper.connectPOLLENContracts(POLLENContracts)
    await deploymentHelper.connectPOLLENContractsToCore(POLLENContracts, contracts)
  })

  const borrowerOperationsOpenTrove = async(maxFeePercentage, extraNECTAmount,upperHint, lowerHint, ibgtAmount, extraParams) => {
    try{
      await iBGTToken.mint(extraParams.from, ibgtAmount.toString())
    }catch (e){
      console.log ("iBGT Token minting failed", e)
    }
    try {
      await iBGTToken.increaseAllowance(extraParams.from, borrowerOperations.address, ibgtAmount.toString())
    }catch (e) {
      console.log ("Approve failed.", e)
    }

    // const tx = await contracts.borrowerOperations.openTrove(maxFeePercentage, nectAmount, upperHint, lowerHint, extraParams)
    try {
      const tx = await borrowerOperations.openTrove(maxFeePercentage, extraNECTAmount, upperHint, lowerHint, ibgtAmount, extraParams)
      return tx
    }catch(e){
      throw e
    }
  }

  it('liquidate(): closes a Trove that has ICR < MCR', async () => {
    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })
    await openTrove({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })

    const price = await priceFeed.getPrice()
    const ICR_Before = await troveManager.getCurrentICR(alice, price)
    assert.equal(ICR_Before, dec(4, 18))

    const MCR = (await troveManager.MCR()).toString()
    assert.equal(MCR.toString(), '1100000000000000000')

    // Alice increases debt to 180 NECT, lowering her ICR to 1.11
    const A_NECTWithdrawal = await getNetBorrowingAmount(dec(130, 18))

    const targetICR = toBN('1111111111111111111')
    await withdrawNECT({ ICR: targetICR, extraParams: { from: alice } })

    const ICR_AfterWithdrawal = await troveManager.getCurrentICR(alice, price)
    assert.isAtMost(th.getDifference(ICR_AfterWithdrawal, targetICR), 100)

    // price drops to 1iBGT:100NECT, reducing Alice's ICR below MCR
    await priceFeed.setPrice('100000000000000000000');

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // close Trove
    await troveManager.liquidate(alice, { from: owner });

    // check the Trove is successfully closed, and removed from sortedList
    const status = (await troveManager.Troves(alice))[3]
    assert.equal(status, 3)  // status enum 3 corresponds to "Closed by liquidation"
    const alice_Trove_isInSortedList = await sortedTroves.contains(alice)
    assert.isFalse(alice_Trove_isInSortedList)
  })

  it("liquidate(): decreases ActivePool iBGT and NECTDebt by correct amounts", async () => {
    // --- SETUP ---
    const { collateral: A_collateral, totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })
    const { collateral: B_collateral, totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(21, 17)), extraParams: { from: bob } })

    // --- TEST ---

    // check ActivePool iBGT and NECT debt before
    const activePool_iBGT_Before = (await activePool.getiBGT()).toString()
    const activePool_RawiBgt_Before = (await iBGTToken.balanceOf(activePool.address)).toString()
    const activePool_NECTDebt_Before = (await activePool.getNECTDebt()).toString()

    assert.equal(activePool_iBGT_Before, A_collateral.add(B_collateral))
    assert.equal(activePool_RawiBgt_Before, A_collateral.add(B_collateral))
    th.assertIsApproximatelyEqual(activePool_NECTDebt_Before, A_totalDebt.add(B_totalDebt))

    // price drops to 1iBGT:100NECT, reducing Bob's ICR below MCR
    await priceFeed.setPrice('100000000000000000000');

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    /* close Bob's Trove. Should liquidate his ether and NECT, 
    leaving Alice’s ether and NECT debt in the ActivePool. */
    await troveManager.liquidate(bob, { from: owner });

    // check ActivePool iBGT and NECT debt 
    const activePool_iBGT_After = (await activePool.getiBGT()).toString()
    const activePool_RawiBgt_After = (await iBGTToken.balanceOf(activePool.address)).toString()
    const activePool_NECTDebt_After = (await activePool.getNECTDebt()).toString()

    assert.equal(activePool_iBGT_After, A_collateral)
    assert.equal(activePool_RawiBgt_After, A_collateral)
    th.assertIsApproximatelyEqual(activePool_NECTDebt_After, A_totalDebt)
  })

  it("liquidate(): increases DefaultPool iBGT and NECT debt by correct amounts", async () => {
    // --- SETUP ---
    const { collateral: A_collateral, totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })
    const { collateral: B_collateral, totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(21, 17)), extraParams: { from: bob } })

    // --- TEST ---

    // check DefaultPool iBGT and NECT debt before
    const defaultPool_iBGT_Before = (await defaultPool.getiBGT())
    const defaultPool_RawiBgt_Before = (await iBGTToken.balanceOf(defaultPool.address)).toString()
    const defaultPool_NECTDebt_Before = (await defaultPool.getNECTDebt()).toString()

    assert.equal(defaultPool_iBGT_Before, '0')
    assert.equal(defaultPool_RawiBgt_Before, '0')
    assert.equal(defaultPool_NECTDebt_Before, '0')

    // price drops to 1iBGT:100NECT, reducing Bob's ICR below MCR
    await priceFeed.setPrice('100000000000000000000');

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // close Bob's Trove
    await troveManager.liquidate(bob, { from: owner });

    // check after
    const defaultPool_iBGT_After = (await defaultPool.getiBGT()).toString()
    const defaultPool_RawiBgt_After = (await iBGTToken.balanceOf(defaultPool.address)).toString()
    const defaultPool_NECTDebt_After = (await defaultPool.getNECTDebt()).toString()

    const defaultPool_iBGT = th.applyLiquidationFee(B_collateral)
    assert.equal(defaultPool_iBGT_After, defaultPool_iBGT)
    assert.equal(defaultPool_RawiBgt_After, defaultPool_iBGT)
    th.assertIsApproximatelyEqual(defaultPool_NECTDebt_After, B_totalDebt)
  })

  it("liquidate(): removes the Trove's stake from the total stakes", async () => {
    // --- SETUP ---
    const { collateral: A_collateral, totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })
    const { collateral: B_collateral, totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(21, 17)), extraParams: { from: bob } })

    // --- TEST ---

    // check totalStakes before
    const totalStakes_Before = (await troveManager.totalStakes()).toString()
    assert.equal(totalStakes_Before, A_collateral.add(B_collateral))

    // price drops to 1iBGT:100NECT, reducing Bob's ICR below MCR
    await priceFeed.setPrice('100000000000000000000');

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Close Bob's Trove
    await troveManager.liquidate(bob, { from: owner });

    // check totalStakes after
    const totalStakes_After = (await troveManager.totalStakes()).toString()
    assert.equal(totalStakes_After, A_collateral)
  })

  it("liquidate(): Removes the correct trove from the TroveOwners array, and moves the last array element to the new empty slot", async () => {
    // --- SETUP --- 
    await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } })

    // Alice, Bob, Carol, Dennis, Erin open troves with consecutively decreasing collateral ratio
    await openTrove({ ICR: toBN(dec(218, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(216, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(214, 16)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(212, 16)), extraParams: { from: dennis } })
    await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: erin } })

    // At this stage, TroveOwners array should be: [W, A, B, C, D, E] 

    // Drop price
    await priceFeed.setPrice(dec(100, 18))

    const arrayLength_Before = await troveManager.getTroveOwnersCount()
    assert.equal(arrayLength_Before, 6)

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Liquidate carol
    await troveManager.liquidate(carol)

    // Check Carol no longer has an active trove
    assert.isFalse(await sortedTroves.contains(carol))

    // Check length of array has decreased by 1
    const arrayLength_After = await troveManager.getTroveOwnersCount()
    assert.equal(arrayLength_After, 5)

    /* After Carol is removed from array, the last element (Erin's address) should have been moved to fill 
    the empty slot left by Carol, and the array length decreased by one.  The final TroveOwners array should be:
  
    [W, A, B, E, D] 

    Check all remaining troves in the array are in the correct order */
    const trove_0 = await troveManager.TroveOwners(0)
    const trove_1 = await troveManager.TroveOwners(1)
    const trove_2 = await troveManager.TroveOwners(2)
    const trove_3 = await troveManager.TroveOwners(3)
    const trove_4 = await troveManager.TroveOwners(4)

    assert.equal(trove_0, whale)
    assert.equal(trove_1, alice)
    assert.equal(trove_2, bob)
    assert.equal(trove_3, erin)
    assert.equal(trove_4, dennis)

    // Check correct indices recorded on the active trove structs
    const whale_arrayIndex = (await troveManager.Troves(whale))[4]
    const alice_arrayIndex = (await troveManager.Troves(alice))[4]
    const bob_arrayIndex = (await troveManager.Troves(bob))[4]
    const dennis_arrayIndex = (await troveManager.Troves(dennis))[4]
    const erin_arrayIndex = (await troveManager.Troves(erin))[4]

    // [W, A, B, E, D] 
    assert.equal(whale_arrayIndex, 0)
    assert.equal(alice_arrayIndex, 1)
    assert.equal(bob_arrayIndex, 2)
    assert.equal(erin_arrayIndex, 3)
    assert.equal(dennis_arrayIndex, 4)
  })

  it("liquidate(): updates the snapshots of total stakes and total collateral", async () => {
    // --- SETUP ---
    const { collateral: A_collateral, totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })
    const { collateral: B_collateral, totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(21, 17)), extraParams: { from: bob } })

    // --- TEST ---

    // check snapshots before 
    const totalStakesSnapshot_Before = (await troveManager.totalStakesSnapshot()).toString()
    const totalCollateralSnapshot_Before = (await troveManager.totalCollateralSnapshot()).toString()
    assert.equal(totalStakesSnapshot_Before, '0')
    assert.equal(totalCollateralSnapshot_Before, '0')

    // price drops to 1iBGT:100NECT, reducing Bob's ICR below MCR
    await priceFeed.setPrice('100000000000000000000');

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // close Bob's Trove.  His ibgt*0.995 and NECT should be added to the DefaultPool.
    await troveManager.liquidate(bob, { from: owner });

    /* check snapshots after. Total stakes should be equal to the  remaining stake then the system: 
    10 ibgt, Alice's stake.
     
    Total collateral should be equal to Alice's collateral plus her pending iBGT reward (Bob’s collaterale*0.995 ibgt), earned
    from the liquidation of Bob's Trove */
    const totalStakesSnapshot_After = (await troveManager.totalStakesSnapshot()).toString()
    const totalCollateralSnapshot_After = (await troveManager.totalCollateralSnapshot()).toString()

    assert.equal(totalStakesSnapshot_After, A_collateral)
    assert.equal(totalCollateralSnapshot_After, A_collateral.add(th.applyLiquidationFee(B_collateral)))
  })

  it("liquidate(): updates the L_iBGT and L_NECTDebt reward-per-unit-staked totals", async () => {
    // --- SETUP ---
    const { collateral: A_collateral, totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(8, 18)), extraParams: { from: alice } })
    const { collateral: B_collateral, totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(4, 18)), extraParams: { from: bob } })
    const { collateral: C_collateral, totalDebt: C_totalDebt } = await openTrove({ ICR: toBN(dec(111, 16)), extraParams: { from: carol } })

    // --- TEST ---

    // price drops to 1iBGT:100NECT, reducing Carols's ICR below MCR
    await priceFeed.setPrice('100000000000000000000');

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // close Carol's Trove.  
    assert.isTrue(await sortedTroves.contains(carol))
    await troveManager.liquidate(carol, { from: owner });
    assert.isFalse(await sortedTroves.contains(carol))

    // Carol's ibgt*0.995 and NECT should be added to the DefaultPool.
    const L_iBGT_AfterCarolLiquidated = await troveManager.L_iBGT()
    const L_NECTDebt_AfterCarolLiquidated = await troveManager.L_NECTDebt()

    const L_iBGT_expected_1 = th.applyLiquidationFee(C_collateral).mul(mv._1e18BN).div(A_collateral.add(B_collateral))
    const L_NECTDebt_expected_1 = C_totalDebt.mul(mv._1e18BN).div(A_collateral.add(B_collateral))
    assert.isAtMost(th.getDifference(L_iBGT_AfterCarolLiquidated, L_iBGT_expected_1), 100)
    assert.isAtMost(th.getDifference(L_NECTDebt_AfterCarolLiquidated, L_NECTDebt_expected_1), 100)

    // Bob now withdraws NECT, bringing his ICR to 1.11
    const { increasedTotalDebt: B_increasedTotalDebt } = await withdrawNECT({ ICR: toBN(dec(111, 16)), extraParams: { from: bob } })

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // price drops to 1iBGT:50NECT, reducing Bob's ICR below MCR
    await priceFeed.setPrice(dec(50, 18));
    const price = await priceFeed.getPrice()

    // close Bob's Trove 
    assert.isTrue(await sortedTroves.contains(bob))
    await troveManager.liquidate(bob, { from: owner });
    assert.isFalse(await sortedTroves.contains(bob))

    /* Alice now has all the active stake. totalStakes in the system is now 10 ibgt.
   
   Bob's pending collateral reward and debt reward are applied to his Trove
   before his liquidation.
   His total collateral*0.995 and debt are then added to the DefaultPool. 
   
   The system rewards-per-unit-staked should now be:
   
   L_iBGT = (0.995 / 20) + (10.4975*0.995  / 10) = 1.09425125 iBGT
   L_NECTDebt = (180 / 20) + (890 / 10) = 98 NECT */
    const L_iBGT_AfterBobLiquidated = await troveManager.L_iBGT()
    const L_NECTDebt_AfterBobLiquidated = await troveManager.L_NECTDebt()

    const L_iBGT_expected_2 = L_iBGT_expected_1.add(th.applyLiquidationFee(B_collateral.add(B_collateral.mul(L_iBGT_expected_1).div(mv._1e18BN))).mul(mv._1e18BN).div(A_collateral))
    const L_NECTDebt_expected_2 = L_NECTDebt_expected_1.add(B_totalDebt.add(B_increasedTotalDebt).add(B_collateral.mul(L_NECTDebt_expected_1).div(mv._1e18BN)).mul(mv._1e18BN).div(A_collateral))
    assert.isAtMost(th.getDifference(L_iBGT_AfterBobLiquidated, L_iBGT_expected_2), 100)
    assert.isAtMost(th.getDifference(L_NECTDebt_AfterBobLiquidated, L_NECTDebt_expected_2), 100)
  })

  it("liquidate(): Liquidates undercollateralized trove if there are two troves in the system", async () => {
    await openTrove({ ICR: toBN(dec(200, 18)), extraParams: { from: bob, value: dec(100, 'ether') } })

    // Alice creates a single trove with 0.7 iBGT and a debt of 70 NECT, and provides 10 NECT to SP
    const { collateral: A_collateral, totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: alice } })

    // Alice proves 10 NECT to SP
    await stabilityPool.provideToSP(dec(10, 18), ZERO_ADDRESS, { from: alice })

    // Set iBGT:USD price to 105
    await priceFeed.setPrice('105000000000000000000')
    const price = await priceFeed.getPrice()

    assert.isFalse(await th.checkRecoveryMode(contracts))

    const alice_ICR = (await troveManager.getCurrentICR(alice, price)).toString()
    assert.equal(alice_ICR, '1050000000000000000')

    const activeTrovesCount_Before = await troveManager.getTroveOwnersCount()

    assert.equal(activeTrovesCount_Before, 2)

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Liquidate the trove
    await troveManager.liquidate(alice, { from: owner })

    // Check Alice's trove is removed, and bob remains
    const activeTrovesCount_After = await troveManager.getTroveOwnersCount()
    assert.equal(activeTrovesCount_After, 1)

    const alice_isInSortedList = await sortedTroves.contains(alice)
    assert.isFalse(alice_isInSortedList)

    const bob_isInSortedList = await sortedTroves.contains(bob)
    assert.isTrue(bob_isInSortedList)
  })

  it("liquidate(): reverts if trove is non-existent", async () => {
    await openTrove({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(21, 17)), extraParams: { from: bob } })

    assert.equal(await troveManager.getTroveStatus(carol), 0) // check trove non-existent

    assert.isFalse(await sortedTroves.contains(carol))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    try {
      const txCarol = await troveManager.liquidate(carol)

      assert.isFalse(txCarol.receipt.status)
    } catch (err) {
      assert.include(err.message, "revert")
      assert.include(err.message, "Trove does not exist or is closed")
    }
  })

  it("liquidate(): reverts if trove has been closed", async () => {
    await openTrove({ ICR: toBN(dec(8, 18)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(4, 18)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: carol } })

    assert.isTrue(await sortedTroves.contains(carol))

    // price drops, Carol ICR falls below MCR
    await priceFeed.setPrice(dec(100, 18))

    // Carol liquidated, and her trove is closed
    const txCarol_L1 = await troveManager.liquidate(carol)
    assert.isTrue(txCarol_L1.receipt.status)

    assert.isFalse(await sortedTroves.contains(carol))

    assert.equal(await troveManager.getTroveStatus(carol), 3)  // check trove closed by liquidation

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    try {
      const txCarol_L2 = await troveManager.liquidate(carol)

      assert.isFalse(txCarol_L2.receipt.status)
    } catch (err) {
      assert.include(err.message, "revert")
      assert.include(err.message, "Trove does not exist or is closed")
    }
  })

  it("liquidate(): does nothing if trove has >= 110% ICR", async () => {
    await openTrove({ ICR: toBN(dec(3, 18)), extraParams: { from: whale } })
    await openTrove({ ICR: toBN(dec(3, 18)), extraParams: { from: bob } })

    const TCR_Before = (await th.getTCR(contracts)).toString()
    const listSize_Before = (await sortedTroves.getSize()).toString()

    const price = await priceFeed.getPrice()

    // Check Bob's ICR > 110%
    const bob_ICR = await troveManager.getCurrentICR(bob, price)
    assert.isTrue(bob_ICR.gte(mv._MCR))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Attempt to liquidate bob
    await assertRevert(troveManager.liquidate(bob), "TroveManager: nothing to liquidate")

    // Check bob active, check whale active
    assert.isTrue((await sortedTroves.contains(bob)))
    assert.isTrue((await sortedTroves.contains(whale)))

    const TCR_After = (await th.getTCR(contracts)).toString()
    const listSize_After = (await sortedTroves.getSize()).toString()

    assert.equal(TCR_Before, TCR_After)
    assert.equal(listSize_Before, listSize_After)
  })

  it("liquidate(): Given the same price and no other trove changes, complete Pool offsets restore the TCR to its value prior to the defaulters opening troves", async () => {
    // Whale provides NECT to SP
    const spDeposit = toBN(dec(100, 24))
    await openTrove({ ICR: toBN(dec(4, 18)), extraNECTAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(70, 18)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(200, 18)), extraParams: { from: dennis } })

    const TCR_Before = (await th.getTCR(contracts)).toString()

    await openTrove({ ICR: toBN(dec(202, 16)), extraParams: { from: defaulter_1 } })
    await openTrove({ ICR: toBN(dec(190, 16)), extraParams: { from: defaulter_2 } })
    await openTrove({ ICR: toBN(dec(196, 16)), extraParams: { from: defaulter_3 } })
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_4 } })

    assert.isTrue((await sortedTroves.contains(defaulter_1)))
    assert.isTrue((await sortedTroves.contains(defaulter_2)))
    assert.isTrue((await sortedTroves.contains(defaulter_3)))
    assert.isTrue((await sortedTroves.contains(defaulter_4)))

    // Price drop
    await priceFeed.setPrice(dec(100, 18))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // All defaulters liquidated
    await troveManager.liquidate(defaulter_1)
    assert.isFalse((await sortedTroves.contains(defaulter_1)))

    await troveManager.liquidate(defaulter_2)
    assert.isFalse((await sortedTroves.contains(defaulter_2)))

    await troveManager.liquidate(defaulter_3)
    assert.isFalse((await sortedTroves.contains(defaulter_3)))

    await troveManager.liquidate(defaulter_4)
    assert.isFalse((await sortedTroves.contains(defaulter_4)))

    // Price bounces back
    await priceFeed.setPrice(dec(200, 18))

    const TCR_After = (await th.getTCR(contracts)).toString()
    assert.equal(TCR_Before, TCR_After)
  })


  it("liquidate(): Pool offsets increase the TCR", async () => {
    // Whale provides NECT to SP
    const spDeposit = toBN(dec(100, 24))
    await openTrove({ ICR: toBN(dec(4, 18)), extraNECTAmount: spDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(70, 18)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(200, 18)), extraParams: { from: dennis } })

    await openTrove({ ICR: toBN(dec(202, 16)), extraParams: { from: defaulter_1 } })
    await openTrove({ ICR: toBN(dec(190, 16)), extraParams: { from: defaulter_2 } })
    await openTrove({ ICR: toBN(dec(196, 16)), extraParams: { from: defaulter_3 } })
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_4 } })

    assert.isTrue((await sortedTroves.contains(defaulter_1)))
    assert.isTrue((await sortedTroves.contains(defaulter_2)))
    assert.isTrue((await sortedTroves.contains(defaulter_3)))
    assert.isTrue((await sortedTroves.contains(defaulter_4)))

    await priceFeed.setPrice(dec(100, 18))

    const TCR_1 = await th.getTCR(contracts)

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Check TCR improves with each liquidation that is offset with Pool
    await troveManager.liquidate(defaulter_1)
    assert.isFalse((await sortedTroves.contains(defaulter_1)))
    const TCR_2 = await th.getTCR(contracts)
    assert.isTrue(TCR_2.gte(TCR_1))

    await troveManager.liquidate(defaulter_2)
    assert.isFalse((await sortedTroves.contains(defaulter_2)))
    const TCR_3 = await th.getTCR(contracts)
    assert.isTrue(TCR_3.gte(TCR_2))

    await troveManager.liquidate(defaulter_3)
    assert.isFalse((await sortedTroves.contains(defaulter_3)))
    const TCR_4 = await th.getTCR(contracts)
    assert.isTrue(TCR_4.gte(TCR_3))

    await troveManager.liquidate(defaulter_4)
    assert.isFalse((await sortedTroves.contains(defaulter_4)))
    const TCR_5 = await th.getTCR(contracts)
    assert.isTrue(TCR_5.gte(TCR_4))
  })

  it("liquidate(): a pure redistribution reduces the TCR only as a result of compensation", async () => {
    await openTrove({ ICR: toBN(dec(4, 18)), extraParams: { from: whale } })

    await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(70, 18)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(200, 18)), extraParams: { from: dennis } })

    await openTrove({ ICR: toBN(dec(202, 16)), extraParams: { from: defaulter_1 } })
    await openTrove({ ICR: toBN(dec(190, 16)), extraParams: { from: defaulter_2 } })
    await openTrove({ ICR: toBN(dec(196, 16)), extraParams: { from: defaulter_3 } })
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_4 } })

    assert.isTrue((await sortedTroves.contains(defaulter_1)))
    assert.isTrue((await sortedTroves.contains(defaulter_2)))
    assert.isTrue((await sortedTroves.contains(defaulter_3)))
    assert.isTrue((await sortedTroves.contains(defaulter_4)))

    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    const TCR_0 = await th.getTCR(contracts)

    const entireSystemCollBefore = await troveManager.getEntireSystemColl()
    const entireSystemDebtBefore = await troveManager.getEntireSystemDebt()

    const expectedTCR_0 = entireSystemCollBefore.mul(price).div(entireSystemDebtBefore)

    assert.isTrue(expectedTCR_0.eq(TCR_0))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Check TCR does not decrease with each liquidation 
    const liquidationTx_1 = await troveManager.liquidate(defaulter_1)
    const [liquidatedDebt_1, liquidatedColl_1, gasComp_1] = th.getEmittedLiquidationValues(liquidationTx_1)
    assert.isFalse((await sortedTroves.contains(defaulter_1)))
    const TCR_1 = await th.getTCR(contracts)

    // Expect only change to TCR to be due to the issued gas compensation
    const expectedTCR_1 = (entireSystemCollBefore
      .sub(gasComp_1))
      .mul(price)
      .div(entireSystemDebtBefore)

    assert.isTrue(expectedTCR_1.eq(TCR_1))

    const liquidationTx_2 = await troveManager.liquidate(defaulter_2)
    const [liquidatedDebt_2, liquidatedColl_2, gasComp_2] = th.getEmittedLiquidationValues(liquidationTx_2)
    assert.isFalse((await sortedTroves.contains(defaulter_2)))

    const TCR_2 = await th.getTCR(contracts)

    const expectedTCR_2 = (entireSystemCollBefore
      .sub(gasComp_1)
      .sub(gasComp_2))
      .mul(price)
      .div(entireSystemDebtBefore)

    assert.isTrue(expectedTCR_2.eq(TCR_2))

    const liquidationTx_3 = await troveManager.liquidate(defaulter_3)
    const [liquidatedDebt_3, liquidatedColl_3, gasComp_3] = th.getEmittedLiquidationValues(liquidationTx_3)
    assert.isFalse((await sortedTroves.contains(defaulter_3)))

    const TCR_3 = await th.getTCR(contracts)

    const expectedTCR_3 = (entireSystemCollBefore
      .sub(gasComp_1)
      .sub(gasComp_2)
      .sub(gasComp_3))
      .mul(price)
      .div(entireSystemDebtBefore)

    assert.isTrue(expectedTCR_3.eq(TCR_3))


    const liquidationTx_4 = await troveManager.liquidate(defaulter_4)
    const [liquidatedDebt_4, liquidatedColl_4, gasComp_4] = th.getEmittedLiquidationValues(liquidationTx_4)
    assert.isFalse((await sortedTroves.contains(defaulter_4)))

    const TCR_4 = await th.getTCR(contracts)

    const expectedTCR_4 = (entireSystemCollBefore
      .sub(gasComp_1)
      .sub(gasComp_2)
      .sub(gasComp_3)
      .sub(gasComp_4))
      .mul(price)
      .div(entireSystemDebtBefore)

    assert.isTrue(expectedTCR_4.eq(TCR_4))
  })

  it("liquidate(): does not affect the SP deposit or iBGT gain when called on an SP depositor's address that has no trove", async () => {
    await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    const spDeposit = toBN(dec(1, 24))
    await openTrove({ ICR: toBN(dec(3, 18)), extraNECTAmount: spDeposit, extraParams: { from: bob } })
    const { C_totalDebt, C_collateral } = await openTrove({ ICR: toBN(dec(218, 16)), extraNECTAmount: toBN(dec(100, 18)), extraParams: { from: carol } })

    // Bob sends tokens to Dennis, who has no trove
    await nectToken.transfer(dennis, spDeposit, { from: bob })

    //Dennis provides NECT to SP
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: dennis })

    // Carol gets liquidated
    await priceFeed.setPrice(dec(100, 18))
    const liquidationTX_C = await troveManager.liquidate(carol)
    const [liquidatedDebt, liquidatedColl, gasComp] = th.getEmittedLiquidationValues(liquidationTX_C)

    assert.isFalse(await sortedTroves.contains(carol))
    // Check Dennis' SP deposit has absorbed Carol's debt, and he has received her liquidated iBGT
    const dennis_Deposit_Before = (await stabilityPool.getCompoundedNECTDeposit(dennis)).toString()
    const dennis_iBGTGain_Before = (await stabilityPool.getDepositoriBGTGain(dennis)).toString()
    assert.isAtMost(th.getDifference(dennis_Deposit_Before, spDeposit.sub(liquidatedDebt)), 1000000)
    assert.isAtMost(th.getDifference(dennis_iBGTGain_Before, liquidatedColl), 1000)

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Attempt to liquidate Dennis
    try {
      const txDennis = await troveManager.liquidate(dennis)
      assert.isFalse(txDennis.receipt.status)
    } catch (err) {
      assert.include(err.message, "revert")
      assert.include(err.message, "Trove does not exist or is closed")
    }

    // Check Dennis' SP deposit does not change after liquidation attempt
    const dennis_Deposit_After = (await stabilityPool.getCompoundedNECTDeposit(dennis)).toString()
    const dennis_iBGTGain_After = (await stabilityPool.getDepositoriBGTGain(dennis)).toString()
    assert.equal(dennis_Deposit_Before, dennis_Deposit_After)
    assert.equal(dennis_iBGTGain_Before, dennis_iBGTGain_After)
  })

  it("liquidate(): does not liquidate a SP depositor's trove with ICR > 110%, and does not affect their SP deposit or iBGT gain", async () => {
    await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    const spDeposit = toBN(dec(1, 24))
    await openTrove({ ICR: toBN(dec(3, 18)), extraNECTAmount: spDeposit, extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(218, 16)), extraNECTAmount: toBN(dec(100, 18)), extraParams: { from: carol } })

    //Bob provides NECT to SP
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: bob })

    // Carol gets liquidated
    await priceFeed.setPrice(dec(100, 18))
    const liquidationTX_C = await troveManager.liquidate(carol)
    const [liquidatedDebt, liquidatedColl, gasComp] = th.getEmittedLiquidationValues(liquidationTX_C)
    assert.isFalse(await sortedTroves.contains(carol))

    // price bounces back - Bob's trove is >110% ICR again
    await priceFeed.setPrice(dec(200, 18))
    const price = await priceFeed.getPrice()
    assert.isTrue((await troveManager.getCurrentICR(bob, price)).gt(mv._MCR))

    // Check Bob' SP deposit has absorbed Carol's debt, and he has received her liquidated iBGT
    const bob_Deposit_Before = (await stabilityPool.getCompoundedNECTDeposit(bob)).toString()
    const bob_iBGTGain_Before = (await stabilityPool.getDepositoriBGTGain(bob)).toString()
    assert.isAtMost(th.getDifference(bob_Deposit_Before, spDeposit.sub(liquidatedDebt)), 1000000)
    assert.isAtMost(th.getDifference(bob_iBGTGain_Before, liquidatedColl), 1000)

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Attempt to liquidate Bob
    await assertRevert(troveManager.liquidate(bob), "TroveManager: nothing to liquidate")

    // Confirm Bob's trove is still active
    assert.isTrue(await sortedTroves.contains(bob))

    // Check Bob' SP deposit does not change after liquidation attempt
    const bob_Deposit_After = (await stabilityPool.getCompoundedNECTDeposit(bob)).toString()
    const bob_iBGTGain_After = (await stabilityPool.getDepositoriBGTGain(bob)).toString()
    assert.equal(bob_Deposit_Before, bob_Deposit_After)
    assert.equal(bob_iBGTGain_Before, bob_iBGTGain_After)
  })

  it("liquidate(): liquidates a SP depositor's trove with ICR < 110%, and the liquidation correctly impacts their SP deposit and iBGT gain", async () => {
    const A_spDeposit = toBN(dec(3, 24))
    const B_spDeposit = toBN(dec(1, 24))
    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })
    await openTrove({ ICR: toBN(dec(8, 18)), extraNECTAmount: A_spDeposit, extraParams: { from: alice } })
    const { collateral: B_collateral, totalDebt: B_debt } = await openTrove({ ICR: toBN(dec(218, 16)), extraNECTAmount: B_spDeposit, extraParams: { from: bob } })
    const { collateral: C_collateral, totalDebt: C_debt } = await openTrove({ ICR: toBN(dec(210, 16)), extraNECTAmount: toBN(dec(100, 18)), extraParams: { from: carol } })

    //Bob provides NECT to SP
    await stabilityPool.provideToSP(B_spDeposit, ZERO_ADDRESS, { from: bob })

    // Carol gets liquidated
    await priceFeed.setPrice(dec(100, 18))
    await troveManager.liquidate(carol)

    // Check Bob' SP deposit has absorbed Carol's debt, and he has received her liquidated iBGT
    const bob_Deposit_Before = await stabilityPool.getCompoundedNECTDeposit(bob)
    const bob_iBGTGain_Before = await stabilityPool.getDepositoriBGTGain(bob)
    assert.isAtMost(th.getDifference(bob_Deposit_Before, B_spDeposit.sub(C_debt)), 1000000)
    assert.isAtMost(th.getDifference(bob_iBGTGain_Before, th.applyLiquidationFee(C_collateral)), 1000)

    // Alice provides NECT to SP
    await stabilityPool.provideToSP(A_spDeposit, ZERO_ADDRESS, { from: alice })

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Liquidate Bob
    await troveManager.liquidate(bob)

    // Confirm Bob's trove has been closed
    assert.isFalse(await sortedTroves.contains(bob))
    const bob_Trove_Status = ((await troveManager.Troves(bob))[3]).toString()
    assert.equal(bob_Trove_Status, 3) // check closed by liquidation

    /* Alice's NECT Loss = (300 / 400) * 200 = 150 NECT
       Alice's iBGT gain = (300 / 400) * 2*0.995 = 1.4925 iBGT

       Bob's NECTLoss = (100 / 400) * 200 = 50 NECT
       Bob's iBGT gain = (100 / 400) * 2*0.995 = 0.4975 iBGT

     Check Bob' SP deposit has been reduced to 50 NECT, and his iBGT gain has increased to 1.5 iBGT. */
    const alice_Deposit_After = (await stabilityPool.getCompoundedNECTDeposit(alice)).toString()
    const alice_iBGTGain_After = (await stabilityPool.getDepositoriBGTGain(alice)).toString()

    const totalDeposits = bob_Deposit_Before.add(A_spDeposit)

    assert.isAtMost(th.getDifference(alice_Deposit_After, A_spDeposit.sub(B_debt.mul(A_spDeposit).div(totalDeposits))), 1000000)
    assert.isAtMost(th.getDifference(alice_iBGTGain_After, th.applyLiquidationFee(B_collateral).mul(A_spDeposit).div(totalDeposits)), 1000000)

    const bob_Deposit_After = await stabilityPool.getCompoundedNECTDeposit(bob)
    const bob_iBGTGain_After = await stabilityPool.getDepositoriBGTGain(bob)

    assert.isAtMost(th.getDifference(bob_Deposit_After, bob_Deposit_Before.sub(B_debt.mul(bob_Deposit_Before).div(totalDeposits))), 1000000)
    assert.isAtMost(th.getDifference(bob_iBGTGain_After, bob_iBGTGain_Before.add(th.applyLiquidationFee(B_collateral).mul(bob_Deposit_Before).div(totalDeposits))), 1000000)
  })

  it("liquidate(): does not alter the liquidated user's token balance", async () => {
    await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    const { nectAmount: A_nectAmount } = await openTrove({ ICR: toBN(dec(2, 18)), extraNECTAmount: toBN(dec(300, 18)), extraParams: { from: alice } })
    const { nectAmount: B_nectAmount } = await openTrove({ ICR: toBN(dec(2, 18)), extraNECTAmount: toBN(dec(200, 18)), extraParams: { from: bob } })
    const { nectAmount: C_nectAmount } = await openTrove({ ICR: toBN(dec(2, 18)), extraNECTAmount: toBN(dec(100, 18)), extraParams: { from: carol } })

    await priceFeed.setPrice(dec(100, 18))

    // Check sortedList size
    assert.equal((await sortedTroves.getSize()).toString(), '4')

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Liquidate A, B and C
    const activeNECTDebt_0 = await activePool.getNECTDebt()
    const defaultNECTDebt_0 = await defaultPool.getNECTDebt()

    await troveManager.liquidate(alice)
    const activeNECTDebt_A = await activePool.getNECTDebt()
    const defaultNECTDebt_A = await defaultPool.getNECTDebt()

    await troveManager.liquidate(bob)
    const activeNECTDebt_B = await activePool.getNECTDebt()
    const defaultNECTDebt_B = await defaultPool.getNECTDebt()

    await troveManager.liquidate(carol)

    // Confirm A, B, C closed
    assert.isFalse(await sortedTroves.contains(alice))
    assert.isFalse(await sortedTroves.contains(bob))
    assert.isFalse(await sortedTroves.contains(carol))

    // Check sortedList size reduced to 1
    assert.equal((await sortedTroves.getSize()).toString(), '1')

    // Confirm token balances have not changed
    assert.equal((await nectToken.balanceOf(alice)).toString(), A_nectAmount)
    assert.equal((await nectToken.balanceOf(bob)).toString(), B_nectAmount)
    assert.equal((await nectToken.balanceOf(carol)).toString(), C_nectAmount)
  })

  it("liquidate(): liquidates based on entire/collateral debt (including pending rewards), not raw collateral/debt", async () => {
    await openTrove({ ICR: toBN(dec(8, 18)), extraNECTAmount: toBN(dec(100, 18)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(221, 16)), extraNECTAmount: toBN(dec(100, 18)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(2, 18)), extraNECTAmount: toBN(dec(100, 18)), extraParams: { from: carol } })

    // Defaulter opens with 60 NECT, 0.6 iBGT
    await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: defaulter_1 } })

    // Price drops
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    const alice_ICR_Before = await troveManager.getCurrentICR(alice, price)
    const bob_ICR_Before = await troveManager.getCurrentICR(bob, price)
    const carol_ICR_Before = await troveManager.getCurrentICR(carol, price)

    /* Before liquidation: 
    Alice ICR: = (2 * 100 / 50) = 400%
    Bob ICR: (1 * 100 / 90.5) = 110.5%
    Carol ICR: (1 * 100 / 100 ) =  100%

    Therefore Alice and Bob above the MCR, Carol is below */
    assert.isTrue(alice_ICR_Before.gte(mv._MCR))
    assert.isTrue(bob_ICR_Before.gte(mv._MCR))
    assert.isTrue(carol_ICR_Before.lte(mv._MCR))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    /* Liquidate defaulter. 30 NECT and 0.3 iBGT is distributed between A, B and C.

    A receives (30 * 2/4) = 15 NECT, and (0.3*2/4) = 0.15 iBGT
    B receives (30 * 1/4) = 7.5 NECT, and (0.3*1/4) = 0.075 iBGT
    C receives (30 * 1/4) = 7.5 NECT, and (0.3*1/4) = 0.075 iBGT
    */
    await troveManager.liquidate(defaulter_1)

    const alice_ICR_After = await troveManager.getCurrentICR(alice, price)
    const bob_ICR_After = await troveManager.getCurrentICR(bob, price)
    const carol_ICR_After = await troveManager.getCurrentICR(carol, price)

    /* After liquidation: 

    Alice ICR: (10.15 * 100 / 60) = 183.33%
    Bob ICR:(1.075 * 100 / 98) =  109.69%
    Carol ICR: (1.075 *100 /  107.5 ) = 100.0%

    Check Alice is above MCR, Bob below, Carol below. */


    assert.isTrue(alice_ICR_After.gte(mv._MCR))
    assert.isTrue(bob_ICR_After.lte(mv._MCR))
    assert.isTrue(carol_ICR_After.lte(mv._MCR))

    /* Though Bob's true ICR (including pending rewards) is below the MCR, 
    check that Bob's raw coll and debt has not changed, and that his "raw" ICR is above the MCR */
    const bob_Coll = (await troveManager.Troves(bob))[1]
    const bob_Debt = (await troveManager.Troves(bob))[0]

    const bob_rawICR = bob_Coll.mul(toBN(dec(100, 18))).div(bob_Debt)
    assert.isTrue(bob_rawICR.gte(mv._MCR))

    // Whale enters system, pulling it into Normal Mode
    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Liquidate Alice, Bob, Carol
    await assertRevert(troveManager.liquidate(alice), "TroveManager: nothing to liquidate")
    await troveManager.liquidate(bob)
    await troveManager.liquidate(carol)

    /* Check Alice stays active, Carol gets liquidated, and Bob gets liquidated 
   (because his pending rewards bring his ICR < MCR) */
    assert.isTrue(await sortedTroves.contains(alice))
    assert.isFalse(await sortedTroves.contains(bob))
    assert.isFalse(await sortedTroves.contains(carol))

    // Check trove statuses - A active (1),  B and C liquidated (3)
    assert.equal((await troveManager.Troves(alice))[3].toString(), '1')
    assert.equal((await troveManager.Troves(bob))[3].toString(), '3')
    assert.equal((await troveManager.Troves(carol))[3].toString(), '3')
  })

  it("liquidate(): when SP > 0, triggers POLLEN reward event - increases the sum G", async () => {
    await openTrove({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // A, B, C open troves 
    await openTrove({ ICR: toBN(dec(4, 18)), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(3, 18)), extraParams: { from: C } })

    await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: defaulter_1 } })

    // B provides to SP
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: B })
    assert.equal(await stabilityPool.getTotalNECTDeposits(), dec(100, 18))

    const G_Before = await stabilityPool.epochToScaleToG(0, 0)

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // Price drops to 1iBGT:100NECT, reducing defaulters to below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Liquidate trove
    await troveManager.liquidate(defaulter_1)
    assert.isFalse(await sortedTroves.contains(defaulter_1))

    const G_After = await stabilityPool.epochToScaleToG(0, 0)

    // Expect G has increased from the POLLEN reward event triggered
    assert.isTrue(G_After.gt(G_Before))
  })

  it("liquidate(): when SP is empty, doesn't update G", async () => {
    await openTrove({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // A, B, C open troves 
    await openTrove({ ICR: toBN(dec(4, 18)), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(3, 18)), extraParams: { from: C } })

    await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: defaulter_1 } })

    // B provides to SP
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: B })

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // B withdraws
    await stabilityPool.withdrawFromSP(dec(100, 18), { from: B })

    // Check SP is empty
    assert.equal((await stabilityPool.getTotalNECTDeposits()), '0')

    // Check G is non-zero
    const G_Before = await stabilityPool.epochToScaleToG(0, 0)
    assert.isTrue(G_Before.gt(toBN('0')))

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // Price drops to 1iBGT:100NECT, reducing defaulters to below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // liquidate trove
    await troveManager.liquidate(defaulter_1)
    assert.isFalse(await sortedTroves.contains(defaulter_1))

    const G_After = await stabilityPool.epochToScaleToG(0, 0)

    // Expect G has not changed
    assert.isTrue(G_After.eq(G_Before))
  })

  // --- liquidateTroves() ---

  it('liquidateTroves(): liquidates a Trove that a) was skipped in a previous liquidation and b) has pending rewards', async () => {
    // A, B, C, D, E open troves
    await openTrove({ ICR: toBN(dec(333, 16)), extraParams: { from: D } })
    await openTrove({ ICR: toBN(dec(333, 16)), extraParams: { from: E } })
    await openTrove({ ICR: toBN(dec(120, 16)), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(133, 16)), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(3, 18)), extraParams: { from: C } })

    // Price drops
    await priceFeed.setPrice(dec(175, 18))
    let price = await priceFeed.getPrice()
    
    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // A gets liquidated, creates pending rewards for all
    const liqTxA = await troveManager.liquidate(A)
    assert.isTrue(liqTxA.receipt.status)
    assert.isFalse(await sortedTroves.contains(A))

    // A adds 10 NECT to the SP, but less than C's debt
    await stabilityPool.provideToSP(dec(10, 18), ZERO_ADDRESS, {from: A})

    // Price drops
    await priceFeed.setPrice(dec(100, 18))
    price = await priceFeed.getPrice()
    // Confirm system is now in Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Confirm C has ICR > TCR
    const TCR = await troveManager.getTCR(price)
    const ICR_C = await troveManager.getCurrentICR(C, price)
  
    assert.isTrue(ICR_C.gt(TCR))

    // Attempt to liquidate B and C, which skips C in the liquidation since it is immune
    const liqTxBC = await troveManager.liquidateTroves(2)
    assert.isTrue(liqTxBC.receipt.status)
    assert.isFalse(await sortedTroves.contains(B))
    assert.isTrue(await sortedTroves.contains(C))
    assert.isTrue(await sortedTroves.contains(D))
    assert.isTrue(await sortedTroves.contains(E))

    // // All remaining troves D and E repay a little debt, applying their pending rewards
    assert.isTrue((await sortedTroves.getSize()).eq(toBN('3')))
    await borrowerOperations.repayNECT(dec(1, 18), D, D, {from: D})
    await borrowerOperations.repayNECT(dec(1, 18), E, E, {from: E})

    // Check C is the only trove that has pending rewards
    assert.isTrue(await troveManager.hasPendingRewards(C))
    assert.isFalse(await troveManager.hasPendingRewards(D))
    assert.isFalse(await troveManager.hasPendingRewards(E))

    // Check C's pending coll and debt rewards are <= the coll and debt in the DefaultPool
    const pendingiBGT_C = await troveManager.getPendingiBGTReward(C)
    const pendingNECTDebt_C = await troveManager.getPendingNECTDebtReward(C)
    const defaultPooliBGT = await defaultPool.getiBGT()
    const defaultPoolNECTDebt = await defaultPool.getNECTDebt()
    assert.isTrue(pendingiBGT_C.lte(defaultPooliBGT))
    assert.isTrue(pendingNECTDebt_C.lte(defaultPoolNECTDebt))
    //Check only difference is dust
    assert.isAtMost(th.getDifference(pendingiBGT_C, defaultPooliBGT), 1000)
    assert.isAtMost(th.getDifference(pendingNECTDebt_C, defaultPoolNECTDebt), 1000)

    // Confirm system is still in Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // D and E fill the Stability Pool, enough to completely absorb C's debt of 70
    await stabilityPool.provideToSP(dec(50, 18), ZERO_ADDRESS, {from: D})
    await stabilityPool.provideToSP(dec(50, 18), ZERO_ADDRESS, {from: E})

    await priceFeed.setPrice(dec(50, 18))

    // Try to liquidate C again. Check it succeeds and closes C's trove
    const liqTx2 = await troveManager.liquidateTroves(2)
    assert.isTrue(liqTx2.receipt.status)
    assert.isFalse(await sortedTroves.contains(C))
    assert.isFalse(await sortedTroves.contains(D))
    assert.isTrue(await sortedTroves.contains(E))
    assert.isTrue((await sortedTroves.getSize()).eq(toBN('1')))
  })

  it('liquidateTroves(): closes every Trove with ICR < MCR, when n > number of undercollateralized troves', async () => {
    // --- SETUP ---
    await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } })

    // create 5 Troves with varying ICRs
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(190, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(195, 16)), extraParams: { from: erin } })
    await openTrove({ ICR: toBN(dec(120, 16)), extraParams: { from: flyn } })

    // G,H, I open high-ICR troves
    await openTrove({ ICR: toBN(dec(100, 18)), extraParams: { from: graham } })
    await openTrove({ ICR: toBN(dec(90, 18)), extraParams: { from: harriet } })
    await openTrove({ ICR: toBN(dec(80, 18)), extraParams: { from: ida } })

    // Whale puts some tokens in Stability Pool
    await stabilityPool.provideToSP(dec(300, 18), ZERO_ADDRESS, { from: whale })

    // --- TEST ---

    // Price drops to 1iBGT:100NECT, reducing Bob and Carol's ICR below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Confirm troves A-E are ICR < 110%
    assert.isTrue((await troveManager.getCurrentICR(alice, price)).lte(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(bob, price)).lte(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(carol, price)).lte(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(erin, price)).lte(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(flyn, price)).lte(mv._MCR))

    // Confirm troves G, H, I are ICR > 110%
    assert.isTrue((await troveManager.getCurrentICR(graham, price)).gte(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(harriet, price)).gte(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(ida, price)).gte(mv._MCR))

    // Confirm Whale is ICR > 110% 
    assert.isTrue((await troveManager.getCurrentICR(whale, price)).gte(mv._MCR))

    // Liquidate 5 troves
    await troveManager.liquidateTroves(5);

    // Confirm troves A-E have been removed from the system
    assert.isFalse(await sortedTroves.contains(alice))
    assert.isFalse(await sortedTroves.contains(bob))
    assert.isFalse(await sortedTroves.contains(carol))
    assert.isFalse(await sortedTroves.contains(erin))
    assert.isFalse(await sortedTroves.contains(flyn))

    // Check all troves A-E are now closed by liquidation
    assert.equal((await troveManager.Troves(alice))[3].toString(), '3')
    assert.equal((await troveManager.Troves(bob))[3].toString(), '3')
    assert.equal((await troveManager.Troves(carol))[3].toString(), '3')
    assert.equal((await troveManager.Troves(erin))[3].toString(), '3')
    assert.equal((await troveManager.Troves(flyn))[3].toString(), '3')

    // Check sorted list has been reduced to length 4 
    assert.equal((await sortedTroves.getSize()).toString(), '4')
  })

  it('liquidateTroves(): liquidates  up to the requested number of undercollateralized troves', async () => {
    // --- SETUP --- 
    await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } })

    // Alice, Bob, Carol, Dennis, Erin open troves with consecutively decreasing collateral ratio
    await openTrove({ ICR: toBN(dec(202, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(204, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(206, 16)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(208, 16)), extraParams: { from: dennis } })
    await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: erin } })

    // --- TEST --- 

    // Price drops
    await priceFeed.setPrice(dec(100, 18))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    await troveManager.liquidateTroves(3)

    const TroveOwnersArrayLength = await troveManager.getTroveOwnersCount()
    assert.equal(TroveOwnersArrayLength, '3')

    // Check Alice, Bob, Carol troves have been closed
    const aliceTroveStatus = (await troveManager.getTroveStatus(alice)).toString()
    const bobTroveStatus = (await troveManager.getTroveStatus(bob)).toString()
    const carolTroveStatus = (await troveManager.getTroveStatus(carol)).toString()

    assert.equal(aliceTroveStatus, '3')
    assert.equal(bobTroveStatus, '3')
    assert.equal(carolTroveStatus, '3')

    //  Check Alice, Bob, and Carol's trove are no longer in the sorted list
    const alice_isInSortedList = await sortedTroves.contains(alice)
    const bob_isInSortedList = await sortedTroves.contains(bob)
    const carol_isInSortedList = await sortedTroves.contains(carol)

    assert.isFalse(alice_isInSortedList)
    assert.isFalse(bob_isInSortedList)
    assert.isFalse(carol_isInSortedList)

    // Check Dennis, Erin still have active troves
    const dennisTroveStatus = (await troveManager.getTroveStatus(dennis)).toString()
    const erinTroveStatus = (await troveManager.getTroveStatus(erin)).toString()

    assert.equal(dennisTroveStatus, '1')
    assert.equal(erinTroveStatus, '1')

    // Check Dennis, Erin still in sorted list
    const dennis_isInSortedList = await sortedTroves.contains(dennis)
    const erin_isInSortedList = await sortedTroves.contains(erin)

    assert.isTrue(dennis_isInSortedList)
    assert.isTrue(erin_isInSortedList)
  })

  it('liquidateTroves(): does nothing if all troves have ICR > 110%', async () => {
    await openTrove({ ICR: toBN(dec(10, 18)), extraParams: { from: whale } })
    await openTrove({ ICR: toBN(dec(222, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(222, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(222, 16)), extraParams: { from: carol } })

    // Price drops, but all troves remain active at 111% ICR
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    assert.isTrue((await sortedTroves.contains(whale)))
    assert.isTrue((await sortedTroves.contains(alice)))
    assert.isTrue((await sortedTroves.contains(bob)))
    assert.isTrue((await sortedTroves.contains(carol)))

    const TCR_Before = (await th.getTCR(contracts)).toString()
    const listSize_Before = (await sortedTroves.getSize()).toString()

    assert.isTrue((await troveManager.getCurrentICR(whale, price)).gte(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(alice, price)).gte(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(bob, price)).gte(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(carol, price)).gte(mv._MCR))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Attempt liqudation sequence
    await assertRevert(troveManager.liquidateTroves(10), "TroveManager: nothing to liquidate")

    // Check all troves remain active
    assert.isTrue((await sortedTroves.contains(whale)))
    assert.isTrue((await sortedTroves.contains(alice)))
    assert.isTrue((await sortedTroves.contains(bob)))
    assert.isTrue((await sortedTroves.contains(carol)))

    const TCR_After = (await th.getTCR(contracts)).toString()
    const listSize_After = (await sortedTroves.getSize()).toString()

    assert.equal(TCR_Before, TCR_After)
    assert.equal(listSize_Before, listSize_After)
  })

  
  it("liquidateTroves(): liquidates based on entire/collateral debt (including pending rewards), not raw collateral/debt", async () => {
    await openTrove({ ICR: toBN(dec(400, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(221, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_1 } })

    // Price drops
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    const alice_ICR_Before = await troveManager.getCurrentICR(alice, price)
    const bob_ICR_Before = await troveManager.getCurrentICR(bob, price)
    const carol_ICR_Before = await troveManager.getCurrentICR(carol, price)

    /* Before liquidation: 
    Alice ICR: = (2 * 100 / 100) = 200%
    Bob ICR: (1 * 100 / 90.5) = 110.5%
    Carol ICR: (1 * 100 / 100 ) =  100%

    Therefore Alice and Bob above the MCR, Carol is below */
    assert.isTrue(alice_ICR_Before.gte(mv._MCR))
    assert.isTrue(bob_ICR_Before.gte(mv._MCR))
    assert.isTrue(carol_ICR_Before.lte(mv._MCR))

    // Liquidate defaulter. 30 NECT and 0.3 iBGT is distributed uniformly between A, B and C. Each receive 10 NECT, 0.1 iBGT
    await troveManager.liquidate(defaulter_1)

    const alice_ICR_After = await troveManager.getCurrentICR(alice, price)
    const bob_ICR_After = await troveManager.getCurrentICR(bob, price)
    const carol_ICR_After = await troveManager.getCurrentICR(carol, price)

    /* After liquidation: 

    Alice ICR: (1.0995 * 100 / 60) = 183.25%
    Bob ICR:(1.0995 * 100 / 100.5) =  109.40%
    Carol ICR: (1.0995 * 100 / 110 ) 99.95%

    Check Alice is above MCR, Bob below, Carol below. */
    assert.isTrue(alice_ICR_After.gte(mv._MCR))
    assert.isTrue(bob_ICR_After.lte(mv._MCR))
    assert.isTrue(carol_ICR_After.lte(mv._MCR))

    /* Though Bob's true ICR (including pending rewards) is below the MCR, check that Bob's raw coll and debt has not changed */
    const bob_Coll = (await troveManager.Troves(bob))[1]
    const bob_Debt = (await troveManager.Troves(bob))[0]

    const bob_rawICR = bob_Coll.mul(toBN(dec(100, 18))).div(bob_Debt)
    assert.isTrue(bob_rawICR.gte(mv._MCR))

    // Whale enters system, pulling it into Normal Mode
    await openTrove({ ICR: toBN(dec(10, 18)), extraNECTAmount: dec(1, 24), extraParams: { from: whale } })

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    //liquidate A, B, C
    await troveManager.liquidateTroves(10)

    // Check A stays active, B and C get liquidated
    assert.isTrue(await sortedTroves.contains(alice))
    assert.isFalse(await sortedTroves.contains(bob))
    assert.isFalse(await sortedTroves.contains(carol))

    // check trove statuses - A active (1),  B and C closed by liquidation (3)
    assert.equal((await troveManager.Troves(alice))[3].toString(), '1')
    assert.equal((await troveManager.Troves(bob))[3].toString(), '3')
    assert.equal((await troveManager.Troves(carol))[3].toString(), '3')
  })

  it("liquidateTroves(): reverts if n = 0", async () => {
    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })
    await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(218, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(206, 16)), extraParams: { from: carol } })

    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    const TCR_Before = (await th.getTCR(contracts)).toString()

    // Confirm A, B, C ICRs are below 110%
    const alice_ICR = await troveManager.getCurrentICR(alice, price)
    const bob_ICR = await troveManager.getCurrentICR(bob, price)
    const carol_ICR = await troveManager.getCurrentICR(carol, price)
    assert.isTrue(alice_ICR.lte(mv._MCR))
    assert.isTrue(bob_ICR.lte(mv._MCR))
    assert.isTrue(carol_ICR.lte(mv._MCR))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Liquidation with n = 0
    await assertRevert(troveManager.liquidateTroves(0), "TroveManager: nothing to liquidate")

    // Check all troves are still in the system
    assert.isTrue(await sortedTroves.contains(whale))
    assert.isTrue(await sortedTroves.contains(alice))
    assert.isTrue(await sortedTroves.contains(bob))
    assert.isTrue(await sortedTroves.contains(carol))

    const TCR_After = (await th.getTCR(contracts)).toString()

    // Check TCR has not changed after liquidation
    assert.equal(TCR_Before, TCR_After)
  })

  it("liquidateTroves():  liquidates troves with ICR < MCR", async () => {
    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    // A, B, C open troves that will remain active when price drops to 100
    await openTrove({ ICR: toBN(dec(220, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(230, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(240, 16)), extraParams: { from: carol } })

    // D, E, F open troves that will fall below MCR when price drops to 100
    await openTrove({ ICR: toBN(dec(218, 16)), extraParams: { from: dennis } })
    await openTrove({ ICR: toBN(dec(216, 16)), extraParams: { from: erin } })
    await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: flyn } })

    // Check list size is 7
    assert.equal((await sortedTroves.getSize()).toString(), '7')

    // Price drops
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    const alice_ICR = await troveManager.getCurrentICR(alice, price)
    const bob_ICR = await troveManager.getCurrentICR(bob, price)
    const carol_ICR = await troveManager.getCurrentICR(carol, price)
    const dennis_ICR = await troveManager.getCurrentICR(dennis, price)
    const erin_ICR = await troveManager.getCurrentICR(erin, price)
    const flyn_ICR = await troveManager.getCurrentICR(flyn, price)

    // Check A, B, C have ICR above MCR
    assert.isTrue(alice_ICR.gte(mv._MCR))
    assert.isTrue(bob_ICR.gte(mv._MCR))
    assert.isTrue(carol_ICR.gte(mv._MCR))

    // Check D, E, F have ICR below MCR
    assert.isTrue(dennis_ICR.lte(mv._MCR))
    assert.isTrue(erin_ICR.lte(mv._MCR))
    assert.isTrue(flyn_ICR.lte(mv._MCR))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    //Liquidate sequence
    await troveManager.liquidateTroves(10)

    // check list size reduced to 4
    assert.equal((await sortedTroves.getSize()).toString(), '4')

    // Check Whale and A, B, C remain in the system
    assert.isTrue(await sortedTroves.contains(whale))
    assert.isTrue(await sortedTroves.contains(alice))
    assert.isTrue(await sortedTroves.contains(bob))
    assert.isTrue(await sortedTroves.contains(carol))

    // Check D, E, F have been removed
    assert.isFalse(await sortedTroves.contains(dennis))
    assert.isFalse(await sortedTroves.contains(erin))
    assert.isFalse(await sortedTroves.contains(flyn))
  })

  it("liquidateTroves(): does not affect the liquidated user's token balances", async () => {
    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    // D, E, F open troves that will fall below MCR when price drops to 100
    await openTrove({ ICR: toBN(dec(218, 16)), extraParams: { from: dennis } })
    await openTrove({ ICR: toBN(dec(216, 16)), extraParams: { from: erin } })
    await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: flyn } })

    const D_balanceBefore = await nectToken.balanceOf(dennis)
    const E_balanceBefore = await nectToken.balanceOf(erin)
    const F_balanceBefore = await nectToken.balanceOf(flyn)

    // Check list size is 4
    assert.equal((await sortedTroves.getSize()).toString(), '4')

    // Price drops
    await priceFeed.setPrice(dec(100, 18))
    const price = await priceFeed.getPrice()

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    //Liquidate sequence
    await troveManager.liquidateTroves(10)

    // check list size reduced to 1
    assert.equal((await sortedTroves.getSize()).toString(), '1')

    // Check Whale remains in the system
    assert.isTrue(await sortedTroves.contains(whale))

    // Check D, E, F have been removed
    assert.isFalse(await sortedTroves.contains(dennis))
    assert.isFalse(await sortedTroves.contains(erin))
    assert.isFalse(await sortedTroves.contains(flyn))

    // Check token balances of users whose troves were liquidated, have not changed
    assert.equal((await nectToken.balanceOf(dennis)).toString(), D_balanceBefore)
    assert.equal((await nectToken.balanceOf(erin)).toString(), E_balanceBefore)
    assert.equal((await nectToken.balanceOf(flyn)).toString(), F_balanceBefore)
  })

  it("liquidateTroves(): A liquidation sequence containing Pool offsets increases the TCR", async () => {
    // Whale provides 500 NECT to SP
    await openTrove({ ICR: toBN(dec(100, 18)), extraNECTAmount: toBN(dec(500, 18)), extraParams: { from: whale } })
    await stabilityPool.provideToSP(dec(500, 18), ZERO_ADDRESS, { from: whale })

    await openTrove({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(28, 18)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(8, 18)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(80, 18)), extraParams: { from: dennis } })

    await openTrove({ ICR: toBN(dec(199, 16)), extraParams: { from: defaulter_1 } })
    await openTrove({ ICR: toBN(dec(156, 16)), extraParams: { from: defaulter_2 } })
    await openTrove({ ICR: toBN(dec(183, 16)), extraParams: { from: defaulter_3 } })
    await openTrove({ ICR: toBN(dec(166, 16)), extraParams: { from: defaulter_4 } })

    assert.isTrue((await sortedTroves.contains(defaulter_1)))
    assert.isTrue((await sortedTroves.contains(defaulter_2)))
    assert.isTrue((await sortedTroves.contains(defaulter_3)))
    assert.isTrue((await sortedTroves.contains(defaulter_4)))

    assert.equal((await sortedTroves.getSize()).toString(), '9')

    // Price drops
    await priceFeed.setPrice(dec(100, 18))

    const TCR_Before = await th.getTCR(contracts)

    // Check pool has 500 NECT
    assert.equal((await stabilityPool.getTotalNECTDeposits()).toString(), dec(500, 18))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Liquidate troves
    await troveManager.liquidateTroves(10)

    // Check pool has been emptied by the liquidations
    assert.equal((await stabilityPool.getTotalNECTDeposits()).toString(), '0')

    // Check all defaulters have been liquidated
    assert.isFalse((await sortedTroves.contains(defaulter_1)))
    assert.isFalse((await sortedTroves.contains(defaulter_2)))
    assert.isFalse((await sortedTroves.contains(defaulter_3)))
    assert.isFalse((await sortedTroves.contains(defaulter_4)))

    // check system sized reduced to 5 troves
    assert.equal((await sortedTroves.getSize()).toString(), '5')

    // Check that the liquidation sequence has improved the TCR
    const TCR_After = await th.getTCR(contracts)
    assert.isTrue(TCR_After.gte(TCR_Before))
  })

  it("liquidateTroves(): A liquidation sequence of pure redistributions decreases the TCR, due to gas compensation, but up to 0.5%", async () => {
    const { collateral: W_coll, totalDebt: W_debt } = await openTrove({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })
    const { collateral: A_coll, totalDebt: A_debt } = await openTrove({ ICR: toBN(dec(4, 18)), extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_debt } = await openTrove({ ICR: toBN(dec(28, 18)), extraParams: { from: bob } })
    const { collateral: C_coll, totalDebt: C_debt } = await openTrove({ ICR: toBN(dec(8, 18)), extraParams: { from: carol } })
    const { collateral: D_coll, totalDebt: D_debt } = await openTrove({ ICR: toBN(dec(80, 18)), extraParams: { from: dennis } })

    const { collateral: d1_coll, totalDebt: d1_debt } = await openTrove({ ICR: toBN(dec(199, 16)), extraParams: { from: defaulter_1 } })
    const { collateral: d2_coll, totalDebt: d2_debt } = await openTrove({ ICR: toBN(dec(156, 16)), extraParams: { from: defaulter_2 } })
    const { collateral: d3_coll, totalDebt: d3_debt } = await openTrove({ ICR: toBN(dec(183, 16)), extraParams: { from: defaulter_3 } })
    const { collateral: d4_coll, totalDebt: d4_debt } = await openTrove({ ICR: toBN(dec(166, 16)), extraParams: { from: defaulter_4 } })

    const totalCollNonDefaulters = W_coll.add(A_coll).add(B_coll).add(C_coll).add(D_coll)
    const totalCollDefaulters = d1_coll.add(d2_coll).add(d3_coll).add(d4_coll)
    const totalColl = totalCollNonDefaulters.add(totalCollDefaulters)
    const totalDebt = W_debt.add(A_debt).add(B_debt).add(C_debt).add(D_debt).add(d1_debt).add(d2_debt).add(d3_debt).add(d4_debt)

    assert.isTrue((await sortedTroves.contains(defaulter_1)))
    assert.isTrue((await sortedTroves.contains(defaulter_2)))
    assert.isTrue((await sortedTroves.contains(defaulter_3)))
    assert.isTrue((await sortedTroves.contains(defaulter_4)))

    assert.equal((await sortedTroves.getSize()).toString(), '9')

    // Price drops
    const price = toBN(dec(100, 18))
    await priceFeed.setPrice(price)

    const TCR_Before = await th.getTCR(contracts)
    assert.isAtMost(th.getDifference(TCR_Before, totalColl.mul(price).div(totalDebt)), 1000)

    // Check pool is empty before liquidation
    assert.equal((await stabilityPool.getTotalNECTDeposits()).toString(), '0')

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Liquidate
    await troveManager.liquidateTroves(10)

    // Check all defaulters have been liquidated
    assert.isFalse((await sortedTroves.contains(defaulter_1)))
    assert.isFalse((await sortedTroves.contains(defaulter_2)))
    assert.isFalse((await sortedTroves.contains(defaulter_3)))
    assert.isFalse((await sortedTroves.contains(defaulter_4)))

    // check system sized reduced to 5 troves
    assert.equal((await sortedTroves.getSize()).toString(), '5')

    // Check that the liquidation sequence has reduced the TCR
    const TCR_After = await th.getTCR(contracts)
    // ((100+1+7+2+20)+(1+2+3+4)*0.995)*100/(2050+50+50+50+50+101+257+328+480)
    assert.isAtMost(th.getDifference(TCR_After, totalCollNonDefaulters.add(th.applyLiquidationFee(totalCollDefaulters)).mul(price).div(totalDebt)), 1000)
    assert.isTrue(TCR_Before.gte(TCR_After))
    assert.isTrue(TCR_After.gte(TCR_Before.mul(toBN(995)).div(toBN(1000))))
  })

  it("liquidateTroves(): Liquidating troves with SP deposits correctly impacts their SP deposit and iBGT gain", async () => {
    // Whale provides 400 NECT to the SP
    const whaleDeposit = toBN(dec(40000, 18))
    await openTrove({ ICR: toBN(dec(100, 18)), extraNECTAmount: whaleDeposit, extraParams: { from: whale } })
    await stabilityPool.provideToSP(whaleDeposit, ZERO_ADDRESS, { from: whale })

    const A_deposit = toBN(dec(10000, 18))
    const B_deposit = toBN(dec(30000, 18))
    const { collateral: A_coll, totalDebt: A_debt } = await openTrove({ ICR: toBN(dec(2, 18)), extraNECTAmount: A_deposit, extraParams: { from: alice } })
    const { collateral: B_coll, totalDebt: B_debt } = await openTrove({ ICR: toBN(dec(2, 18)), extraNECTAmount: B_deposit, extraParams: { from: bob } })
    const { collateral: C_coll, totalDebt: C_debt } = await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: carol } })

    const liquidatedColl = A_coll.add(B_coll).add(C_coll)
    const liquidatedDebt = A_debt.add(B_debt).add(C_debt)

    // A, B provide 100, 300 to the SP
    await stabilityPool.provideToSP(A_deposit, ZERO_ADDRESS, { from: alice })
    await stabilityPool.provideToSP(B_deposit, ZERO_ADDRESS, { from: bob })

    assert.equal((await sortedTroves.getSize()).toString(), '4')

    // Price drops
    await priceFeed.setPrice(dec(100, 18))

    // Check 800 NECT in Pool
    const totalDeposits = whaleDeposit.add(A_deposit).add(B_deposit)
    assert.equal((await stabilityPool.getTotalNECTDeposits()).toString(), totalDeposits)

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Liquidate
    await troveManager.liquidateTroves(10)

    // Check all defaulters have been liquidated
    assert.isFalse((await sortedTroves.contains(alice)))
    assert.isFalse((await sortedTroves.contains(bob)))
    assert.isFalse((await sortedTroves.contains(carol)))

    // check system sized reduced to 1 troves
    assert.equal((await sortedTroves.getSize()).toString(), '1')

    /* Prior to liquidation, SP deposits were:
    Whale: 400 NECT
    Alice: 100 NECT
    Bob:   300 NECT
    Carol: 0 NECT

    Total NECT in Pool: 800 NECT

    Then, liquidation hits A,B,C: 

    Total liquidated debt = 150 + 350 + 150 = 650 NECT
    Total liquidated iBGT = 1.1 + 3.1 + 1.1 = 5.3 iBGT

    whale nect loss: 650 * (400/800) = 325 nect
    alice nect loss:  650 *(100/800) = 81.25 nect
    bob nect loss: 650 * (300/800) = 243.75 nect

    whale remaining deposit: (400 - 325) = 75 nect
    alice remaining deposit: (100 - 81.25) = 18.75 nect
    bob remaining deposit: (300 - 243.75) = 56.25 nect

    whale ibgt gain: 5*0.995 * (400/800) = 2.4875 ibgt
    alice ibgt gain: 5*0.995 *(100/800) = 0.621875 ibgt
    bob ibgt gain: 5*0.995 * (300/800) = 1.865625 ibgt

    Total remaining deposits: 150 NECT
    Total iBGT gain: 4.975 iBGT */

    // Check remaining NECT Deposits and iBGT gain, for whale and depositors whose troves were liquidated
    const whale_Deposit_After = await stabilityPool.getCompoundedNECTDeposit(whale)
    const alice_Deposit_After = await stabilityPool.getCompoundedNECTDeposit(alice)
    const bob_Deposit_After = await stabilityPool.getCompoundedNECTDeposit(bob)

    const whale_iBGTGain = await stabilityPool.getDepositoriBGTGain(whale)
    const alice_iBGTGain = await stabilityPool.getDepositoriBGTGain(alice)
    const bob_iBGTGain = await stabilityPool.getDepositoriBGTGain(bob)

    assert.isAtMost(th.getDifference(whale_Deposit_After, whaleDeposit.sub(liquidatedDebt.mul(whaleDeposit).div(totalDeposits))), 100000)
    assert.isAtMost(th.getDifference(alice_Deposit_After, A_deposit.sub(liquidatedDebt.mul(A_deposit).div(totalDeposits))), 100000)
    assert.isAtMost(th.getDifference(bob_Deposit_After, B_deposit.sub(liquidatedDebt.mul(B_deposit).div(totalDeposits))), 100000)

    assert.isAtMost(th.getDifference(whale_iBGTGain, th.applyLiquidationFee(liquidatedColl).mul(whaleDeposit).div(totalDeposits)), 100000)
    assert.isAtMost(th.getDifference(alice_iBGTGain, th.applyLiquidationFee(liquidatedColl).mul(A_deposit).div(totalDeposits)), 100000)
    assert.isAtMost(th.getDifference(bob_iBGTGain, th.applyLiquidationFee(liquidatedColl).mul(B_deposit).div(totalDeposits)), 100000)

    // Check total remaining deposits and iBGT gain in Stability Pool
    const total_NECTinSP = (await stabilityPool.getTotalNECTDeposits()).toString()
    const total_iBGTinSP = (await stabilityPool.getiBGT()).toString()

    assert.isAtMost(th.getDifference(total_NECTinSP, totalDeposits.sub(liquidatedDebt)), 1000)
    assert.isAtMost(th.getDifference(total_iBGTinSP, th.applyLiquidationFee(liquidatedColl)), 1000)
  })

  it("liquidateTroves(): when SP > 0, triggers POLLEN reward event - increases the sum G", async () => {
    await openTrove({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // A, B, C open troves
    await openTrove({ ICR: toBN(dec(4, 18)), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(3, 18)), extraNECTAmount: toBN(dec(100, 18)), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(3, 18)), extraParams: { from: C } })

    await openTrove({ ICR: toBN(dec(219, 16)), extraParams: { from: defaulter_1 } })
    await openTrove({ ICR: toBN(dec(213, 16)), extraParams: { from: defaulter_2 } })

    // B provides to SP
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: B })
    assert.equal(await stabilityPool.getTotalNECTDeposits(), dec(100, 18))

    const G_Before = await stabilityPool.epochToScaleToG(0, 0)

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // Price drops to 1iBGT:100NECT, reducing defaulters to below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Liquidate troves
    await troveManager.liquidateTroves(2)
    assert.isFalse(await sortedTroves.contains(defaulter_1))
    assert.isFalse(await sortedTroves.contains(defaulter_2))

    const G_After = await stabilityPool.epochToScaleToG(0, 0)

    // Expect G has increased from the POLLEN reward event triggered
    assert.isTrue(G_After.gt(G_Before))
  })

  it("liquidateTroves(): when SP is empty, doesn't update G", async () => {
    await openTrove({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // A, B, C open troves
    await openTrove({ ICR: toBN(dec(4, 18)), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(3, 18)), extraNECTAmount: toBN(dec(100, 18)), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(3, 18)), extraParams: { from: C } })

    await openTrove({ ICR: toBN(dec(219, 16)), extraParams: { from: defaulter_1 } })
    await openTrove({ ICR: toBN(dec(213, 16)), extraParams: { from: defaulter_2 } })

    // B provides to SP
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: B })

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // B withdraws
    await stabilityPool.withdrawFromSP(dec(100, 18), { from: B })

    // Check SP is empty
    assert.equal((await stabilityPool.getTotalNECTDeposits()), '0')

    // Check G is non-zero
    const G_Before = await stabilityPool.epochToScaleToG(0, 0)
    assert.isTrue(G_Before.gt(toBN('0')))

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // Price drops to 1iBGT:100NECT, reducing defaulters to below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // liquidate troves
    await troveManager.liquidateTroves(2)
    assert.isFalse(await sortedTroves.contains(defaulter_1))
    assert.isFalse(await sortedTroves.contains(defaulter_2))

    const G_After = await stabilityPool.epochToScaleToG(0, 0)

    // Expect G has not changed
    assert.isTrue(G_After.eq(G_Before))
  })


  // --- batchLiquidateTroves() ---

  it('batchLiquidateTroves(): liquidates a Trove that a) was skipped in a previous liquidation and b) has pending rewards', async () => {
    // A, B, C, D, E open troves 
    await openTrove({ ICR: toBN(dec(300, 16)), extraParams: { from: C } })
    await openTrove({ ICR: toBN(dec(364, 16)), extraParams: { from: D } })
    await openTrove({ ICR: toBN(dec(364, 16)), extraParams: { from: E } })
    await openTrove({ ICR: toBN(dec(120, 16)), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(133, 16)), extraParams: { from: B } })

    // Price drops
    await priceFeed.setPrice(dec(175, 18))
    let price = await priceFeed.getPrice()
    
    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // A gets liquidated, creates pending rewards for all
    const liqTxA = await troveManager.liquidate(A)
    assert.isTrue(liqTxA.receipt.status)
    assert.isFalse(await sortedTroves.contains(A))

    // A adds 10 NECT to the SP, but less than C's debt
    await stabilityPool.provideToSP(dec(10, 18), ZERO_ADDRESS, {from: A})

    // Price drops
    await priceFeed.setPrice(dec(100, 18))
    price = await priceFeed.getPrice()
    // Confirm system is now in Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // Confirm C has ICR > TCR
    const TCR = await troveManager.getTCR(price)
    const ICR_C = await troveManager.getCurrentICR(C, price)
  
    assert.isTrue(ICR_C.gt(TCR))

    // Attempt to liquidate B and C, which skips C in the liquidation since it is immune
    const liqTxBC = await troveManager.liquidateTroves(2)
    assert.isTrue(liqTxBC.receipt.status)
    assert.isFalse(await sortedTroves.contains(B))
    assert.isTrue(await sortedTroves.contains(C))
    assert.isTrue(await sortedTroves.contains(D))
    assert.isTrue(await sortedTroves.contains(E))

    // // All remaining troves D and E repay a little debt, applying their pending rewards
    assert.isTrue((await sortedTroves.getSize()).eq(toBN('3')))
    await borrowerOperations.repayNECT(dec(1, 18), D, D, {from: D})
    await borrowerOperations.repayNECT(dec(1, 18), E, E, {from: E})

    // Check C is the only trove that has pending rewards
    assert.isTrue(await troveManager.hasPendingRewards(C))
    assert.isFalse(await troveManager.hasPendingRewards(D))
    assert.isFalse(await troveManager.hasPendingRewards(E))

    // Check C's pending coll and debt rewards are <= the coll and debt in the DefaultPool
    const pendingiBGT_C = await troveManager.getPendingiBGTReward(C)
    const pendingNECTDebt_C = await troveManager.getPendingNECTDebtReward(C)
    const defaultPooliBGT = await defaultPool.getiBGT()
    const defaultPoolNECTDebt = await defaultPool.getNECTDebt()
    assert.isTrue(pendingiBGT_C.lte(defaultPooliBGT))
    assert.isTrue(pendingNECTDebt_C.lte(defaultPoolNECTDebt))
    //Check only difference is dust
    assert.isAtMost(th.getDifference(pendingiBGT_C, defaultPooliBGT), 1000)
    assert.isAtMost(th.getDifference(pendingNECTDebt_C, defaultPoolNECTDebt), 1000)

    // Confirm system is still in Recovery Mode
    assert.isTrue(await th.checkRecoveryMode(contracts))

    // D and E fill the Stability Pool, enough to completely absorb C's debt of 70
    await stabilityPool.provideToSP(dec(50, 18), ZERO_ADDRESS, {from: D})
    await stabilityPool.provideToSP(dec(50, 18), ZERO_ADDRESS, {from: E})

    await priceFeed.setPrice(dec(50, 18))

    // Try to liquidate C again. Check it succeeds and closes C's trove
    const liqTx2 = await troveManager.batchLiquidateTroves([C,D])
    assert.isTrue(liqTx2.receipt.status)
    assert.isFalse(await sortedTroves.contains(C))
    assert.isFalse(await sortedTroves.contains(D))
    assert.isTrue(await sortedTroves.contains(E))
    assert.isTrue((await sortedTroves.getSize()).eq(toBN('1')))
  })

  it('batchLiquidateTroves(): closes every trove with ICR < MCR in the given array', async () => {
    // --- SETUP ---
    await openTrove({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(133, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(2000, 16)), extraParams: { from: dennis } })
    await openTrove({ ICR: toBN(dec(1800, 16)), extraParams: { from: erin } })

    // Check full sorted list size is 6
    assert.equal((await sortedTroves.getSize()).toString(), '6')

    // Whale puts some tokens in Stability Pool
    await stabilityPool.provideToSP(dec(300, 18), ZERO_ADDRESS, { from: whale })

    // --- TEST ---

    // Price drops to 1iBGT:100NECT, reducing A, B, C ICR below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Confirm troves A-C are ICR < 110%
    assert.isTrue((await troveManager.getCurrentICR(alice, price)).lt(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(bob, price)).lt(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(carol, price)).lt(mv._MCR))

    // Confirm D-E are ICR > 110%
    assert.isTrue((await troveManager.getCurrentICR(dennis, price)).gte(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(erin, price)).gte(mv._MCR))

    // Confirm Whale is ICR >= 110% 
    assert.isTrue((await troveManager.getCurrentICR(whale, price)).gte(mv._MCR))

    liquidationArray = [alice, bob, carol, dennis, erin]
    await troveManager.batchLiquidateTroves(liquidationArray);

    // Confirm troves A-C have been removed from the system
    assert.isFalse(await sortedTroves.contains(alice))
    assert.isFalse(await sortedTroves.contains(bob))
    assert.isFalse(await sortedTroves.contains(carol))

    // Check all troves A-C are now closed by liquidation
    assert.equal((await troveManager.Troves(alice))[3].toString(), '3')
    assert.equal((await troveManager.Troves(bob))[3].toString(), '3')
    assert.equal((await troveManager.Troves(carol))[3].toString(), '3')

    // Check sorted list has been reduced to length 3
    assert.equal((await sortedTroves.getSize()).toString(), '3')
  })

  it('batchLiquidateTroves(): does not liquidate troves that are not in the given array', async () => {
    // --- SETUP ---
    await openTrove({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(180, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: toBN(dec(500, 18)), extraParams: { from: dennis } })
    await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: toBN(dec(500, 18)), extraParams: { from: erin } })

    // Check full sorted list size is 6
    assert.equal((await sortedTroves.getSize()).toString(), '6')

    // Whale puts some tokens in Stability Pool
    await stabilityPool.provideToSP(dec(300, 18), ZERO_ADDRESS, { from: whale })

    // --- TEST ---

    // Price drops to 1iBGT:100NECT, reducing A, B, C ICR below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Confirm troves A-E are ICR < 110%
    assert.isTrue((await troveManager.getCurrentICR(alice, price)).lt(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(bob, price)).lt(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(carol, price)).lt(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(dennis, price)).lt(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(erin, price)).lt(mv._MCR))

    liquidationArray = [alice, bob]  // C-E not included
    await troveManager.batchLiquidateTroves(liquidationArray);

    // Confirm troves A-B have been removed from the system
    assert.isFalse(await sortedTroves.contains(alice))
    assert.isFalse(await sortedTroves.contains(bob))

    // Check all troves A-B are now closed by liquidation
    assert.equal((await troveManager.Troves(alice))[3].toString(), '3')
    assert.equal((await troveManager.Troves(bob))[3].toString(), '3')

    // Confirm troves C-E remain in the system
    assert.isTrue(await sortedTroves.contains(carol))
    assert.isTrue(await sortedTroves.contains(dennis))
    assert.isTrue(await sortedTroves.contains(erin))

    // Check all troves C-E are still active
    assert.equal((await troveManager.Troves(carol))[3].toString(), '1')
    assert.equal((await troveManager.Troves(dennis))[3].toString(), '1')
    assert.equal((await troveManager.Troves(erin))[3].toString(), '1')

    // Check sorted list has been reduced to length 4
    assert.equal((await sortedTroves.getSize()).toString(), '4')
  })

  it('batchLiquidateTroves(): does not close troves with ICR >= MCR in the given array', async () => {
    // --- SETUP ---
    await openTrove({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    await openTrove({ ICR: toBN(dec(190, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(120, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(195, 16)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(2000, 16)), extraParams: { from: dennis } })
    await openTrove({ ICR: toBN(dec(1800, 16)), extraParams: { from: erin } })

    // Check full sorted list size is 6
    assert.equal((await sortedTroves.getSize()).toString(), '6')

    // Whale puts some tokens in Stability Pool
    await stabilityPool.provideToSP(dec(300, 18), ZERO_ADDRESS, { from: whale })

    // --- TEST ---

    // Price drops to 1iBGT:100NECT, reducing A, B, C ICR below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Confirm troves A-C are ICR < 110%
    assert.isTrue((await troveManager.getCurrentICR(alice, price)).lt(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(bob, price)).lt(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(carol, price)).lt(mv._MCR))

    // Confirm D-E are ICR >= 110%
    assert.isTrue((await troveManager.getCurrentICR(dennis, price)).gte(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(erin, price)).gte(mv._MCR))

    // Confirm Whale is ICR > 110% 
    assert.isTrue((await troveManager.getCurrentICR(whale, price)).gte(mv._MCR))

    liquidationArray = [alice, bob, carol, dennis, erin]
    await troveManager.batchLiquidateTroves(liquidationArray);

    // Confirm troves D-E and whale remain in the system
    assert.isTrue(await sortedTroves.contains(dennis))
    assert.isTrue(await sortedTroves.contains(erin))
    assert.isTrue(await sortedTroves.contains(whale))

    // Check all troves D-E and whale remain active
    assert.equal((await troveManager.Troves(dennis))[3].toString(), '1')
    assert.equal((await troveManager.Troves(erin))[3].toString(), '1')
    assert.isTrue(await sortedTroves.contains(whale))

    // Check sorted list has been reduced to length 3
    assert.equal((await sortedTroves.getSize()).toString(), '3')
  })

  it('batchLiquidateTroves(): reverts if array is empty', async () => {
    // --- SETUP ---
    await openTrove({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    await openTrove({ ICR: toBN(dec(190, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(120, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(195, 16)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(2000, 16)), extraParams: { from: dennis } })
    await openTrove({ ICR: toBN(dec(1800, 16)), extraParams: { from: erin } })

    // Check full sorted list size is 6
    assert.equal((await sortedTroves.getSize()).toString(), '6')

    // Whale puts some tokens in Stability Pool
    await stabilityPool.provideToSP(dec(300, 18), ZERO_ADDRESS, { from: whale })

    // --- TEST ---

    // Price drops to 1iBGT:100NECT, reducing A, B, C ICR below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    liquidationArray = []
    try {
      const tx = await troveManager.batchLiquidateTroves(liquidationArray);
      assert.isFalse(tx.receipt.status)
    } catch (error) {
      assert.include(error.message, "TroveManager: Calldata address array must not be empty")
    }
  })

  it("batchLiquidateTroves(): skips if trove is non-existent", async () => {
    // --- SETUP ---
    const spDeposit = toBN(dec(500000, 18))
    await openTrove({ ICR: toBN(dec(100, 18)), extraNECTAmount: spDeposit, extraParams: { from: whale } })

    const { totalDebt: A_debt } = await openTrove({ ICR: toBN(dec(190, 16)), extraParams: { from: alice } })
    const { totalDebt: B_debt } = await openTrove({ ICR: toBN(dec(120, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(2000, 16)), extraParams: { from: dennis } })
    await openTrove({ ICR: toBN(dec(1800, 16)), extraParams: { from: erin } })

    assert.equal(await troveManager.getTroveStatus(carol), 0) // check trove non-existent

    // Check full sorted list size is 6
    assert.equal((await sortedTroves.getSize()).toString(), '5')

    // Whale puts some tokens in Stability Pool
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // --- TEST ---

    // Price drops to 1iBGT:100NECT, reducing A, B, C ICR below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Confirm troves A-B are ICR < 110%
    assert.isTrue((await troveManager.getCurrentICR(alice, price)).lt(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(bob, price)).lt(mv._MCR))

    // Confirm D-E are ICR > 110%
    assert.isTrue((await troveManager.getCurrentICR(dennis, price)).gte(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(erin, price)).gte(mv._MCR))

    // Confirm Whale is ICR >= 110% 
    assert.isTrue((await troveManager.getCurrentICR(whale, price)).gte(mv._MCR))

    // Liquidate - trove C in between the ones to be liquidated!
    const liquidationArray = [alice, carol, bob, dennis, erin]
    await troveManager.batchLiquidateTroves(liquidationArray);

    // Confirm troves A-B have been removed from the system
    assert.isFalse(await sortedTroves.contains(alice))
    assert.isFalse(await sortedTroves.contains(bob))

    // Check all troves A-B are now closed by liquidation
    assert.equal((await troveManager.Troves(alice))[3].toString(), '3')
    assert.equal((await troveManager.Troves(bob))[3].toString(), '3')

    // Check sorted list has been reduced to length 3
    assert.equal((await sortedTroves.getSize()).toString(), '3')

    // Confirm trove C non-existent
    assert.isFalse(await sortedTroves.contains(carol))
    assert.equal((await troveManager.Troves(carol))[3].toString(), '0')

    // Check Stability pool has only been reduced by A-B
    th.assertIsApproximatelyEqual((await stabilityPool.getTotalNECTDeposits()).toString(), spDeposit.sub(A_debt).sub(B_debt))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));
  })

  it("batchLiquidateTroves(): skips if a trove has been closed", async () => {
    // --- SETUP ---
    const spDeposit = toBN(dec(500000, 18))
    await openTrove({ ICR: toBN(dec(100, 18)), extraNECTAmount: spDeposit, extraParams: { from: whale } })

    const { totalDebt: A_debt } = await openTrove({ ICR: toBN(dec(190, 16)), extraParams: { from: alice } })
    const { totalDebt: B_debt } = await openTrove({ ICR: toBN(dec(120, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(195, 16)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(2000, 16)), extraParams: { from: dennis } })
    await openTrove({ ICR: toBN(dec(1800, 16)), extraParams: { from: erin } })

    assert.isTrue(await sortedTroves.contains(carol))

    // Check full sorted list size is 6
    assert.equal((await sortedTroves.getSize()).toString(), '6')

    // Whale puts some tokens in Stability Pool
    await stabilityPool.provideToSP(spDeposit, ZERO_ADDRESS, { from: whale })

    // Whale transfers to Carol so she can close her trove
    await nectToken.transfer(carol, dec(100, 18), { from: whale })

    // --- TEST ---

    // Price drops to 1iBGT:100NECT, reducing A, B, C ICR below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()

    // Carol liquidated, and her trove is closed
    const txCarolClose = await borrowerOperations.closeTrove({ from: carol })
    assert.isTrue(txCarolClose.receipt.status)

    assert.isFalse(await sortedTroves.contains(carol))

    assert.equal(await troveManager.getTroveStatus(carol), 2)  // check trove closed

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));

    // Confirm troves A-B are ICR < 110%
    assert.isTrue((await troveManager.getCurrentICR(alice, price)).lt(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(bob, price)).lt(mv._MCR))

    // Confirm D-E are ICR > 110%
    assert.isTrue((await troveManager.getCurrentICR(dennis, price)).gte(mv._MCR))
    assert.isTrue((await troveManager.getCurrentICR(erin, price)).gte(mv._MCR))

    // Confirm Whale is ICR >= 110% 
    assert.isTrue((await troveManager.getCurrentICR(whale, price)).gte(mv._MCR))

    // Liquidate - trove C in between the ones to be liquidated!
    const liquidationArray = [alice, carol, bob, dennis, erin]
    await troveManager.batchLiquidateTroves(liquidationArray);

    // Confirm troves A-B have been removed from the system
    assert.isFalse(await sortedTroves.contains(alice))
    assert.isFalse(await sortedTroves.contains(bob))

    // Check all troves A-B are now closed by liquidation
    assert.equal((await troveManager.Troves(alice))[3].toString(), '3')
    assert.equal((await troveManager.Troves(bob))[3].toString(), '3')
    // Trove C still closed by user
    assert.equal((await troveManager.Troves(carol))[3].toString(), '2')

    // Check sorted list has been reduced to length 3
    assert.equal((await sortedTroves.getSize()).toString(), '3')

    // Check Stability pool has only been reduced by A-B
    th.assertIsApproximatelyEqual((await stabilityPool.getTotalNECTDeposits()).toString(), spDeposit.sub(A_debt).sub(B_debt))

    // Confirm system is not in Recovery Mode
    assert.isFalse(await th.checkRecoveryMode(contracts));
  })

  it("batchLiquidateTroves: when SP > 0, triggers POLLEN reward event - increases the sum G", async () => {
    await openTrove({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // A, B, C open troves
    await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(133, 16)), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(167, 16)), extraParams: { from: C } })

    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_1 } })
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_2 } })

    // B provides to SP
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: B })
    assert.equal(await stabilityPool.getTotalNECTDeposits(), dec(100, 18))

    const G_Before = await stabilityPool.epochToScaleToG(0, 0)

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // Price drops to 1iBGT:100NECT, reducing defaulters to below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // Liquidate troves
    await troveManager.batchLiquidateTroves([defaulter_1, defaulter_2])
    assert.isFalse(await sortedTroves.contains(defaulter_1))
    assert.isFalse(await sortedTroves.contains(defaulter_2))

    const G_After = await stabilityPool.epochToScaleToG(0, 0)

    // Expect G has increased from the POLLEN reward event triggered
    assert.isTrue(G_After.gt(G_Before))
  })

  it("batchLiquidateTroves(): when SP is empty, doesn't update G", async () => {
    await openTrove({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // A, B, C open troves
    await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(133, 16)), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(167, 16)), extraParams: { from: C } })

    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_1 } })
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: defaulter_2 } })

    // B provides to SP
    await stabilityPool.provideToSP(dec(100, 18), ZERO_ADDRESS, { from: B })

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // B withdraws
    await stabilityPool.withdrawFromSP(dec(100, 18), { from: B })

    // Check SP is empty
    assert.equal((await stabilityPool.getTotalNECTDeposits()), '0')

    // Check G is non-zero
    const G_Before = await stabilityPool.epochToScaleToG(0, 0)
    assert.isTrue(G_Before.gt(toBN('0')))

    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_HOUR, web3.currentProvider)

    // Price drops to 1iBGT:100NECT, reducing defaulters to below MCR
    await priceFeed.setPrice(dec(100, 18));
    const price = await priceFeed.getPrice()
    assert.isFalse(await th.checkRecoveryMode(contracts))

    // liquidate troves
    await troveManager.batchLiquidateTroves([defaulter_1, defaulter_2])
    assert.isFalse(await sortedTroves.contains(defaulter_1))
    assert.isFalse(await sortedTroves.contains(defaulter_2))

    const G_After = await stabilityPool.epochToScaleToG(0, 0)

    // Expect G has not changed
    assert.isTrue(G_After.eq(G_Before))
  })

  // --- redemptions ---


  it('getRedemptionHints(): gets the address of the first Trove and the final ICR of the last Trove involved in a redemption', async () => {
    // --- SETUP ---
    const partialRedemptionAmount = toBN(dec(100, 18))
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(310, 16)), extraNECTAmount: partialRedemptionAmount, extraParams: { from: alice } })
    const { netDebt: B_debt } = await openTrove({ ICR: toBN(dec(290, 16)), extraParams: { from: bob } })
    const { netDebt: C_debt } = await openTrove({ ICR: toBN(dec(250, 16)), extraParams: { from: carol } })
    // Dennis' Trove should be untouched by redemption, because its ICR will be < 110% after the price drop
    await openTrove({ ICR: toBN(dec(120, 16)), extraParams: { from: dennis } })

    // Drop the price
    const price = toBN(dec(100, 18))
    await priceFeed.setPrice(price);

    // --- TEST ---
    const redemptionAmount = C_debt.add(B_debt).add(partialRedemptionAmount)
    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(redemptionAmount, price, 0)

    assert.equal(firstRedemptionHint, carol)
    const expectedICR = A_coll.mul(price).sub(partialRedemptionAmount.mul(mv._1e18BN)).div(A_totalDebt.sub(partialRedemptionAmount))
    th.assertIsApproximatelyEqual(partialRedemptionHintNICR, expectedICR)
  });

  it('getRedemptionHints(): returns 0 as partialRedemptionHintNICR when reaching _maxIterations', async () => {
    // --- SETUP ---
    await openTrove({ ICR: toBN(dec(310, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(290, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(250, 16)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(180, 16)), extraParams: { from: dennis } })

    const price = await priceFeed.getPrice();

    // --- TEST ---

    // Get hints for a redemption of 170 + 30 + some extra NECT. At least 3 iterations are needed
    // for total redemption of the given amount.
    const {
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints('210' + _18_zeros, price, 2) // limit _maxIterations to 2

    assert.equal(partialRedemptionHintNICR, '0')
  });

  it('redeemCollateral(): cancels the provided NECT with debt from Troves with the lowest ICRs and sends an equivalent amount of iBgt', async () => {
    // --- SETUP ---
    const { totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(310, 16)), extraNECTAmount: dec(10, 18), extraParams: { from: alice } })
    const { netDebt: B_netDebt } = await openTrove({ ICR: toBN(dec(290, 16)), extraNECTAmount: dec(8, 18), extraParams: { from: bob } })
    const { netDebt: C_netDebt } = await openTrove({ ICR: toBN(dec(250, 16)), extraNECTAmount: dec(10, 18), extraParams: { from: carol } })
    const partialRedemptionAmount = toBN(2)
    const redemptionAmount = C_netDebt.add(B_netDebt).add(partialRedemptionAmount)
    // start Dennis with a high ICR
    await openTrove({ ICR: toBN(dec(100, 18)), extraNECTAmount: redemptionAmount, extraParams: { from: dennis } })

    const dennis_iBGTBalance_Before = toBN(await iBGTToken.balanceOf(dennis))

    const dennis_NECTBalance_Before = await nectToken.balanceOf(dennis)

    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    // --- TEST ---

    // Find hints for redeeming 20 NECT
    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(redemptionAmount, price, 0)

    // We don't need to use getApproxHint for this test, since it's not the subject of this
    // test case, and the list is very small, so the correct position is quickly found
    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedTroves.findInsertPosition(
      partialRedemptionHintNICR,
      dennis,
      dennis
    )

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Dennis redeems 20 NECT
    // Don't pay for gas, as it makes it easier to calculate the received iBgt
    const redemptionTx = await troveManager.redeemCollateral(
      redemptionAmount,
      firstRedemptionHint,
      upperPartialRedemptionHint,
      lowerPartialRedemptionHint,
      partialRedemptionHintNICR,
      0, th._100pct,
      {
        from: dennis,
        gasPrice: GAS_PRICE
      }
    )

    const iBGTFee = th.getEmittedRedemptionValues(redemptionTx)[3]

    const alice_Trove_After = await troveManager.Troves(alice)
    const bob_Trove_After = await troveManager.Troves(bob)
    const carol_Trove_After = await troveManager.Troves(carol)

    const alice_debt_After = alice_Trove_After[0].toString()
    const bob_debt_After = bob_Trove_After[0].toString()
    const carol_debt_After = carol_Trove_After[0].toString()

    /* check that Dennis' redeemed 20 NECT has been cancelled with debt from Bobs's Trove (8) and Carol's Trove (10).
    The remaining lot (2) is sent to Alice's Trove, who had the best ICR.
    It leaves her with (3) NECT debt + 50 for gas compensation. */
    th.assertIsApproximatelyEqual(alice_debt_After, A_totalDebt.sub(partialRedemptionAmount))
    assert.equal(bob_debt_After, '0')
    assert.equal(carol_debt_After, '0')

    const dennis_iBGTBalance_After = toBN(await iBGTToken.balanceOf(dennis))
    const receivediBGT = dennis_iBGTBalance_After.sub(dennis_iBGTBalance_Before)

    const expectedTotaliBGTDrawn = redemptionAmount.div(toBN(200)) // convert redemptionAmount NECT to iBGT, at iBGT:USD price 200
    const expectedReceivediBGT = expectedTotaliBGTDrawn.sub(toBN(iBGTFee)) // substract gas used for troveManager.redeemCollateral from expected received iBGT
    
    // console.log("*********************************************************************************")
    // console.log("iBGTFee: " + iBGTFee)
    // console.log("dennis_iBGTBalance_Before: " + dennis_iBGTBalance_Before)
    // console.log("GAS_USED: " + th.gasUsed(redemptionTx))
    // console.log("dennis_iBGTBalance_After: " + dennis_iBGTBalance_After)
    // console.log("expectedTotaliBGTDrawn: " + expectedTotaliBGTDrawn)
    // console.log("recived  : " + receivediBGT)
    // console.log("expected : " + expectedReceivediBGT)
    // console.log("wanted :   " + expectedReceivediBGT.sub(toBN(GAS_PRICE)))
    // console.log("*********************************************************************************")
    th.assertIsApproximatelyEqual(expectedReceivediBGT, receivediBGT)

    const dennis_NECTBalance_After = (await nectToken.balanceOf(dennis)).toString()
    assert.equal(dennis_NECTBalance_After, dennis_NECTBalance_Before.sub(redemptionAmount))
  })

  it('redeemCollateral(): with invalid first hint, zero address', async () => {
    // --- SETUP ---
    const { totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(310, 16)), extraNECTAmount: dec(10, 18), extraParams: { from: alice } })
    const { netDebt: B_netDebt } = await openTrove({ ICR: toBN(dec(290, 16)), extraNECTAmount: dec(8, 18), extraParams: { from: bob } })
    const { netDebt: C_netDebt } = await openTrove({ ICR: toBN(dec(250, 16)), extraNECTAmount: dec(10, 18), extraParams: { from: carol } })
    const partialRedemptionAmount = toBN(2)
    const redemptionAmount = C_netDebt.add(B_netDebt).add(partialRedemptionAmount)
    // start Dennis with a high ICR
    await openTrove({ ICR: toBN(dec(100, 18)), extraNECTAmount: redemptionAmount, extraParams: { from: dennis } })

    const dennis_iBGTBalance_Before = toBN(await iBGTToken.balanceOf(dennis))

    const dennis_NECTBalance_Before = await nectToken.balanceOf(dennis)

    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    // --- TEST ---

    // Find hints for redeeming 20 NECT
    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(redemptionAmount, price, 0)

    // We don't need to use getApproxHint for this test, since it's not the subject of this
    // test case, and the list is very small, so the correct position is quickly found
    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedTroves.findInsertPosition(
      partialRedemptionHintNICR,
      dennis,
      dennis
    )

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Dennis redeems 20 NECT
    // Don't pay for gas, as it makes it easier to calculate the received iBgt
    const redemptionTx = await troveManager.redeemCollateral(
      redemptionAmount,
      ZERO_ADDRESS, // invalid first hint
      upperPartialRedemptionHint,
      lowerPartialRedemptionHint,
      partialRedemptionHintNICR,
      0, th._100pct,
      {
        from: dennis,
        gasPrice: GAS_PRICE 
      }
    )

    const iBGTFee = th.getEmittedRedemptionValues(redemptionTx)[3]

    const alice_Trove_After = await troveManager.Troves(alice)
    const bob_Trove_After = await troveManager.Troves(bob)
    const carol_Trove_After = await troveManager.Troves(carol)

    const alice_debt_After = alice_Trove_After[0].toString()
    const bob_debt_After = bob_Trove_After[0].toString()
    const carol_debt_After = carol_Trove_After[0].toString()

    /* check that Dennis' redeemed 20 NECT has been cancelled with debt from Bobs's Trove (8) and Carol's Trove (10).
    The remaining lot (2) is sent to Alice's Trove, who had the best ICR.
    It leaves her with (3) NECT debt + 50 for gas compensation. */
    th.assertIsApproximatelyEqual(alice_debt_After, A_totalDebt.sub(partialRedemptionAmount))
    assert.equal(bob_debt_After, '0')
    assert.equal(carol_debt_After, '0')

    const dennis_iBGTBalance_After = toBN(await iBGTToken.balanceOf(dennis))
    const receivediBGT = dennis_iBGTBalance_After.sub(dennis_iBGTBalance_Before)

    const expectedTotaliBGTDrawn = redemptionAmount.div(toBN(200)) // convert redemptionAmount NECT to iBGT, at iBGT:USD price 200
    const expectedReceivediBGT = expectedTotaliBGTDrawn.sub(toBN(iBGTFee)) // substract gas used for troveManager.redeemCollateral from expected received iBGT

    th.assertIsApproximatelyEqual(expectedReceivediBGT, receivediBGT)

    const dennis_NECTBalance_After = (await nectToken.balanceOf(dennis)).toString()
    assert.equal(dennis_NECTBalance_After, dennis_NECTBalance_Before.sub(redemptionAmount))
  })

  it('redeemCollateral(): with invalid first hint, non-existent trove', async () => {
    // --- SETUP ---
    const { totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(310, 16)), extraNECTAmount: dec(10, 18), extraParams: { from: alice } })
    const { netDebt: B_netDebt } = await openTrove({ ICR: toBN(dec(290, 16)), extraNECTAmount: dec(8, 18), extraParams: { from: bob } })
    const { netDebt: C_netDebt } = await openTrove({ ICR: toBN(dec(250, 16)), extraNECTAmount: dec(10, 18), extraParams: { from: carol } })
    const partialRedemptionAmount = toBN(2)
    const redemptionAmount = C_netDebt.add(B_netDebt).add(partialRedemptionAmount)
    // start Dennis with a high ICR
    await openTrove({ ICR: toBN(dec(100, 18)), extraNECTAmount: redemptionAmount, extraParams: { from: dennis } })

    const dennis_iBGTBalance_Before = toBN(await iBGTToken.balanceOf(dennis))

    const dennis_NECTBalance_Before = await nectToken.balanceOf(dennis)

    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    // --- TEST ---

    // Find hints for redeeming 20 NECT
    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(redemptionAmount, price, 0)

    // We don't need to use getApproxHint for this test, since it's not the subject of this
    // test case, and the list is very small, so the correct position is quickly found
    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedTroves.findInsertPosition(
      partialRedemptionHintNICR,
      dennis,
      dennis
    )

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Dennis redeems 20 NECT
    // Don't pay for gas, as it makes it easier to calculate the received iBgt
    const redemptionTx = await troveManager.redeemCollateral(
      redemptionAmount,
      erin, // invalid first hint, it doesn’t have a trove
      upperPartialRedemptionHint,
      lowerPartialRedemptionHint,
      partialRedemptionHintNICR,
      0, th._100pct,
      {
        from: dennis,
        gasPrice: GAS_PRICE
      }
    )

    const iBGTFee = th.getEmittedRedemptionValues(redemptionTx)[3]

    const alice_Trove_After = await troveManager.Troves(alice)
    const bob_Trove_After = await troveManager.Troves(bob)
    const carol_Trove_After = await troveManager.Troves(carol)

    const alice_debt_After = alice_Trove_After[0].toString()
    const bob_debt_After = bob_Trove_After[0].toString()
    const carol_debt_After = carol_Trove_After[0].toString()

    /* check that Dennis' redeemed 20 NECT has been cancelled with debt from Bobs's Trove (8) and Carol's Trove (10).
    The remaining lot (2) is sent to Alice's Trove, who had the best ICR.
    It leaves her with (3) NECT debt + 50 for gas compensation. */
    th.assertIsApproximatelyEqual(alice_debt_After, A_totalDebt.sub(partialRedemptionAmount))
    assert.equal(bob_debt_After, '0')
    assert.equal(carol_debt_After, '0')

    const dennis_iBGTBalance_After = toBN(await iBGTToken.balanceOf(dennis))
    const receivediBGT = dennis_iBGTBalance_After.sub(dennis_iBGTBalance_Before)

    const expectedTotaliBGTDrawn = redemptionAmount.div(toBN(200)) // convert redemptionAmount NECT to iBGT, at iBGT:USD price 200
    const expectedReceivediBGT = expectedTotaliBGTDrawn.sub(toBN(iBGTFee)) // substract gas used for troveManager.redeemCollateral from expected received iBGT

    th.assertIsApproximatelyEqual(expectedReceivediBGT, receivediBGT)

    const dennis_NECTBalance_After = (await nectToken.balanceOf(dennis)).toString()
    assert.equal(dennis_NECTBalance_After, dennis_NECTBalance_Before.sub(redemptionAmount))
  })

  it('redeemCollateral(): with invalid first hint, trove below MCR', async () => {
    // --- SETUP ---
    const { totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(310, 16)), extraNECTAmount: dec(10, 18), extraParams: { from: alice } })
    const { netDebt: B_netDebt } = await openTrove({ ICR: toBN(dec(290, 16)), extraNECTAmount: dec(8, 18), extraParams: { from: bob } })
    const { netDebt: C_netDebt } = await openTrove({ ICR: toBN(dec(250, 16)), extraNECTAmount: dec(10, 18), extraParams: { from: carol } })
    const partialRedemptionAmount = toBN(2)
    const redemptionAmount = C_netDebt.add(B_netDebt).add(partialRedemptionAmount)
    // start Dennis with a high ICR
    await openTrove({ ICR: toBN(dec(100, 18)), extraNECTAmount: redemptionAmount, extraParams: { from: dennis } })

    const dennis_iBGTBalance_Before = toBN(await iBGTToken.balanceOf(dennis))

    const dennis_NECTBalance_Before = await nectToken.balanceOf(dennis)

    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    // Increase price to start Erin, and decrease it again so its ICR is under MCR
    await priceFeed.setPrice(price.mul(toBN(2)))
    await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: erin } })
    await priceFeed.setPrice(price)


    // --- TEST ---

    // Find hints for redeeming 20 NECT
    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(redemptionAmount, price, 0)

    // We don't need to use getApproxHint for this test, since it's not the subject of this
    // test case, and the list is very small, so the correct position is quickly found
    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedTroves.findInsertPosition(
      partialRedemptionHintNICR,
      dennis,
      dennis
    )

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Dennis redeems 20 NECT
    // Don't pay for gas, as it makes it easier to calculate the received iBgt
    const redemptionTx = await troveManager.redeemCollateral(
      redemptionAmount,
      erin, // invalid trove, below MCR
      upperPartialRedemptionHint,
      lowerPartialRedemptionHint,
      partialRedemptionHintNICR,
      0, th._100pct,
      {
        from: dennis,
        gasPrice: GAS_PRICE
      }
    )

    const iBGTFee = th.getEmittedRedemptionValues(redemptionTx)[3]

    const alice_Trove_After = await troveManager.Troves(alice)
    const bob_Trove_After = await troveManager.Troves(bob)
    const carol_Trove_After = await troveManager.Troves(carol)

    const alice_debt_After = alice_Trove_After[0].toString()
    const bob_debt_After = bob_Trove_After[0].toString()
    const carol_debt_After = carol_Trove_After[0].toString()

    /* check that Dennis' redeemed 20 NECT has been cancelled with debt from Bobs's Trove (8) and Carol's Trove (10).
    The remaining lot (2) is sent to Alice's Trove, who had the best ICR.
    It leaves her with (3) NECT debt + 50 for gas compensation. */
    th.assertIsApproximatelyEqual(alice_debt_After, A_totalDebt.sub(partialRedemptionAmount))
    assert.equal(bob_debt_After, '0')
    assert.equal(carol_debt_After, '0')

    const dennis_iBGTBalance_After = toBN(await iBGTToken.balanceOf(dennis))
    const receivediBGT = dennis_iBGTBalance_After.sub(dennis_iBGTBalance_Before)

    const expectedTotaliBGTDrawn = redemptionAmount.div(toBN(200)) // convert redemptionAmount NECT to iBGT, at iBGT:USD price 200
    const expectedReceivediBGT = expectedTotaliBGTDrawn.sub(toBN(iBGTFee)) // substract gas used for troveManager.redeemCollateral from expected received iBGT

    th.assertIsApproximatelyEqual(expectedReceivediBGT, receivediBGT)

    const dennis_NECTBalance_After = (await nectToken.balanceOf(dennis)).toString()
    assert.equal(dennis_NECTBalance_After, dennis_NECTBalance_Before.sub(redemptionAmount))
  })

  it('redeemCollateral(): ends the redemption sequence when the token redemption request has been filled', async () => {
    // --- SETUP --- 
    await openTrove({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // Alice, Bob, Carol, Dennis, Erin open troves
    const { netDebt: A_debt } = await openTrove({ ICR: toBN(dec(290, 16)), extraNECTAmount: dec(20, 18), extraParams: { from: alice } })
    const { netDebt: B_debt } = await openTrove({ ICR: toBN(dec(290, 16)), extraNECTAmount: dec(20, 18), extraParams: { from: bob } })
    const { netDebt: C_debt } = await openTrove({ ICR: toBN(dec(290, 16)), extraNECTAmount: dec(20, 18), extraParams: { from: carol } })
    const redemptionAmount = A_debt.add(B_debt).add(C_debt)
    const { totalDebt: D_totalDebt, collateral: D_coll } = await openTrove({ ICR: toBN(dec(300, 16)), extraNECTAmount: dec(10, 18), extraParams: { from: dennis } })
    const { totalDebt: E_totalDebt, collateral: E_coll } = await openTrove({ ICR: toBN(dec(300, 16)), extraNECTAmount: dec(10, 18), extraParams: { from: erin } })

    // --- TEST --- 

    // open trove from redeemer.  Redeemer has highest ICR (100iBGT, 100 NECT), 20000%
    const { nectAmount: F_nectAmount } = await openTrove({ ICR: toBN(dec(200, 18)), extraNECTAmount: redemptionAmount.mul(toBN(2)), extraParams: { from: flyn } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Flyn redeems collateral
    await troveManager.redeemCollateral(redemptionAmount, alice, alice, alice, 0, 0, th._100pct, { from: flyn })

    // Check Flyn's redemption has reduced his balance from 100 to (100-60) = 40 NECT
    const flynBalance = await nectToken.balanceOf(flyn)
    th.assertIsApproximatelyEqual(flynBalance, F_nectAmount.sub(redemptionAmount))

    // Check debt of Alice, Bob, Carol
    const alice_Debt = await troveManager.getTroveDebt(alice)
    const bob_Debt = await troveManager.getTroveDebt(bob)
    const carol_Debt = await troveManager.getTroveDebt(carol)

    assert.equal(alice_Debt, 0)
    assert.equal(bob_Debt, 0)
    assert.equal(carol_Debt, 0)

    // check Alice, Bob and Carol troves are closed by redemption
    const alice_Status = await troveManager.getTroveStatus(alice)
    const bob_Status = await troveManager.getTroveStatus(bob)
    const carol_Status = await troveManager.getTroveStatus(carol)
    assert.equal(alice_Status, 4)
    assert.equal(bob_Status, 4)
    assert.equal(carol_Status, 4)

    // check debt and coll of Dennis, Erin has not been impacted by redemption
    const dennis_Debt = await troveManager.getTroveDebt(dennis)
    const erin_Debt = await troveManager.getTroveDebt(erin)

    th.assertIsApproximatelyEqual(dennis_Debt, D_totalDebt)
    th.assertIsApproximatelyEqual(erin_Debt, E_totalDebt)

    const dennis_Coll = await troveManager.getTroveColl(dennis)
    const erin_Coll = await troveManager.getTroveColl(erin)

    assert.equal(dennis_Coll.toString(), D_coll.toString())
    assert.equal(erin_Coll.toString(), E_coll.toString())
  })

  it('redeemCollateral(): ends the redemption sequence when max iterations have been reached', async () => {
    // --- SETUP --- 
    await openTrove({ ICR: toBN(dec(100, 18)), extraParams: { from: whale } })

    // Alice, Bob, Carol open troves with equal collateral ratio
    const { netDebt: A_debt } = await openTrove({ ICR: toBN(dec(286, 16)), extraNECTAmount: dec(20, 18), extraParams: { from: alice } })
    const { netDebt: B_debt } = await openTrove({ ICR: toBN(dec(286, 16)), extraNECTAmount: dec(20, 18), extraParams: { from: bob } })
    const { netDebt: C_debt, totalDebt: C_totalDebt } = await openTrove({ ICR: toBN(dec(286, 16)), extraNECTAmount: dec(20, 18), extraParams: { from: carol } })
    const redemptionAmount = A_debt.add(B_debt)
    const attemptedRedemptionAmount = redemptionAmount.add(C_debt)

    // --- TEST --- 

    // open trove from redeemer.  Redeemer has highest ICR (100iBGT, 100 NECT), 20000%
    const { nectAmount: F_nectAmount } = await openTrove({ ICR: toBN(dec(200, 18)), extraNECTAmount: redemptionAmount.mul(toBN(2)), extraParams: { from: flyn } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Flyn redeems collateral with only two iterations
    await troveManager.redeemCollateral(attemptedRedemptionAmount, alice, alice, alice, 0, 2, th._100pct, { from: flyn })

    // Check Flyn's redemption has reduced his balance from 100 to (100-40) = 60 NECT
    const flynBalance = (await nectToken.balanceOf(flyn)).toString()
    th.assertIsApproximatelyEqual(flynBalance, F_nectAmount.sub(redemptionAmount))

    // Check debt of Alice, Bob, Carol
    const alice_Debt = await troveManager.getTroveDebt(alice)
    const bob_Debt = await troveManager.getTroveDebt(bob)
    const carol_Debt = await troveManager.getTroveDebt(carol)

    assert.equal(alice_Debt, 0)
    assert.equal(bob_Debt, 0)
    th.assertIsApproximatelyEqual(carol_Debt, C_totalDebt)

    // check Alice and Bob troves are closed, but Carol is not
    const alice_Status = await troveManager.getTroveStatus(alice)
    const bob_Status = await troveManager.getTroveStatus(bob)
    const carol_Status = await troveManager.getTroveStatus(carol)
    assert.equal(alice_Status, 4)
    assert.equal(bob_Status, 4)
    assert.equal(carol_Status, 1)
  })

  it("redeemCollateral(): performs partial redemption if resultant debt is > minimum net debt", async () => {
    await borrowerOperationsOpenTrove(th._100pct, await getOpenTroveNECTAmount(dec(10000, 18)), A, A, dec(1000, 'ether'), { from: A })
    await borrowerOperationsOpenTrove(th._100pct, await getOpenTroveNECTAmount(dec(20000, 18)), B, B, dec(1000, 'ether'), { from: B })
    await borrowerOperationsOpenTrove(th._100pct, await getOpenTroveNECTAmount(dec(30000, 18)), C, C, dec(1000, 'ether'), { from: C })

    // A and C send all their tokens to B
    await nectToken.transfer(B, await nectToken.balanceOf(A), {from: A})
    await nectToken.transfer(B, await nectToken.balanceOf(C), {from: C})
    
    await troveManager.setBaseRate(0) 

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // NECT redemption is 55000 US
    const NECTRedemption = dec(55000, 18)
    const tx1 = await th.redeemCollateralAndGetTxObject(B, contracts, NECTRedemption, th._100pct)
    
    // Check B, C closed and A remains active
    assert.isTrue(await sortedTroves.contains(A))
    assert.isFalse(await sortedTroves.contains(B))
    assert.isFalse(await sortedTroves.contains(C))

    // A's remaining debt = 29800 + 19800 + 9800 + 200 - 55000 = 4600
    const A_debt = await troveManager.getTroveDebt(A)
    await th.assertIsApproximatelyEqual(A_debt, dec(4600, 18), 1000) 
  })

  it("redeemCollateral(): doesn't perform partial redemption if resultant debt would be < minimum net debt", async () => {
    await borrowerOperationsOpenTrove(th._100pct, await getOpenTroveNECTAmount(dec(6000, 18)), A, A, dec(1000, 'ether'), { from: A })
    await borrowerOperationsOpenTrove(th._100pct, await getOpenTroveNECTAmount(dec(20000, 18)), B, B, dec(1000, 'ether'), { from: B })
    await borrowerOperationsOpenTrove(th._100pct, await getOpenTroveNECTAmount(dec(30000, 18)), C, C, dec(1000, 'ether'), { from: C })

    // A and C send all their tokens to B
    await nectToken.transfer(B, await nectToken.balanceOf(A), {from: A})
    await nectToken.transfer(B, await nectToken.balanceOf(C), {from: C})

    await troveManager.setBaseRate(0) 

    // Skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // NECT redemption is 55000 NECT
    const NECTRedemption = dec(55000, 18)
    const tx1 = await th.redeemCollateralAndGetTxObject(B, contracts, NECTRedemption, th._100pct)
    
    // Check B, C closed and A remains active
    assert.isTrue(await sortedTroves.contains(A))
    assert.isFalse(await sortedTroves.contains(B))
    assert.isFalse(await sortedTroves.contains(C))

    // A's remaining debt would be 29950 + 19950 + 5950 + 50 - 55000 = 900.
    // Since this is below the min net debt of 100, A should be skipped and untouched by the redemption
    const A_debt = await troveManager.getTroveDebt(A)
    await th.assertIsApproximatelyEqual(A_debt, dec(6000, 18))
  })

  it('redeemCollateral(): doesnt perform the final partial redemption in the sequence if the hint is out-of-date', async () => {
    // --- SETUP ---
    const { totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(363, 16)), extraNECTAmount: dec(5, 18), extraParams: { from: alice } })
    const { netDebt: B_netDebt } = await openTrove({ ICR: toBN(dec(344, 16)), extraNECTAmount: dec(8, 18), extraParams: { from: bob } })
    const { netDebt: C_netDebt } = await openTrove({ ICR: toBN(dec(333, 16)), extraNECTAmount: dec(10, 18), extraParams: { from: carol } })

    const partialRedemptionAmount = toBN(2)
    const fullfilledRedemptionAmount = C_netDebt.add(B_netDebt)
    const redemptionAmount = fullfilledRedemptionAmount.add(partialRedemptionAmount)

    await openTrove({ ICR: toBN(dec(100, 18)), extraNECTAmount: redemptionAmount, extraParams: { from: dennis } })

    const dennis_iBGTBalance_Before = toBN(await iBGTToken.balanceOf(dennis))

    const dennis_NECTBalance_Before = await nectToken.balanceOf(dennis)

    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    // --- TEST --- 

    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(redemptionAmount, price, 0)

    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedTroves.findInsertPosition(
      partialRedemptionHintNICR,
      dennis,
      dennis
    )

    const frontRunRedepmtion = toBN(dec(1, 18))
    // Oops, another transaction gets in the way
    {
      const {
        firstRedemptionHint,
        partialRedemptionHintNICR
      } = await hintHelpers.getRedemptionHints(dec(1, 18), price, 0)

      const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedTroves.findInsertPosition(
        partialRedemptionHintNICR,
        dennis,
        dennis
      )

      // skip bootstrapping phase
      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

      // Alice redeems 1 NECT from Carol's Trove
      await troveManager.redeemCollateral(
        frontRunRedepmtion,
        firstRedemptionHint,
        upperPartialRedemptionHint,
        lowerPartialRedemptionHint,
        partialRedemptionHintNICR,
        0, th._100pct,
        { from: alice }
      )
    }

    // Dennis tries to redeem 20 NECT
    const redemptionTx = await troveManager.redeemCollateral(
      redemptionAmount,
      firstRedemptionHint,
      upperPartialRedemptionHint,
      lowerPartialRedemptionHint,
      partialRedemptionHintNICR,
      0, th._100pct,
      {
        from: dennis,
        gasPrice: GAS_PRICE
      }
    )

    const iBGTFee = th.getEmittedRedemptionValues(redemptionTx)[3]

    // Since Alice already redeemed 1 NECT from Carol's Trove, Dennis was  able to redeem:
    //  - 9 NECT from Carol's
    //  - 8 NECT from Bob's
    // for a total of 17 NECT.

    // Dennis calculated his hint for redeeming 2 NECT from Alice's Trove, but after Alice's transaction
    // got in the way, he would have needed to redeem 3 NECT to fully complete his redemption of 20 NECT.
    // This would have required a different hint, therefore he ended up with a partial redemption.

    const dennis_iBGTBalance_After = toBN(await iBGTToken.balanceOf(dennis))
    const receivediBGT = dennis_iBGTBalance_After.sub(dennis_iBGTBalance_Before)

    // Expect only 17 worth of iBGT drawn
    const expectedTotaliBGTDrawn = fullfilledRedemptionAmount.sub(frontRunRedepmtion).div(toBN(200)) // redempted NECT converted to iBGT, at iBGT:USD price 200
    const expectedReceivediBGT = expectedTotaliBGTDrawn.sub(iBGTFee) // substract gas used for troveManager.redeemCollateral from expected received iBGT

    th.assertIsApproximatelyEqual(expectedReceivediBGT, receivediBGT)

    const dennis_NECTBalance_After = (await nectToken.balanceOf(dennis)).toString()
    th.assertIsApproximatelyEqual(dennis_NECTBalance_After, dennis_NECTBalance_Before.sub(fullfilledRedemptionAmount.sub(frontRunRedepmtion)))
  })

  // active debt cannot be zero, as there’s a positive min debt enforced, and at least a trove must exist
  it.skip("redeemCollateral(): can redeem if there is zero active debt but non-zero debt in DefaultPool", async () => {
    // --- SETUP ---

    const amount = await getOpenTroveNECTAmount(dec(110, 18))
    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(133, 16)), extraNECTAmount: amount, extraParams: { from: bob } })

    await nectToken.transfer(carol, amount, { from: bob })

    const price = dec(100, 18)
    await priceFeed.setPrice(price)

    // Liquidate Bob's Trove
    await troveManager.liquidateTroves(1)

    // --- TEST --- 

    const carol_iBGTBalance_Before = toBN(await iBGTToken.balanceOf(carol))

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    const redemptionTx = await troveManager.redeemCollateral(
      amount,
      alice,
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
      '10367038690476190477',
      0,
      th._100pct,
      {
        from: carol,
        gasPrice: GAS_PRICE
      }
    )

    const iBGTFee = th.getEmittedRedemptionValues(redemptionTx)[3]

    const carol_iBGTBalance_After = toBN(await iBGTToken.balanceOf(carol))

    const expectedTotaliBGTDrawn = toBN(amount).div(toBN(100)) // convert 100 NECT to iBGT at iBGT:USD price of 100
    const expectedReceivediBGT = expectedTotaliBGTDrawn.sub(iBGTFee)

    const receivediBGT = carol_iBGTBalance_After.sub(carol_iBGTBalance_Before)
    assert.isTrue(expectedReceivediBGT.eq(receivediBGT))

    const carol_NECTBalance_After = (await nectToken.balanceOf(carol)).toString()
    assert.equal(carol_NECTBalance_After, '0')
  })

  it("redeemCollateral(): doesn't touch Troves with ICR < 110%", async () => {
    // --- SETUP ---

    const { netDebt: A_debt } = await openTrove({ ICR: toBN(dec(13, 18)), extraParams: { from: alice } })
    const { nectAmount: B_nectAmount, totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(133, 16)), extraNECTAmount: A_debt, extraParams: { from: bob } })

    await nectToken.transfer(carol, B_nectAmount, { from: bob })

    // Put Bob's Trove below 110% ICR
    const price = dec(100, 18)
    await priceFeed.setPrice(price)

    // --- TEST --- 

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    await troveManager.redeemCollateral(
      A_debt,
      alice,
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
      0,
      0,
      th._100pct,
      { from: carol }
    );

    // Alice's Trove was cleared of debt
    const { debt: alice_Debt_After } = await troveManager.Troves(alice)
    assert.equal(alice_Debt_After, '0')

    // Bob's Trove was left untouched
    const { debt: bob_Debt_After } = await troveManager.Troves(bob)
    th.assertIsApproximatelyEqual(bob_Debt_After, B_totalDebt)
  });

  it("redeemCollateral(): finds the last Trove with ICR == 110% even if there is more than one", async () => {
    // --- SETUP ---
    const amount1 = toBN(dec(100, 18))
    const { totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: amount1, extraParams: { from: alice } })
    const { totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: amount1, extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: amount1, extraParams: { from: carol } })
    const redemptionAmount = C_totalDebt.add(B_totalDebt).add(A_totalDebt)
    const { totalDebt: D_totalDebt } = await openTrove({ ICR: toBN(dec(195, 16)), extraNECTAmount: redemptionAmount, extraParams: { from: dennis } })

    // This will put Dennis slightly below 110%, and everyone else exactly at 110%
    const price = '110' + _18_zeros
    await priceFeed.setPrice(price)

    const orderOfTroves = [];
    let current = await sortedTroves.getFirst();

    while (current !== '0x0000000000000000000000000000000000000000') {
      orderOfTroves.push(current);
      current = await sortedTroves.getNext(current);
    }

    assert.deepEqual(orderOfTroves, [carol, bob, alice, dennis]);

    await openTrove({ ICR: toBN(dec(100, 18)), extraNECTAmount: dec(10, 18), extraParams: { from: whale } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    const tx = await troveManager.redeemCollateral(
      redemptionAmount,
      carol, // try to trick redeemCollateral by passing a hint that doesn't exactly point to the
      // last Trove with ICR == 110% (which would be Alice's)
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000',
      0,
      0,
      th._100pct,
      { from: dennis }
    )
    
    const { debt: alice_Debt_After } = await troveManager.Troves(alice)
    assert.equal(alice_Debt_After, '0')

    const { debt: bob_Debt_After } = await troveManager.Troves(bob)
    assert.equal(bob_Debt_After, '0')

    const { debt: carol_Debt_After } = await troveManager.Troves(carol)
    assert.equal(carol_Debt_After, '0')

    const { debt: dennis_Debt_After } = await troveManager.Troves(dennis)
    th.assertIsApproximatelyEqual(dennis_Debt_After, D_totalDebt)
  });

  it("redeemCollateral(): reverts when TCR < MCR", async () => {
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(196, 16)), extraParams: { from: dennis } })

    // This will put Dennis slightly below 110%, and everyone else exactly at 110%
  
    await priceFeed.setPrice('110' + _18_zeros)
    const price = await priceFeed.getPrice()
    
    const TCR = (await th.getTCR(contracts))
    assert.isTrue(TCR.lt(toBN('1100000000000000000')))

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    await assertRevert(th.redeemCollateral(carol, contracts, GAS_PRICE, dec(270, 18)), "TroveManager: Cannot redeem when TCR < MCR")
  });

  it("redeemCollateral(): reverts when argument _amount is 0", async () => {
    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    // Alice opens trove and transfers 500NECT to Erin, the would-be redeemer
    await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(500, 18), extraParams: { from: alice } })
    await nectToken.transfer(erin, dec(500, 18), { from: alice })

    // B, C and D open troves
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: bob } })
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: carol } })
    await openTrove({ ICR: toBN(dec(200, 16)), extraParams: { from: dennis } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Erin attempts to redeem with _amount = 0
    const redemptionTxPromise = troveManager.redeemCollateral(0, erin, erin, erin, 0, 0, th._100pct, { from: erin })
    await assertRevert(redemptionTxPromise, "TroveManager: Amount must be greater than zero")
  })

  it("redeemCollateral(): reverts if max fee > 100%", async () => {
    await openTrove({ ICR: toBN(dec(400, 16)), extraNECTAmount: dec(10, 18), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(400, 16)), extraNECTAmount: dec(20, 18), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(400, 16)), extraNECTAmount: dec(30, 18), extraParams: { from: C } })
    await openTrove({ ICR: toBN(dec(400, 16)), extraNECTAmount: dec(40, 18), extraParams: { from: D } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, dec(10, 18), GAS_PRICE ,dec(2, 18)), "Max fee percentage must be between 0.5% and 100%")
    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, dec(10, 18), GAS_PRICE, '1000000000000000001'), "Max fee percentage must be between 0.5% and 100%")
  })

  it("redeemCollateral(): reverts if max fee < 0.5%", async () => { 
    await openTrove({ ICR: toBN(dec(400, 16)), extraNECTAmount: dec(10, 18), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(400, 16)), extraNECTAmount: dec(20, 18), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(400, 16)), extraNECTAmount: dec(30, 18), extraParams: { from: C } })
    await openTrove({ ICR: toBN(dec(400, 16)), extraNECTAmount: dec(40, 18), extraParams: { from: D } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, GAS_PRICE, dec(10, 18), 0), "Max fee percentage must be between 0.5% and 100%")
    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, GAS_PRICE, dec(10, 18), 1), "Max fee percentage must be between 0.5% and 100%")
    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, GAS_PRICE, dec(10, 18), '4999999999999999'), "Max fee percentage must be between 0.5% and 100%")
  })

  it("redeemCollateral(): reverts if fee exceeds max fee percentage", async () => {
    const { totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(400, 16)), extraNECTAmount: dec(80, 18), extraParams: { from: A } })
    const { totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(400, 16)), extraNECTAmount: dec(90, 18), extraParams: { from: B } })
    const { totalDebt: C_totalDebt } = await openTrove({ ICR: toBN(dec(400, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: C } })
    const expectedTotalSupply = A_totalDebt.add(B_totalDebt).add(C_totalDebt)

    // Check total NECT supply
    const totalSupply = await nectToken.totalSupply()
    th.assertIsApproximatelyEqual(totalSupply, expectedTotalSupply)

    await troveManager.setBaseRate(0) 

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // NECT redemption is 27 USD: a redemption that incurs a fee of 27/(270 * 2) = 5%
    const attemptedNECTRedemption = expectedTotalSupply.div(toBN(10))

    // Max fee is <5%
    const lessThan5pct = '49999999999999999'
    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, attemptedNECTRedemption, lessThan5pct), "Fee exceeded provided maximum")
  
    await troveManager.setBaseRate(0)  // artificially zero the baseRate
    
    // Max fee is 1%
    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, attemptedNECTRedemption, dec(1, 16)), "Fee exceeded provided maximum")
  
    await troveManager.setBaseRate(0)

     // Max fee is 3.754%
    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, attemptedNECTRedemption, dec(3754, 13)), "Fee exceeded provided maximum")
  
    await troveManager.setBaseRate(0)

    // Max fee is 0.5%
    await assertRevert(th.redeemCollateralAndGetTxObject(A, contracts, attemptedNECTRedemption, dec(5, 15)), "Fee exceeded provided maximum")
  })

  it("redeemCollateral(): succeeds if fee is less than max fee percentage", async () => {
    const { totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(400, 16)), extraNECTAmount: dec(9500, 18), extraParams: { from: A } })
    const { totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(395, 16)), extraNECTAmount: dec(9000, 18), extraParams: { from: B } })
    const { totalDebt: C_totalDebt } = await openTrove({ ICR: toBN(dec(390, 16)), extraNECTAmount: dec(10000, 18), extraParams: { from: C } })
    const expectedTotalSupply = A_totalDebt.add(B_totalDebt).add(C_totalDebt)

    // Check total NECT supply
    const totalSupply = await nectToken.totalSupply()
    th.assertIsApproximatelyEqual(totalSupply, expectedTotalSupply)

    await troveManager.setBaseRate(0) 

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // NECT redemption fee with 10% of the supply will be 0.5% + 1/(10*2)
    const attemptedNECTRedemption = expectedTotalSupply.div(toBN(10))

    // Attempt with maxFee > 5.5%
    const price = await priceFeed.getPrice()
    const iBGTDrawn = attemptedNECTRedemption.mul(mv._1e18BN).div(price)
    const slightlyMoreThanFee = (await troveManager.getRedemptionFeeWithDecay(iBGTDrawn))
    const tx1 = await th.redeemCollateralAndGetTxObject(A, contracts, attemptedNECTRedemption, slightlyMoreThanFee)
    assert.isTrue(tx1.receipt.status)

    await troveManager.setBaseRate(0)  // Artificially zero the baseRate
    
    // Attempt with maxFee = 5.5%
    const exactSameFee = (await troveManager.getRedemptionFeeWithDecay(iBGTDrawn))
    const tx2 = await th.redeemCollateralAndGetTxObject(C, contracts, attemptedNECTRedemption, exactSameFee)
    assert.isTrue(tx2.receipt.status)

    await troveManager.setBaseRate(0)

     // Max fee is 10%
    const tx3 = await th.redeemCollateralAndGetTxObject(B, contracts, attemptedNECTRedemption, dec(1, 17))
    assert.isTrue(tx3.receipt.status)

    await troveManager.setBaseRate(0)

    // Max fee is 37.659%
    const tx4 = await th.redeemCollateralAndGetTxObject(A, contracts, attemptedNECTRedemption, dec(37659, 13))
    assert.isTrue(tx4.receipt.status)

    await troveManager.setBaseRate(0)

    // Max fee is 100%
    const tx5 = await th.redeemCollateralAndGetTxObject(C, contracts, attemptedNECTRedemption, dec(1, 18))
    assert.isTrue(tx5.receipt.status)
  })

  it("redeemCollateral(): doesn't affect the Stability Pool deposits or iBGT gain of redeemed-from troves", async () => {
    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    // B, C, D, F open trove
    const { totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: bob } })
    const { totalDebt: C_totalDebt } = await openTrove({ ICR: toBN(dec(195, 16)), extraNECTAmount: dec(200, 18), extraParams: { from: carol } })
    const { totalDebt: D_totalDebt } = await openTrove({ ICR: toBN(dec(190, 16)), extraNECTAmount: dec(400, 18), extraParams: { from: dennis } })
    const { totalDebt: F_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: flyn } })

    const redemptionAmount = B_totalDebt.add(C_totalDebt).add(D_totalDebt).add(F_totalDebt)
    // Alice opens trove and transfers NECT to Erin, the would-be redeemer
    await openTrove({ ICR: toBN(dec(300, 16)), extraNECTAmount: redemptionAmount, extraParams: { from: alice } })
    await nectToken.transfer(erin, redemptionAmount, { from: alice })

    // B, C, D deposit some of their tokens to the Stability Pool
    await stabilityPool.provideToSP(dec(50, 18), ZERO_ADDRESS, { from: bob })
    await stabilityPool.provideToSP(dec(150, 18), ZERO_ADDRESS, { from: carol })
    await stabilityPool.provideToSP(dec(200, 18), ZERO_ADDRESS, { from: dennis })

    let price = await priceFeed.getPrice()
    const bob_ICR_before = await troveManager.getCurrentICR(bob, price)
    const carol_ICR_before = await troveManager.getCurrentICR(carol, price)
    const dennis_ICR_before = await troveManager.getCurrentICR(dennis, price)

    // Price drops
    await priceFeed.setPrice(dec(100, 18))

    assert.isTrue(await sortedTroves.contains(flyn))

    // Liquidate Flyn
    await troveManager.liquidate(flyn)
    assert.isFalse(await sortedTroves.contains(flyn))

    // Price bounces back, bringing B, C, D back above MCR
    await priceFeed.setPrice(dec(200, 18))

    const bob_SPDeposit_before = (await stabilityPool.getCompoundedNECTDeposit(bob)).toString()
    const carol_SPDeposit_before = (await stabilityPool.getCompoundedNECTDeposit(carol)).toString()
    const dennis_SPDeposit_before = (await stabilityPool.getCompoundedNECTDeposit(dennis)).toString()

    const bob_iBGTGain_before = (await stabilityPool.getDepositoriBGTGain(bob)).toString()
    const carol_iBGTGain_before = (await stabilityPool.getDepositoriBGTGain(carol)).toString()
    const dennis_iBGTGain_before = (await stabilityPool.getDepositoriBGTGain(dennis)).toString()

    // Check the remaining NECT and iBGT in Stability Pool after liquidation is non-zero
    const NECTinSP = await stabilityPool.getTotalNECTDeposits()
    const iBGTinSP = await stabilityPool.getiBGT()
    assert.isTrue(NECTinSP.gte(mv._zeroBN))
    assert.isTrue(iBGTinSP.gte(mv._zeroBN))

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Erin redeems NECT
    await th.redeemCollateral(erin, contracts, redemptionAmount, th._100pct)

    price = await priceFeed.getPrice()
    const bob_ICR_after = await troveManager.getCurrentICR(bob, price)
    const carol_ICR_after = await troveManager.getCurrentICR(carol, price)
    const dennis_ICR_after = await troveManager.getCurrentICR(dennis, price)

    // Check ICR of B, C and D troves has increased,i.e. they have been hit by redemptions
    assert.isTrue(bob_ICR_after.gte(bob_ICR_before))
    assert.isTrue(carol_ICR_after.gte(carol_ICR_before))
    assert.isTrue(dennis_ICR_after.gte(dennis_ICR_before))

    const bob_SPDeposit_after = (await stabilityPool.getCompoundedNECTDeposit(bob)).toString()
    const carol_SPDeposit_after = (await stabilityPool.getCompoundedNECTDeposit(carol)).toString()
    const dennis_SPDeposit_after = (await stabilityPool.getCompoundedNECTDeposit(dennis)).toString()

    const bob_iBGTGain_after = (await stabilityPool.getDepositoriBGTGain(bob)).toString()
    const carol_iBGTGain_after = (await stabilityPool.getDepositoriBGTGain(carol)).toString()
    const dennis_iBGTGain_after = (await stabilityPool.getDepositoriBGTGain(dennis)).toString()

    // Check B, C, D Stability Pool deposits and iBGT gain have not been affected by redemptions from their troves
    assert.equal(bob_SPDeposit_before, bob_SPDeposit_after)
    assert.equal(carol_SPDeposit_before, carol_SPDeposit_after)
    assert.equal(dennis_SPDeposit_before, dennis_SPDeposit_after)

    assert.equal(bob_iBGTGain_before, bob_iBGTGain_after)
    assert.equal(carol_iBGTGain_before, carol_iBGTGain_after)
    assert.equal(dennis_iBGTGain_before, dennis_iBGTGain_after)
  })

  it("redeemCollateral(): caller can redeem their entire NECTToken balance", async () => {
    const { collateral: W_coll, totalDebt: W_totalDebt } = await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    // Alice opens trove and transfers 400 NECT to Erin, the would-be redeemer
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(300, 16)), extraNECTAmount: dec(400, 18), extraParams: { from: alice } })
    await nectToken.transfer(erin, dec(400, 18), { from: alice })

    // Check Erin's balance before
    const erin_balance_before = await nectToken.balanceOf(erin)
    assert.equal(erin_balance_before, dec(400, 18))

    // B, C, D open trove
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(300, 16)), extraNECTAmount: dec(590, 18), extraParams: { from: bob } })
    const { collateral: C_coll, totalDebt: C_totalDebt } = await openTrove({ ICR: toBN(dec(300, 16)), extraNECTAmount: dec(1990, 18), extraParams: { from: carol } })
    const { collateral: D_coll, totalDebt: D_totalDebt } = await openTrove({ ICR: toBN(dec(500, 16)), extraNECTAmount: dec(1990, 18), extraParams: { from: dennis } })

    const totalDebt = W_totalDebt.add(A_totalDebt).add(B_totalDebt).add(C_totalDebt).add(D_totalDebt)
    const totalColl = W_coll.add(A_coll).add(B_coll).add(C_coll).add(D_coll)

    // Get active debt and coll before redemption
    const activePool_debt_before = await activePool.getNECTDebt()
    const activePool_coll_before = await activePool.getiBGT()

    th.assertIsApproximatelyEqual(activePool_debt_before, totalDebt)
    assert.equal(activePool_coll_before.toString(), totalColl)

    const price = await priceFeed.getPrice()

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Erin attempts to redeem 400 NECT
    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(dec(400, 18), price, 0)

    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedTroves.findInsertPosition(
      partialRedemptionHintNICR,
      erin,
      erin
    )

    await troveManager.redeemCollateral(
      dec(400, 18),
      firstRedemptionHint,
      upperPartialRedemptionHint,
      lowerPartialRedemptionHint,
      partialRedemptionHintNICR,
      0, th._100pct,
      { from: erin })

    // Check activePool debt reduced by  400 NECT
    const activePool_debt_after = await activePool.getNECTDebt()
    assert.equal(activePool_debt_before.sub(activePool_debt_after), dec(400, 18))

    /* Check ActivePool coll reduced by $400 worth of iBgt: at iBGT:USD price of $200, this should be 2 iBGT.

    therefore remaining ActivePool iBGT should be 198 */
    const activePool_coll_after = await activePool.getiBGT()
    // console.log(`activePool_coll_after: ${activePool_coll_after}`)
    assert.equal(activePool_coll_after.toString(), activePool_coll_before.sub(toBN(dec(2, 18))))

    // Check Erin's balance after
    const erin_balance_after = (await nectToken.balanceOf(erin)).toString()
    assert.equal(erin_balance_after, '0')
  })

  it("redeemCollateral(): reverts when requested redemption amount exceeds caller's NECT token balance", async () => {
    const { collateral: W_coll, totalDebt: W_totalDebt } = await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    // Alice opens trove and transfers 400 NECT to Erin, the would-be redeemer
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(300, 16)), extraNECTAmount: dec(400, 18), extraParams: { from: alice } })
    await nectToken.transfer(erin, dec(400, 18), { from: alice })

    // Check Erin's balance before
    const erin_balance_before = await nectToken.balanceOf(erin)
    assert.equal(erin_balance_before, dec(400, 18))

    // B, C, D open trove
    const { collateral: B_coll, totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(300, 16)), extraNECTAmount: dec(590, 18), extraParams: { from: bob } })
    const { collateral: C_coll, totalDebt: C_totalDebt } = await openTrove({ ICR: toBN(dec(300, 16)), extraNECTAmount: dec(1990, 18), extraParams: { from: carol } })
    const { collateral: D_coll, totalDebt: D_totalDebt } = await openTrove({ ICR: toBN(dec(500, 16)), extraNECTAmount: dec(1990, 18), extraParams: { from: dennis } })

    const totalDebt = W_totalDebt.add(A_totalDebt).add(B_totalDebt).add(C_totalDebt).add(D_totalDebt)
    const totalColl = W_coll.add(A_coll).add(B_coll).add(C_coll).add(D_coll)

    // Get active debt and coll before redemption
    const activePool_debt_before = await activePool.getNECTDebt()
    const activePool_coll_before = (await activePool.getiBGT()).toString()

    th.assertIsApproximatelyEqual(activePool_debt_before, totalDebt)
    assert.equal(activePool_coll_before, totalColl)

    const price = await priceFeed.getPrice()

    let firstRedemptionHint
    let partialRedemptionHintNICR

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Erin tries to redeem 1000 NECT
    try {
      ({
        firstRedemptionHint,
        partialRedemptionHintNICR
      } = await hintHelpers.getRedemptionHints(dec(1000, 18), price, 0))

      const { 0: upperPartialRedemptionHint_1, 1: lowerPartialRedemptionHint_1 } = await sortedTroves.findInsertPosition(
        partialRedemptionHintNICR,
        erin,
        erin
      )

      const redemptionTx = await troveManager.redeemCollateral(
        dec(1000, 18),
        firstRedemptionHint,
        upperPartialRedemptionHint_1,
        lowerPartialRedemptionHint_1,
        partialRedemptionHintNICR,
        0, th._100pct,
        { from: erin })

      assert.isFalse(redemptionTx.receipt.status)
    } catch (error) {
      assert.include(error.message, "revert")
      assert.include(error.message, "Requested redemption amount must be <= user's NECT token balance")
    }

    // Erin tries to redeem 401 NECT
    try {
      ({
        firstRedemptionHint,
        partialRedemptionHintNICR
      } = await hintHelpers.getRedemptionHints('401000000000000000000', price, 0))

      const { 0: upperPartialRedemptionHint_2, 1: lowerPartialRedemptionHint_2 } = await sortedTroves.findInsertPosition(
        partialRedemptionHintNICR,
        erin,
        erin
      )

      const redemptionTx = await troveManager.redeemCollateral(
        '401000000000000000000', firstRedemptionHint,
        upperPartialRedemptionHint_2,
        lowerPartialRedemptionHint_2,
        partialRedemptionHintNICR,
        0, th._100pct,
        { from: erin })
      assert.isFalse(redemptionTx.receipt.status)
    } catch (error) {
      assert.include(error.message, "revert")
      assert.include(error.message, "Requested redemption amount must be <= user's NECT token balance")
    }

    // Erin tries to redeem 239482309 NECT
    try {
      ({
        firstRedemptionHint,
        partialRedemptionHintNICR
      } = await hintHelpers.getRedemptionHints('239482309000000000000000000', price, 0))

      const { 0: upperPartialRedemptionHint_3, 1: lowerPartialRedemptionHint_3 } = await sortedTroves.findInsertPosition(
        partialRedemptionHintNICR,
        erin,
        erin
      )

      const redemptionTx = await troveManager.redeemCollateral(
        '239482309000000000000000000', firstRedemptionHint,
        upperPartialRedemptionHint_3,
        lowerPartialRedemptionHint_3,
        partialRedemptionHintNICR,
        0, th._100pct,
        { from: erin })
      assert.isFalse(redemptionTx.receipt.status)
    } catch (error) {
      assert.include(error.message, "revert")
      assert.include(error.message, "Requested redemption amount must be <= user's NECT token balance")
    }

    // Erin tries to redeem 2^256 - 1 NECT
    const maxBytes32 = toBN('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

    try {
      ({
        firstRedemptionHint,
        partialRedemptionHintNICR
      } = await hintHelpers.getRedemptionHints('239482309000000000000000000', price, 0))

      const { 0: upperPartialRedemptionHint_4, 1: lowerPartialRedemptionHint_4 } = await sortedTroves.findInsertPosition(
        partialRedemptionHintNICR,
        erin,
        erin
      )

      const redemptionTx = await troveManager.redeemCollateral(
        maxBytes32, firstRedemptionHint,
        upperPartialRedemptionHint_4,
        lowerPartialRedemptionHint_4,
        partialRedemptionHintNICR,
        0, th._100pct,
        { from: erin })
      assert.isFalse(redemptionTx.receipt.status)
    } catch (error) {
      assert.include(error.message, "revert")
      assert.include(error.message, "Requested redemption amount must be <= user's NECT token balance")
    }
  })

  it("redeemCollateral(): value of issued iBGT == face value of redeemed NECT (assuming 1 NECT has value of $1)", async () => {
    const { collateral: W_coll } = await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    // Alice opens trove and transfers 1000 NECT each to Erin, Flyn, Graham
    const { collateral: A_coll, totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(400, 16)), extraNECTAmount: dec(4990, 18), extraParams: { from: alice } })
    await nectToken.transfer(erin, dec(1000, 18), { from: alice })
    await nectToken.transfer(flyn, dec(1000, 18), { from: alice })
    await nectToken.transfer(graham, dec(1000, 18), { from: alice })

    // B, C, D open trove
    const { collateral: B_coll } = await openTrove({ ICR: toBN(dec(300, 16)), extraNECTAmount: dec(1590, 18), extraParams: { from: bob } })
    const { collateral: C_coll } = await openTrove({ ICR: toBN(dec(600, 16)), extraNECTAmount: dec(1090, 18), extraParams: { from: carol } })
    const { collateral: D_coll } = await openTrove({ ICR: toBN(dec(800, 16)), extraNECTAmount: dec(1090, 18), extraParams: { from: dennis } })

    const totalColl = W_coll.add(A_coll).add(B_coll).add(C_coll).add(D_coll)

    const price = await priceFeed.getPrice()

    const _120_NECT = '120000000000000000000'
    const _373_NECT = '373000000000000000000'
    const _950_NECT = '950000000000000000000'

    // Check iBgt in activePool
    const activeiBGT_0 = await activePool.getiBGT()
    assert.equal(activeiBGT_0, totalColl.toString());

    let firstRedemptionHint
    let partialRedemptionHintNICR


    // Erin redeems 120 NECT
    ({
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(_120_NECT, price, 0))

    const { 0: upperPartialRedemptionHint_1, 1: lowerPartialRedemptionHint_1 } = await sortedTroves.findInsertPosition(
      partialRedemptionHintNICR,
      erin,
      erin
    )

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    const redemption_1 = await troveManager.redeemCollateral(
      _120_NECT,
      firstRedemptionHint,
      upperPartialRedemptionHint_1,
      lowerPartialRedemptionHint_1,
      partialRedemptionHintNICR,
      0, th._100pct,
      { from: erin })

    assert.isTrue(redemption_1.receipt.status);

    /* 120 NECT redeemed.  Expect $120 worth of iBGT removed. At iBGT:USD price of $200, 
    iBGT removed = (120/200) = 0.6 iBGT
    Total active iBGT = 280 - 0.6 = 279.4 iBGT */

    const activeiBGT_1 = await activePool.getiBGT()
    assert.equal(activeiBGT_1.toString(), activeiBGT_0.sub(toBN(_120_NECT).mul(mv._1e18BN).div(price)));

    // Flyn redeems 373 NECT
    ({
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(_373_NECT, price, 0))

    const { 0: upperPartialRedemptionHint_2, 1: lowerPartialRedemptionHint_2 } = await sortedTroves.findInsertPosition(
      partialRedemptionHintNICR,
      flyn,
      flyn
    )

    const redemption_2 = await troveManager.redeemCollateral(
      _373_NECT,
      firstRedemptionHint,
      upperPartialRedemptionHint_2,
      lowerPartialRedemptionHint_2,
      partialRedemptionHintNICR,
      0, th._100pct,
      { from: flyn })

    assert.isTrue(redemption_2.receipt.status);

    /* 373 NECT redeemed.  Expect $373 worth of iBGT removed. At iBGT:USD price of $200, 
    iBGT removed = (373/200) = 1.865 iBGT
    Total active iBGT = 279.4 - 1.865 = 277.535 iBGT */
    const activeiBGT_2 = await activePool.getiBGT()
    assert.equal(activeiBGT_2.toString(), activeiBGT_1.sub(toBN(_373_NECT).mul(mv._1e18BN).div(price)));

    // Graham redeems 950 NECT
    ({
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(_950_NECT, price, 0))

    const { 0: upperPartialRedemptionHint_3, 1: lowerPartialRedemptionHint_3 } = await sortedTroves.findInsertPosition(
      partialRedemptionHintNICR,
      graham,
      graham
    )

    const redemption_3 = await troveManager.redeemCollateral(
      _950_NECT,
      firstRedemptionHint,
      upperPartialRedemptionHint_3,
      lowerPartialRedemptionHint_3,
      partialRedemptionHintNICR,
      0, th._100pct,
      { from: graham })

    assert.isTrue(redemption_3.receipt.status);

    /* 950 NECT redeemed.  Expect $950 worth of iBGT removed. At iBGT:USD price of $200, 
    iBGT removed = (950/200) = 4.75 iBGT
    Total active iBGT = 277.535 - 4.75 = 272.785 iBGT */
    const activeiBGT_3 = (await activePool.getiBGT()).toString()
    assert.equal(activeiBGT_3.toString(), activeiBGT_2.sub(toBN(_950_NECT).mul(mv._1e18BN).div(price)));
  })

  // it doesn’t make much sense as there’s now min debt enforced and at least one trove must remain active
  // the only way to test it is before any trove is opened
  it("redeemCollateral(): reverts if there is zero outstanding system debt", async () => {
    // --- SETUP --- illegally mint NECT to Bob
    await nectToken.unprotectedMint(bob, dec(100, 18))

    assert.equal((await nectToken.balanceOf(bob)), dec(100, 18))

    const price = await priceFeed.getPrice()

    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(dec(100, 18), price, 0)

    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedTroves.findInsertPosition(
      partialRedemptionHintNICR,
      bob,
      bob
    )

    // Bob tries to redeem his illegally obtained NECT
    try {
      const redemptionTx = await troveManager.redeemCollateral(
        dec(100, 18),
        firstRedemptionHint,
        upperPartialRedemptionHint,
        lowerPartialRedemptionHint,
        partialRedemptionHintNICR,
        0, th._100pct,
        { from: bob })
    } catch (error) {
      assert.include(error.message, "VM Exception while processing transaction")
    }

    // assert.isFalse(redemptionTx.receipt.status);
  })

  it("redeemCollateral(): reverts if caller's tries to redeem more than the outstanding system debt", async () => {
    // --- SETUP --- illegally mint NECT to Bob
    await nectToken.unprotectedMint(bob, '101000000000000000000')

    assert.equal((await nectToken.balanceOf(bob)), '101000000000000000000')

    const { collateral: C_coll, totalDebt: C_totalDebt } = await openTrove({ ICR: toBN(dec(1000, 16)), extraNECTAmount: dec(40, 18), extraParams: { from: carol } })
    const { collateral: D_coll, totalDebt: D_totalDebt } = await openTrove({ ICR: toBN(dec(1000, 16)), extraNECTAmount: dec(40, 18), extraParams: { from: dennis } })

    const totalDebt = C_totalDebt.add(D_totalDebt)
    th.assertIsApproximatelyEqual((await activePool.getNECTDebt()).toString(), totalDebt)

    const price = await priceFeed.getPrice()
    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints('101000000000000000000', price, 0)

    const { 0: upperPartialRedemptionHint, 1: lowerPartialRedemptionHint } = await sortedTroves.findInsertPosition(
      partialRedemptionHintNICR,
      bob,
      bob
    )

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // Bob attempts to redeem his ill-gotten 101 NECT, from a system that has 100 NECT outstanding debt
    try {
      const redemptionTx = await troveManager.redeemCollateral(
        totalDebt.add(toBN(dec(100, 18))),
        firstRedemptionHint,
        upperPartialRedemptionHint,
        lowerPartialRedemptionHint,
        partialRedemptionHintNICR,
        0, th._100pct,
        { from: bob })
    } catch (error) {
      assert.include(error.message, "VM Exception while processing transaction")
    }
  })

  // Redemption fees 
  it("redeemCollateral(): a redemption made when base rate is zero increases the base rate", async () => {
    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(190, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(180, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: C } })

    // Check baseRate == 0
    assert.equal(await troveManager.baseRate(), '0')

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    const A_balanceBefore = await nectToken.balanceOf(A)

    await th.redeemCollateral(A, contracts, dec(10, 18), GAS_PRICE)

    // Check A's balance has decreased by 10 NECT
    assert.equal(await nectToken.balanceOf(A), A_balanceBefore.sub(toBN(dec(10, 18))).toString())

    // Check baseRate is now non-zero
    assert.isTrue((await troveManager.baseRate()).gt(toBN('0')))
  })

  it("redeemCollateral(): a redemption made when base rate is non-zero increases the base rate, for negligible time passed", async () => {
    // time fast-forwards 1 year, and multisig stakes 1 POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await pollenToken.approve(pollenStaking.address, dec(1, 18), { from: multisig })
    await pollenStaking.stake(dec(1, 18), { from: multisig })

    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(190, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(180, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: C } })

    // Check baseRate == 0
    assert.equal(await troveManager.baseRate(), '0')

    const A_balanceBefore = await nectToken.balanceOf(A)
    const B_balanceBefore = await nectToken.balanceOf(B)

    // A redeems 10 NECT
    const redemptionTx_A = await th.redeemCollateralAndGetTxObject(A, contracts, dec(10, 18), GAS_PRICE)
    const timeStamp_A = await th.getTimestampFromTx(redemptionTx_A, web3)

    // Check A's balance has decreased by 10 NECT
    assert.equal(await nectToken.balanceOf(A), A_balanceBefore.sub(toBN(dec(10, 18))).toString())

    // Check baseRate is now non-zero
    const baseRate_1 = await troveManager.baseRate()
    assert.isTrue(baseRate_1.gt(toBN('0')))

    // B redeems 10 NECT
    const redemptionTx_B = await th.redeemCollateralAndGetTxObject(B, contracts, dec(10, 18), GAS_PRICE)
    const timeStamp_B = await th.getTimestampFromTx(redemptionTx_B, web3)

    // Check B's balance has decreased by 10 NECT
    assert.equal(await nectToken.balanceOf(B), B_balanceBefore.sub(toBN(dec(10, 18))).toString())

    // Check negligible time difference (< 1 minute) between txs
    assert.isTrue(Number(timeStamp_B) - Number(timeStamp_A) < 60)

    const baseRate_2 = await troveManager.baseRate()

    // Check baseRate has again increased
    assert.isTrue(baseRate_2.gt(baseRate_1))
  })

  it("redeemCollateral(): lastFeeOpTime doesn't update if less time than decay interval has passed since the last fee operation [ @skip-on-coverage ]", async () => {
    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(190, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(180, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: C } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    const A_balanceBefore = await nectToken.balanceOf(A)

    // A redeems 10 NECT
    await th.redeemCollateral(A, contracts, dec(10, 18), GAS_PRICE)

    // Check A's balance has decreased by 10 NECT
    assert.equal(A_balanceBefore.sub(await nectToken.balanceOf(A)), dec(10, 18))

    // Check baseRate is now non-zero
    const baseRate_1 = await troveManager.baseRate()
    assert.isTrue(baseRate_1.gt(toBN('0')))

    const lastFeeOpTime_1 = await troveManager.lastFeeOperationTime()

    // 45 seconds pass
    th.fastForwardTime(45, web3.currentProvider)

    // Borrower A triggers a fee
    await th.redeemCollateral(A, contracts, dec(1, 18), GAS_PRICE)

    const lastFeeOpTime_2 = await troveManager.lastFeeOperationTime()

    // Check that the last fee operation time did not update, as borrower A's 2nd redemption occured
    // since before minimum interval had passed 
    assert.isTrue(lastFeeOpTime_2.eq(lastFeeOpTime_1))

    // 15 seconds passes
    th.fastForwardTime(15, web3.currentProvider)

    // Check that now, at least one hour has passed since lastFeeOpTime_1
    const timeNow = await th.getLatestBlockTimestamp(web3)
    assert.isTrue(toBN(timeNow).sub(lastFeeOpTime_1).gte(3600))

    // Borrower A triggers a fee
    await th.redeemCollateral(A, contracts, dec(1, 18), GAS_PRICE)

    const lastFeeOpTime_3 = await troveManager.lastFeeOperationTime()

    // Check that the last fee operation time DID update, as A's 2rd redemption occured
    // after minimum interval had passed 
    assert.isTrue(lastFeeOpTime_3.gt(lastFeeOpTime_1))
  })

  it("redeemCollateral(): a redemption made at zero base rate send a non-zero iBGTFee to POLLEN staking contract", async () => {
    // time fast-forwards 1 year, and multisig stakes 1 POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await pollenToken.approve(pollenStaking.address, dec(1, 18), { from: multisig })
    await pollenStaking.stake(dec(1, 18), { from: multisig })

    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(190, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(180, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: C } })

    // Check baseRate == 0
    assert.equal(await troveManager.baseRate(), '0')

    // Check POLLEN Staking contract balance before is zero
    const pollenStakingBalance_Before = await iBGTToken.balanceOf(pollenStaking.address)
    assert.equal(pollenStakingBalance_Before, '0')

    const A_balanceBefore = await nectToken.balanceOf(A)

    // A redeems 10 NECT
    await th.redeemCollateral(A, contracts, dec(10, 18), GAS_PRICE)

    // Check A's balance has decreased by 10 NECT
    assert.equal(await nectToken.balanceOf(A), A_balanceBefore.sub(toBN(dec(10, 18))).toString())

    // Check baseRate is now non-zero
    const baseRate_1 = await troveManager.baseRate()
    assert.isTrue(baseRate_1.gt(toBN('0')))

    // Check POLLEN Staking contract balance after is non-zero
    const pollenStakingBalance_After = toBN(await iBGTToken.balanceOf(pollenStaking.address))
    assert.isTrue(pollenStakingBalance_After.gt(toBN('0')))
  })

  it("redeemCollateral(): a redemption made at zero base increases the iBGT-fees-per-POLLEN-staked in POLLEN Staking contract", async () => {
    // time fast-forwards 1 year, and multisig stakes 1 POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await pollenToken.approve(pollenStaking.address, dec(1, 18), { from: multisig })
    await pollenStaking.stake(dec(1, 18), { from: multisig })

    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(190, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(180, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: C } })

    // Check baseRate == 0
    assert.equal(await troveManager.baseRate(), '0')

    // Check POLLEN Staking iBGT-fees-per-POLLEN-staked before is zero
    const F_iBGT_Before = await pollenStaking.F_iBGT()
    assert.equal(F_iBGT_Before, '0')

    const A_balanceBefore = await nectToken.balanceOf(A)

    // A redeems 10 NECT
    await th.redeemCollateral(A, contracts, dec(10, 18), GAS_PRICE)

    // Check A's balance has decreased by 10 NECT
    assert.equal(await nectToken.balanceOf(A), A_balanceBefore.sub(toBN(dec(10, 18))).toString())

    // Check baseRate is now non-zero
    const baseRate_1 = await troveManager.baseRate()
    assert.isTrue(baseRate_1.gt(toBN('0')))

    // Check POLLEN Staking iBGT-fees-per-POLLEN-staked after is non-zero
    const F_iBGT_After = await pollenStaking.F_iBGT()
    assert.isTrue(F_iBGT_After.gt('0'))
  })

  it("redeemCollateral(): a redemption made at a non-zero base rate send a non-zero iBGTFee to POLLEN staking contract", async () => {
    // time fast-forwards 1 year, and multisig stakes 1 POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await pollenToken.approve(pollenStaking.address, dec(1, 18), { from: multisig })
    await pollenStaking.stake(dec(1, 18), { from: multisig })

    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(190, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(180, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: C } })

    // Check baseRate == 0
    assert.equal(await troveManager.baseRate(), '0')

    const A_balanceBefore = await nectToken.balanceOf(A)
    const B_balanceBefore = await nectToken.balanceOf(B)

    // A redeems 10 NECT
    await th.redeemCollateral(A, contracts, dec(10, 18), GAS_PRICE)

    // Check A's balance has decreased by 10 NECT
    assert.equal(await nectToken.balanceOf(A), A_balanceBefore.sub(toBN(dec(10, 18))).toString())

    // Check baseRate is now non-zero
    const baseRate_1 = await troveManager.baseRate()
    assert.isTrue(baseRate_1.gt(toBN('0')))

    const pollenStakingBalance_Before = toBN(await iBGTToken.balanceOf(pollenStaking.address))

    // B redeems 10 NECT
    await th.redeemCollateral(B, contracts, dec(10, 18), GAS_PRICE)

    // Check B's balance has decreased by 10 NECT
    assert.equal(await nectToken.balanceOf(B), B_balanceBefore.sub(toBN(dec(10, 18))).toString())

    const pollenStakingBalance_After = toBN(await iBGTToken.balanceOf(pollenStaking.address))

    // check POLLEN Staking balance has increased
    assert.isTrue(pollenStakingBalance_After.gt(pollenStakingBalance_Before))
  })

  it("redeemCollateral(): a redemption made at a non-zero base rate increases iBGT-per-POLLEN-staked in the staking contract", async () => {
    // time fast-forwards 1 year, and multisig stakes 1 POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await pollenToken.approve(pollenStaking.address, dec(1, 18), { from: multisig })
    await pollenStaking.stake(dec(1, 18), { from: multisig })

    await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: A } })
    await openTrove({ ICR: toBN(dec(190, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(180, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: C } })

    // Check baseRate == 0
    assert.equal(await troveManager.baseRate(), '0')

    const A_balanceBefore = await nectToken.balanceOf(A)
    const B_balanceBefore = await nectToken.balanceOf(B)

    // A redeems 10 NECT
    await th.redeemCollateral(A, contracts, dec(10, 18), GAS_PRICE)

    // Check A's balance has decreased by 10 NECT
    assert.equal(await nectToken.balanceOf(A), A_balanceBefore.sub(toBN(dec(10, 18))).toString())

    // Check baseRate is now non-zero
    const baseRate_1 = await troveManager.baseRate()
    assert.isTrue(baseRate_1.gt(toBN('0')))

    // Check POLLEN Staking iBGT-fees-per-POLLEN-staked before is zero
    const F_iBGT_Before = await pollenStaking.F_iBGT()

    // B redeems 10 NECT
    await th.redeemCollateral(B, contracts, dec(10, 18), GAS_PRICE)

    // Check B's balance has decreased by 10 NECT
    assert.equal(await nectToken.balanceOf(B), B_balanceBefore.sub(toBN(dec(10, 18))).toString())

    const F_iBGT_After = await pollenStaking.F_iBGT()

    // check POLLEN Staking balance has increased
    assert.isTrue(F_iBGT_After.gt(F_iBGT_Before))
  })

  it("redeemCollateral(): a redemption sends the iBGT remainder (iBGTDrawn - iBGTFee) to the redeemer", async () => {
    // time fast-forwards 1 year, and multisig stakes 1 POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await pollenToken.approve(pollenStaking.address, dec(1, 18), { from: multisig })
    await pollenStaking.stake(dec(1, 18), { from: multisig })

    const { totalDebt: W_totalDebt } = await openTrove({ ICR: toBN(dec(20, 18)), extraParams: { from: whale } })

    const { totalDebt: A_totalDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: A } })
    const { totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(190, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: B } })
    const { totalDebt: C_totalDebt } = await openTrove({ ICR: toBN(dec(180, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: C } })
    const totalDebt = W_totalDebt.add(A_totalDebt).add(B_totalDebt).add(C_totalDebt)

    const A_balanceBefore = toBN(await iBGTToken.balanceOf(A))

    // Confirm baseRate before redemption is 0
    const baseRate = await troveManager.baseRate()
    assert.equal(baseRate, '0')

    // Check total NECT supply
    const activeNECT = await activePool.getNECTDebt()
    const defaultNECT = await defaultPool.getNECTDebt()

    const totalNECTSupply = activeNECT.add(defaultNECT)
    th.assertIsApproximatelyEqual(totalNECTSupply, totalDebt)

    // A redeems 9 NECT
    const redemptionAmount = toBN(dec(9, 18))
    const gasUsed = await th.redeemCollateral(A, contracts, redemptionAmount, GAS_PRICE)

    /*
    At iBGT:USD price of 200:
    iBGTDrawn = (9 / 200) = 0.045 iBGT
    iBGTfee = (0.005 + (1/2) *( 9/260)) * iBGTDrawn = 0.00100384615385 iBGT
    iBGTRemainder = 0.045 - 0.001003... = 0.0439961538462
    */

    const A_balanceAfter = toBN(await iBGTToken.balanceOf(A))

    // check A's iBGT balance has increased by 0.045 iBGT 
    const price = await priceFeed.getPrice()
    const iBGTDrawn = redemptionAmount.mul(mv._1e18BN).div(price)
    th.assertIsApproximatelyEqual(
      A_balanceAfter.sub(A_balanceBefore),
      iBGTDrawn.sub(
        toBN(dec(5, 15)).add(redemptionAmount.mul(mv._1e18BN).div(totalDebt).div(toBN(2)))
          .mul(iBGTDrawn).div(mv._1e18BN)
      ), // substract gas used for troveManager.redeemCollateral from expected received iBGT
      100000
    )
  })

  it("redeemCollateral(): a full redemption (leaving trove with 0 debt), closes the trove", async () => {
    // time fast-forwards 1 year, and multisig stakes 1 POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await pollenToken.approve(pollenStaking.address, dec(1, 18), { from: multisig })
    await pollenStaking.stake(dec(1, 18), { from: multisig })

    const { netDebt: W_netDebt } = await openTrove({ ICR: toBN(dec(20, 18)), extraNECTAmount: dec(10000, 18), extraParams: { from: whale } })

    const { netDebt: A_netDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: A } })
    const { netDebt: B_netDebt } = await openTrove({ ICR: toBN(dec(190, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: B } })
    const { netDebt: C_netDebt } = await openTrove({ ICR: toBN(dec(180, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: C } })
    const { netDebt: D_netDebt } = await openTrove({ ICR: toBN(dec(280, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: D } })
    const redemptionAmount = A_netDebt.add(B_netDebt).add(C_netDebt).add(toBN(dec(10, 18)))

    const A_balanceBefore = toBN(await iBGTToken.balanceOf(A))
    const B_balanceBefore = toBN(await iBGTToken.balanceOf(B))
    const C_balanceBefore = toBN(await iBGTToken.balanceOf(C))

    // whale redeems 360 NECT.  Expect this to fully redeem A, B, C, and partially redeem D.
    await th.redeemCollateral(whale, contracts, redemptionAmount, GAS_PRICE)

    // Check A, B, C have been closed
    assert.isFalse(await sortedTroves.contains(A))
    assert.isFalse(await sortedTroves.contains(B))
    assert.isFalse(await sortedTroves.contains(C))

    // Check D remains active
    assert.isTrue(await sortedTroves.contains(D))
  })

  const redeemCollateral3Full1Partial = async () => {
    // time fast-forwards 1 year, and multisig stakes 1 POLLEN
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)
    await pollenToken.approve(pollenStaking.address, dec(1, 18), { from: multisig })
    await pollenStaking.stake(dec(1, 18), { from: multisig })

    const { netDebt: W_netDebt } = await openTrove({ ICR: toBN(dec(20, 18)), extraNECTAmount: dec(10000, 18), extraParams: { from: whale } })

    const { netDebt: A_netDebt, collateral: A_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: A } })
    const { netDebt: B_netDebt, collateral: B_coll } = await openTrove({ ICR: toBN(dec(190, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: B } })
    const { netDebt: C_netDebt, collateral: C_coll } = await openTrove({ ICR: toBN(dec(180, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: C } })
    const { netDebt: D_netDebt } = await openTrove({ ICR: toBN(dec(280, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: D } })
    const redemptionAmount = A_netDebt.add(B_netDebt).add(C_netDebt).add(toBN(dec(10, 18)))

    const A_balanceBefore = toBN(await iBGTToken.balanceOf(A))
    const B_balanceBefore = toBN(await iBGTToken.balanceOf(B))
    const C_balanceBefore = toBN(await iBGTToken.balanceOf(C))
    const D_balanceBefore = toBN(await iBGTToken.balanceOf(D))

    const A_collBefore = await troveManager.getTroveColl(A)
    const B_collBefore = await troveManager.getTroveColl(B)
    const C_collBefore = await troveManager.getTroveColl(C)
    const D_collBefore = await troveManager.getTroveColl(D)

    // Confirm baseRate before redemption is 0
    const baseRate = await troveManager.baseRate()
    assert.equal(baseRate, '0')

    // whale redeems NECT.  Expect this to fully redeem A, B, C, and partially redeem D.
    await th.redeemCollateral(whale, contracts, redemptionAmount, GAS_PRICE)

    // Check A, B, C have been closed
    assert.isFalse(await sortedTroves.contains(A))
    assert.isFalse(await sortedTroves.contains(B))
    assert.isFalse(await sortedTroves.contains(C))

    // Check D stays active
    assert.isTrue(await sortedTroves.contains(D))
    
    /*
    At iBGT:USD price of 200, with full redemptions from A, B, C:

    iBGTDrawn from A = 100/200 = 0.5 iBGT --> Surplus = (1-0.5) = 0.5
    iBGTDrawn from B = 120/200 = 0.6 iBGT --> Surplus = (1-0.6) = 0.4
    iBGTDrawn from C = 130/200 = 0.65 iBGT --> Surplus = (2-0.65) = 1.35
    */

    const A_balanceAfter = toBN(await iBGTToken.balanceOf(A))
    const B_balanceAfter = toBN(await iBGTToken.balanceOf(B))
    const C_balanceAfter = toBN(await iBGTToken.balanceOf(C))
    const D_balanceAfter = toBN(await iBGTToken.balanceOf(D))

    // Check A, B, C’s trove collateral balance is zero (fully redeemed-from troves)
    const A_collAfter = await troveManager.getTroveColl(A)
    const B_collAfter = await troveManager.getTroveColl(B)
    const C_collAfter = await troveManager.getTroveColl(C)
    assert.isTrue(A_collAfter.eq(toBN(0)))
    assert.isTrue(B_collAfter.eq(toBN(0)))
    assert.isTrue(C_collAfter.eq(toBN(0)))

    // check D's trove collateral balances have decreased (the partially redeemed-from trove)
    const D_collAfter = await troveManager.getTroveColl(D)
    assert.isTrue(D_collAfter.lt(D_collBefore))

    // Check A, B, C (fully redeemed-from troves), and D's (the partially redeemed-from trove) balance has not changed
    assert.isTrue(A_balanceAfter.eq(A_balanceBefore))
    assert.isTrue(B_balanceAfter.eq(B_balanceBefore))
    assert.isTrue(C_balanceAfter.eq(C_balanceBefore))
    assert.isTrue(D_balanceAfter.eq(D_balanceBefore))

    // D is not closed, so cannot open trove
    await assertRevert(borrowerOperationsOpenTrove(th._100pct, 0, ZERO_ADDRESS, ZERO_ADDRESS, dec(10, 18), { from: D }), 'BorrowerOps: Trove is active')

    return {
      A_netDebt, A_coll,
      B_netDebt, B_coll,
      C_netDebt, C_coll,
    }
  }

  it("redeemCollateral(): emits correct debt and coll values in each redeemed trove's TroveUpdated event", async () => {
    const { netDebt: W_netDebt } = await openTrove({ ICR: toBN(dec(20, 18)), extraNECTAmount: dec(10000, 18), extraParams: { from: whale } })

    const { netDebt: A_netDebt } = await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: A } })
    const { netDebt: B_netDebt } = await openTrove({ ICR: toBN(dec(190, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: B } })
    const { netDebt: C_netDebt } = await openTrove({ ICR: toBN(dec(180, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: C } })
    const { totalDebt: D_totalDebt, collateral: D_coll } = await openTrove({ ICR: toBN(dec(280, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: D } })
    const partialAmount = toBN(dec(15, 18))
    const redemptionAmount = A_netDebt.add(B_netDebt).add(C_netDebt).add(partialAmount)

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // whale redeems NECT.  Expect this to fully redeem A, B, C, and partially redeem 15 NECT from D.
    const redemptionTx = await th.redeemCollateralAndGetTxObject(whale, contracts, redemptionAmount, GAS_PRICE, th._100pct)

    // Check A, B, C have been closed
    assert.isFalse(await sortedTroves.contains(A))
    assert.isFalse(await sortedTroves.contains(B))
    assert.isFalse(await sortedTroves.contains(C))

    // Check D stays active
    assert.isTrue(await sortedTroves.contains(D))

    const troveUpdatedEvents = th.getAllEventsByName(redemptionTx, "TroveUpdated")

    // Get each trove's emitted debt and coll 
    const [A_emittedDebt, A_emittedColl] = th.getDebtAndCollFromTroveUpdatedEvents(troveUpdatedEvents, A)
    const [B_emittedDebt, B_emittedColl] = th.getDebtAndCollFromTroveUpdatedEvents(troveUpdatedEvents, B)
    const [C_emittedDebt, C_emittedColl] = th.getDebtAndCollFromTroveUpdatedEvents(troveUpdatedEvents, C)
    const [D_emittedDebt, D_emittedColl] = th.getDebtAndCollFromTroveUpdatedEvents(troveUpdatedEvents, D)

    // Expect A, B, C to have 0 emitted debt and coll, since they were closed
    assert.equal(A_emittedDebt, '0')
    assert.equal(A_emittedColl, '0')
    assert.equal(B_emittedDebt, '0')
    assert.equal(B_emittedColl, '0')
    assert.equal(C_emittedDebt, '0')
    assert.equal(C_emittedColl, '0')

    /* Expect D to have lost 15 debt and (at iBGT price of 200) 15/200 = 0.075 iBGT. 
    So, expect remaining debt = (85 - 15) = 70, and remaining iBGT = 1 - 15/200 = 0.925 remaining. */
    const price = await priceFeed.getPrice()
    th.assertIsApproximatelyEqual(D_emittedDebt, D_totalDebt.sub(partialAmount))
    th.assertIsApproximatelyEqual(D_emittedColl, D_coll.sub(partialAmount.mul(mv._1e18BN).div(price)))
  })

  it("redeemCollateral(): a redemption that closes a trove leaves the trove's iBGT surplus (collateral - iBGT drawn) available for the trove owner to claim", async () => {
    const {
      A_netDebt, A_coll,
      B_netDebt, B_coll,
      C_netDebt, C_coll,
    } = await redeemCollateral3Full1Partial()

    const A_balanceBefore = toBN(await iBGTToken.balanceOf(A))
    const B_balanceBefore = toBN(await iBGTToken.balanceOf(B))
    const C_balanceBefore = toBN(await iBGTToken.balanceOf(C))

    // CollSurplusPool endpoint cannot be called directly
    await assertRevert(collSurplusPool.claimColl(A), 'CollSurplusPool: Caller is not Borrower Operations')

    const A_GAS = th.gasUsed(await borrowerOperations.claimCollateral({ from: A, gasPrice: GAS_PRICE  }))
    const B_GAS = th.gasUsed(await borrowerOperations.claimCollateral({ from: B, gasPrice: GAS_PRICE  }))
    const C_GAS = th.gasUsed(await borrowerOperations.claimCollateral({ from: C, gasPrice: GAS_PRICE  }))

    const A_expectedBalance = A_balanceBefore
    const B_expectedBalance = B_balanceBefore
    const C_expectedBalance = C_balanceBefore

    const A_balanceAfter = toBN(await iBGTToken.balanceOf(A))
    const B_balanceAfter = toBN(await iBGTToken.balanceOf(B))
    const C_balanceAfter = toBN(await iBGTToken.balanceOf(C))

    const price = toBN(await priceFeed.getPrice())

    th.assertIsApproximatelyEqual(A_balanceAfter, A_expectedBalance.add(A_coll.sub(A_netDebt.mul(mv._1e18BN).div(price))))
    th.assertIsApproximatelyEqual(B_balanceAfter, B_expectedBalance.add(B_coll.sub(B_netDebt.mul(mv._1e18BN).div(price))))
    th.assertIsApproximatelyEqual(C_balanceAfter, C_expectedBalance.add(C_coll.sub(C_netDebt.mul(mv._1e18BN).div(price))))
  })

  it("redeemCollateral(): a redemption that closes a trove leaves the trove's iBGT surplus (collateral - iBGT drawn) available for the trove owner after re-opening trove", async () => {
    const {
      A_netDebt, A_coll: A_collBefore,
      B_netDebt, B_coll: B_collBefore,
      C_netDebt, C_coll: C_collBefore,
    } = await redeemCollateral3Full1Partial()

    const price = await priceFeed.getPrice()
    const A_surplus = A_collBefore.sub(A_netDebt.mul(mv._1e18BN).div(price))
    const B_surplus = B_collBefore.sub(B_netDebt.mul(mv._1e18BN).div(price))
    const C_surplus = C_collBefore.sub(C_netDebt.mul(mv._1e18BN).div(price))

    const { collateral: A_coll } = await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: A } })
    const { collateral: B_coll } = await openTrove({ ICR: toBN(dec(190, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: B } })
    const { collateral: C_coll } = await openTrove({ ICR: toBN(dec(180, 16)), extraNECTAmount: dec(100, 18), extraParams: { from: C } })

    const A_collAfter = await troveManager.getTroveColl(A)
    const B_collAfter = await troveManager.getTroveColl(B)
    const C_collAfter = await troveManager.getTroveColl(C)

    assert.isTrue(A_collAfter.eq(A_coll))
    assert.isTrue(B_collAfter.eq(B_coll))
    assert.isTrue(C_collAfter.eq(C_coll))

    const A_balanceBefore = toBN(await iBGTToken.balanceOf(A))
    const B_balanceBefore = toBN(await iBGTToken.balanceOf(B))
    const C_balanceBefore = toBN(await iBGTToken.balanceOf(C))

    const A_GAS = th.gasUsed(await borrowerOperations.claimCollateral({ from: A, gasPrice: GAS_PRICE  }))
    const B_GAS = th.gasUsed(await borrowerOperations.claimCollateral({ from: B, gasPrice: GAS_PRICE  }))
    const C_GAS = th.gasUsed(await borrowerOperations.claimCollateral({ from: C, gasPrice: GAS_PRICE  }))

    const A_expectedBalance = A_balanceBefore
    const B_expectedBalance = B_balanceBefore
    const C_expectedBalance = C_balanceBefore

    const A_balanceAfter = toBN(await iBGTToken.balanceOf(A))
    const B_balanceAfter = toBN(await iBGTToken.balanceOf(B))
    const C_balanceAfter = toBN(await iBGTToken.balanceOf(C))

    th.assertIsApproximatelyEqual(A_balanceAfter, A_expectedBalance.add(A_surplus))
    th.assertIsApproximatelyEqual(B_balanceAfter, B_expectedBalance.add(B_surplus))
    th.assertIsApproximatelyEqual(C_balanceAfter, C_expectedBalance.add(C_surplus))
  })

  it('redeemCollateral(): reverts if fee eats up all returned collateral', async () => {
    // --- SETUP ---
    const { nectAmount } = await openTrove({ ICR: toBN(dec(200, 16)), extraNECTAmount: dec(1, 24), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })

    const price = await priceFeed.getPrice()
    assert.equal(price, dec(200, 18))

    // --- TEST ---

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // keep redeeming until we get the base rate to the ceiling of 100%
    for (let i = 0; i < 2; i++) {
      // Find hints for redeeming
      const {
        firstRedemptionHint,
        partialRedemptionHintNICR
      } = await hintHelpers.getRedemptionHints(nectAmount, price, 0)

      // Don't pay for gas, as it makes it easier to calculate the received iBgt
      const redemptionTx = await troveManager.redeemCollateral(
        nectAmount,
        firstRedemptionHint,
        ZERO_ADDRESS,
        alice,
        partialRedemptionHintNICR,
        0, th._100pct,
        {
          from: alice,
          gasPrice: GAS_PRICE
        }
      )

      await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })
      try{
        await iBGTToken.mint(alice, nectAmount.mul(mv._1e18BN).div(price).toString())
      }catch (e){
        console.log ("iBGT Token minting failed", e)
      }
      try {
        await iBGTToken.increaseAllowance(alice, borrowerOperations.address, nectAmount.mul(mv._1e18BN).div(price).toString())
      }catch (e) {
        console.log ("Approve failed.", e)
      }
      await borrowerOperations.adjustTrove(th._100pct, 0, nectAmount, true, alice, alice, nectAmount.mul(mv._1e18BN).div(price), { from: alice })
    }

    const {
      firstRedemptionHint,
      partialRedemptionHintNICR
    } = await hintHelpers.getRedemptionHints(nectAmount, price, 0)

    await assertRevert(
      troveManager.redeemCollateral(
        nectAmount,
        firstRedemptionHint,
        ZERO_ADDRESS,
        alice,
        partialRedemptionHintNICR,
        0, th._100pct,
        {
          from: alice,
          gasPrice: GAS_PRICE
        }
      ),
      'TroveManager: Fee would eat up all returned collateral'
    )
  })

  it("getPendingNECTDebtReward(): Returns 0 if there is no pending NECTDebt reward", async () => {
    // Make some troves
    const { totalDebt } = await openTrove({ ICR: toBN(dec(2, 18)), extraNECTAmount: dec(100, 18), extraParams: { from: defaulter_1 } })

    await openTrove({ ICR: toBN(dec(3, 18)), extraNECTAmount: dec(20, 18), extraParams: { from: carol } })

    await openTrove({ ICR: toBN(dec(20, 18)), extraNECTAmount: totalDebt, extraParams: { from: whale } })
    await stabilityPool.provideToSP(totalDebt, ZERO_ADDRESS, { from: whale })

    // Price drops
    await priceFeed.setPrice(dec(100, 18))

    await troveManager.liquidate(defaulter_1)

    // Confirm defaulter_1 liquidated
    assert.isFalse(await sortedTroves.contains(defaulter_1))

    // Confirm there are no pending rewards from liquidation
    const current_L_NECTDebt = await troveManager.L_NECTDebt()
    assert.equal(current_L_NECTDebt, 0)

    const carolSnapshot_L_NECTDebt = (await troveManager.rewardSnapshots(carol))[1]
    assert.equal(carolSnapshot_L_NECTDebt, 0)

    const carol_PendingNECTDebtReward = await troveManager.getPendingNECTDebtReward(carol)
    assert.equal(carol_PendingNECTDebtReward, 0)
  })

  it("getPendingiBGTReward(): Returns 0 if there is no pending iBGT reward", async () => {
    // make some troves
    const { totalDebt } = await openTrove({ ICR: toBN(dec(2, 18)), extraNECTAmount: dec(100, 18), extraParams: { from: defaulter_1 } })

    await openTrove({ ICR: toBN(dec(3, 18)), extraNECTAmount: dec(20, 18), extraParams: { from: carol } })

    await openTrove({ ICR: toBN(dec(20, 18)), extraNECTAmount: totalDebt, extraParams: { from: whale } })
    await stabilityPool.provideToSP(totalDebt, ZERO_ADDRESS, { from: whale })

    // Price drops
    await priceFeed.setPrice(dec(100, 18))

    await troveManager.liquidate(defaulter_1)

    // Confirm defaulter_1 liquidated
    assert.isFalse(await sortedTroves.contains(defaulter_1))

    // Confirm there are no pending rewards from liquidation
    const current_L_iBGT = await troveManager.L_iBGT()
    assert.equal(current_L_iBGT, 0)

    const carolSnapshot_L_iBGT = (await troveManager.rewardSnapshots(carol))[0]
    assert.equal(carolSnapshot_L_iBGT, 0)

    const carol_PendingiBGTReward = await troveManager.getPendingiBGTReward(carol)
    assert.equal(carol_PendingiBGTReward, 0)
  })

  // --- computeICR ---

  it("computeICR(): Returns 0 if trove's coll is worth 0", async () => {
    const price = 0
    const coll = dec(1, 'ether')
    const debt = dec(100, 18)

    const ICR = (await troveManager.computeICR(coll, debt, price)).toString()

    assert.equal(ICR, 0)
  })

  it("computeICR(): Returns 2^256-1 for iBGT:USD = 100, coll = 1 iBGT, debt = 100 NECT", async () => {
    const price = dec(100, 18)
    const coll = dec(1, 'ether')
    const debt = dec(100, 18)

    const ICR = (await troveManager.computeICR(coll, debt, price)).toString()

    assert.equal(ICR, dec(1, 18))
  })

  it("computeICR(): returns correct ICR for iBGT:USD = 100, coll = 200 iBGT, debt = 30 NECT", async () => {
    const price = dec(100, 18)
    const coll = dec(200, 'ether')
    const debt = dec(30, 18)

    const ICR = (await troveManager.computeICR(coll, debt, price)).toString()

    assert.isAtMost(th.getDifference(ICR, '666666666666666666666'), 1000)
  })

  it("computeICR(): returns correct ICR for iBGT:USD = 250, coll = 1350 iBGT, debt = 127 NECT", async () => {
    const price = '250000000000000000000'
    const coll = '1350000000000000000000'
    const debt = '127000000000000000000'

    const ICR = (await troveManager.computeICR(coll, debt, price))

    assert.isAtMost(th.getDifference(ICR, '2657480314960630000000'), 1000000)
  })

  it("computeICR(): returns correct ICR for iBGT:USD = 100, coll = 1 iBGT, debt = 54321 NECT", async () => {
    const price = dec(100, 18)
    const coll = dec(1, 'ether')
    const debt = '54321000000000000000000'

    const ICR = (await troveManager.computeICR(coll, debt, price)).toString()

    assert.isAtMost(th.getDifference(ICR, '1840908672520756'), 1000)
  })


  it("computeICR(): Returns 2^256-1 if trove has non-zero coll and zero debt", async () => {
    const price = dec(100, 18)
    const coll = dec(1, 'ether')
    const debt = 0

    const ICR = web3.utils.toHex(await troveManager.computeICR(coll, debt, price))
    const maxBytes32 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

    assert.equal(ICR, maxBytes32)
  })

  // --- checkRecoveryMode ---

  //TCR < 150%
  it("checkRecoveryMode(): Returns true when TCR < 150%", async () => {
    await priceFeed.setPrice(dec(100, 18))

    await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })

    await priceFeed.setPrice('99999999999999999999')

    const TCR = (await th.getTCR(contracts))

    assert.isTrue(TCR.lte(toBN('1500000000000000000')))

    assert.isTrue(await th.checkRecoveryMode(contracts))
  })

  // TCR == 150%
  it("checkRecoveryMode(): Returns false when TCR == 150%", async () => {
    await priceFeed.setPrice(dec(100, 18))

    await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })

    const TCR = (await th.getTCR(contracts))

    assert.equal(TCR, '1500000000000000000')

    assert.isFalse(await th.checkRecoveryMode(contracts))
  })

  // > 150%
  it("checkRecoveryMode(): Returns false when TCR > 150%", async () => {
    await priceFeed.setPrice(dec(100, 18))

    await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })

    await priceFeed.setPrice('100000000000000000001')

    const TCR = (await th.getTCR(contracts))

    assert.isTrue(TCR.gte(toBN('1500000000000000000')))

    assert.isFalse(await th.checkRecoveryMode(contracts))
  })

  // check 0
  it("checkRecoveryMode(): Returns false when TCR == 0", async () => {
    await priceFeed.setPrice(dec(100, 18))

    await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: alice } })
    await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: bob } })

    await priceFeed.setPrice(0)

    const TCR = (await th.getTCR(contracts)).toString()

    assert.equal(TCR, 0)

    assert.isTrue(await th.checkRecoveryMode(contracts))
  })

  // --- Getters ---

  it("getTroveStake(): Returns stake", async () => {
    const { collateral: A_coll } = await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: A } })
    const { collateral: B_coll } = await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: B } })

    const A_Stake = await troveManager.getTroveStake(A)
    const B_Stake = await troveManager.getTroveStake(B)

    assert.equal(A_Stake, A_coll.toString())
    assert.equal(B_Stake, B_coll.toString())
  })

  it("getTroveColl(): Returns coll", async () => {
    const { collateral: A_coll } = await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: A } })
    const { collateral: B_coll } = await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: B } })

    assert.equal(await troveManager.getTroveColl(A), A_coll.toString())
    assert.equal(await troveManager.getTroveColl(B), B_coll.toString())
  })

  it("getTroveDebt(): Returns debt", async () => {
    const { totalDebt: totalDebtA } = await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: A } })
    const { totalDebt: totalDebtB } = await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: B } })

    const A_Debt = await troveManager.getTroveDebt(A)
    const B_Debt = await troveManager.getTroveDebt(B)

    // Expect debt = requested + 0.5% fee + 50 (due to gas comp)

    assert.equal(A_Debt, totalDebtA.toString())
    assert.equal(B_Debt, totalDebtB.toString())
  })

  it("getTroveStatus(): Returns status", async () => {
    const { totalDebt: B_totalDebt } = await openTrove({ ICR: toBN(dec(150, 16)), extraParams: { from: B } })
    await openTrove({ ICR: toBN(dec(150, 16)), extraNECTAmount: B_totalDebt, extraParams: { from: A } })

    // to be able to repay:
    await nectToken.transfer(B, B_totalDebt, { from: A })
    await borrowerOperations.closeTrove({from: B})

    const A_Status = await troveManager.getTroveStatus(A)
    const B_Status = await troveManager.getTroveStatus(B)
    const C_Status = await troveManager.getTroveStatus(C)

    assert.equal(A_Status, '1')  // active
    assert.equal(B_Status, '2')  // closed by user
    assert.equal(C_Status, '0')  // non-existent
  })

  it("hasPendingRewards(): Returns false it trove is not active", async () => {
    assert.isFalse(await troveManager.hasPendingRewards(alice))
  })
})

contract('Reset chain state', async accounts => { })
