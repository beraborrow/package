const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")

const TroveManagerTester = artifacts.require("TroveManagerTester")
const POLLENTokenTester = artifacts.require("POLLENTokenTester")

const th = testHelpers.TestHelper

const dec = th.dec
const toBN = th.toBN
const mv = testHelpers.MoneyValues
const timeValues = testHelpers.TimeValues

const ZERO_ADDRESS = th.ZERO_ADDRESS
const assertRevert = th.assertRevert

const GAS_PRICE = 10000000


const {
  buildUserProxies,
  BorrowerOperationsProxy,
  BorrowerWrappersProxy,
  TroveManagerProxy,
  StabilityPoolProxy,
  SortedTrovesProxy,
  TokenProxy,
  POLLENStakingProxy
} = require('../utils/proxyHelpers.js')

contract('BorrowerWrappers', async accounts => {

  const [
    owner, alice, bob, carol, dennis, whale,
    A, B, C, D, E,
    defaulter_1, defaulter_2,
    // frontEnd_1, frontEnd_2, frontEnd_3
  ] = accounts;

  const [bountyAddress, lpRewardsAddress, multisig] = accounts.slice(997, 1000)

  let priceFeed
  let nectToken
  let sortedTroves
  let troveManagerOriginal
  let troveManager
  let activePool
  let stabilityPool
  let defaultPool
  let collSurplusPool
  let borrowerOperations
  let borrowerWrappers
  let pollenTokenOriginal
  let pollenToken
  let pollenStaking

  let contracts
  let iBGTToken

  let NECT_GAS_COMPENSATION

  const getOpenTroveNECTAmount = async (totalDebt) => th.getOpenTroveNECTAmount(contracts, totalDebt)
  const getActualDebtFromComposite = async (compositeDebt) => th.getActualDebtFromComposite(compositeDebt, contracts)
  const getNetBorrowingAmount = async (debtWithFee) => th.getNetBorrowingAmount(contracts, debtWithFee)
  const openTrove = async (params) => th.openTrove(contracts, params)

  beforeEach(async () => {
    contracts = await deploymentHelper.deployBeraBorrowCore()
    contracts.troveManager = await TroveManagerTester.new()
    contracts = await deploymentHelper.deployNECTToken(contracts)
    const POLLENContracts = await deploymentHelper.deployPOLLENTesterContractsHardhat(bountyAddress, lpRewardsAddress, multisig)

    await deploymentHelper.connectPOLLENContracts(POLLENContracts)
    await deploymentHelper.connectCoreContracts(contracts, POLLENContracts)
    await deploymentHelper.connectPOLLENContractsToCore(POLLENContracts, contracts)

    troveManagerOriginal = contracts.troveManager
    pollenTokenOriginal = POLLENContracts.pollenToken

    const users = [ alice, bob, carol, dennis, whale, A, B, C, D, E, defaulter_1, defaulter_2 ]
    await deploymentHelper.deployProxyScripts(contracts, POLLENContracts, owner, users)

    priceFeed = contracts.priceFeedTestnet
    nectToken = contracts.nectToken
    sortedTroves = contracts.sortedTroves
    troveManager = contracts.troveManager
    activePool = contracts.activePool
    stabilityPool = contracts.stabilityPool
    defaultPool = contracts.defaultPool
    collSurplusPool = contracts.collSurplusPool
    borrowerOperations = contracts.borrowerOperations
    borrowerWrappers = contracts.borrowerWrappers
    iBGTToken = contracts.iBGTToken
    pollenStaking = POLLENContracts.pollenStaking
    pollenToken = POLLENContracts.pollenToken

    NECT_GAS_COMPENSATION = await borrowerOperations.NECT_GAS_COMPENSATION()
  })

  // it('proxy owner can recover iBGT', async () => {
  //   const amount = toBN(dec(1, 18))
  //   const proxyAddress = borrowerWrappers.getProxyAddressFromUser(alice)

  //   // send some iBGT to proxy
  //   // await web3.eth.sendTransaction({ from: owner, to: proxyAddress, value: amount, gasPrice: GAS_PRICE })
  //   await iBGTToken.transfer(proxyAddress, amount.toString())
  //   assert.equal(await iBGTToken.balanceOf(proxyAddress), amount.toString())

  //   const balanceBefore = toBN(await iBGTToken.balanceOf(alice))
  //   // recover iBGT
  //   const gas_Used = th.gasUsed(await borrowerWrappers.transferiBGT(alice, amount, { from: alice, gasPrice: GAS_PRICE }))
    
  //   const balanceAfter = toBN(await iBGTToken.balanceOf(alice))
  //   const expectedBalance = toBN(balanceBefore)
  //   assert.equal(balanceAfter.sub(expectedBalance), amount.toString())
  // })

  // it('non proxy owner cannot recover iBGT', async () => {
  //   const amount = toBN(dec(1, 18))
  //   const proxyAddress = borrowerWrappers.getProxyAddressFromUser(alice)

  //   // send some iBGT to proxy
  //   // await web3.eth.sendTransaction({ from: owner, to: proxyAddress, value: amount })
  //   await iBGTToken.transfer(proxyAddress, amount.toString())
  //   assert.equal(await iBGTToken.balanceOf(proxyAddress), amount.toString())

  //   const balanceBefore = toBN(await iBGTToken.balanceOf(alice))

  //   // try to recover iBGT
  //   const proxy = borrowerWrappers.getProxyFromUser(alice)
  //   const signature = 'transferiBGT(address,uint256)'
  //   const calldata = th.getTransactionData(signature, [alice, amount])
  //   await assertRevert(proxy.methods["execute(address,bytes)"](borrowerWrappers.scriptAddress, calldata, { from: bob }), 'ds-auth-unauthorized')

  //   assert.equal(await iBGTToken.balanceOf(proxyAddress), amount.toString())

  //   const balanceAfter = toBN(await iBGTToken.balanceOf(alice))
  //   assert.equal(balanceAfter, balanceBefore.toString())
  // })

  // --- claimCollateralAndOpenTrove ---

  it('claimCollateralAndOpenTrove(): reverts if nothing to claim', async () => {
    // Whale opens Trove
    try{
      await openTrove({ ICR: toBN(dec(2, 18)), extraParams: { from: whale } })
    }catch(e){
      console.log (e, "LLLLLLLLLLLLLLL")
    }
    // alice opens Trove
    const { nectAmount, collateral } = await openTrove({ ICR: toBN(dec(15, 17)), extraParams: { from: alice } })
    
    console.log ("*****************")
    const proxyAddress = borrowerWrappers.getProxyAddressFromUser(alice)
    assert.equal(await iBGTToken.balanceOf(proxyAddress), '0')
    console.log ("*****************1")

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)
    console.log ("*****************2")

    // alice claims collateral and re-opens the trove
    await assertRevert(
      borrowerWrappers.claimCollateralAndOpenTrove(th._100pct, nectAmount, alice, alice, 0, { from: alice }),
      'CollSurplusPool: No collateral available to claim'
    )
    console.log ("*****************3")

    // check everything remain the same
    assert.equal(await iBGTToken.balanceOf(proxyAddress), '0')
    console.log ("*****************4")
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(proxyAddress), '0')
    console.log ("*****************5")
    th.assertIsApproximatelyEqual(await nectToken.balanceOf(proxyAddress), nectAmount)
    console.log ("*****************6")
    assert.equal(await troveManager.getTroveStatus(proxyAddress), 1)
    console.log ("*****************7")
    th.assertIsApproximatelyEqual(await troveManager.getTroveColl(proxyAddress), collateral)
    console.log ("*****************8")
  })

  it('claimCollateralAndOpenTrove(): without sending any value', async () => {
    // alice opens Trove
    const { nectAmount, netDebt: redeemAmount, collateral } = await openTrove({extraNECTAmount: 0, ICR: toBN(dec(3, 18)), extraParams: { from: alice } })
    // Whale opens Trove
    await openTrove({ extraNECTAmount: redeemAmount, ICR: toBN(dec(5, 18)), extraParams: { from: whale } })

    const proxyAddress = borrowerWrappers.getProxyAddressFromUser(alice)
    assert.equal(await iBGTToken.balanceOf(proxyAddress), '0')

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // whale redeems 150 NECT
    await th.redeemCollateral(whale, contracts, redeemAmount, GAS_PRICE)
    assert.equal(await iBGTToken.balanceOf(proxyAddress), '0')

    // surplus: 5 - 150/200
    const price = await priceFeed.getPrice();
    const expectedSurplus = collateral.sub(redeemAmount.mul(mv._1e18BN).div(price))
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(proxyAddress), expectedSurplus)
    assert.equal(await troveManager.getTroveStatus(proxyAddress), 4) // closed by redemption

    // alice claims collateral and re-opens the trove
    await borrowerWrappers.claimCollateralAndOpenTrove(th._100pct, nectAmount, alice, alice, 0, { from: alice })

    assert.equal(await iBGTToken.balanceOf(proxyAddress), '0')
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(proxyAddress), '0')
    th.assertIsApproximatelyEqual(await nectToken.balanceOf(proxyAddress), nectAmount.mul(toBN(2)))
    assert.equal(await troveManager.getTroveStatus(proxyAddress), 1)
    th.assertIsApproximatelyEqual(await troveManager.getTroveColl(proxyAddress), expectedSurplus)
  })

  it('claimCollateralAndOpenTrove(): sending value in the transaction', async () => {
    // alice opens Trove
    const { nectAmount, netDebt: redeemAmount, collateral } = await openTrove({ extraParams: { from: alice } })
    // Whale opens Trove
    await openTrove({ extraNECTAmount: redeemAmount, ICR: toBN(dec(2, 18)), extraParams: { from: whale } })

    const proxyAddress = borrowerWrappers.getProxyAddressFromUser(alice)
    assert.equal(await iBGTToken.balanceOf(proxyAddress), '0')

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // whale redeems 150 NECT
    await th.redeemCollateral(whale, contracts, redeemAmount, GAS_PRICE)
    assert.equal(await iBGTToken.balanceOf(proxyAddress), '0')

    // surplus: 5 - 150/200
    const price = await priceFeed.getPrice();
    const expectedSurplus = collateral.sub(redeemAmount.mul(mv._1e18BN).div(price))
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(proxyAddress), expectedSurplus)
    assert.equal(await troveManager.getTroveStatus(proxyAddress), 4) // closed by redemption

    // alice claims collateral and re-opens the trove
    await borrowerWrappers.claimCollateralAndOpenTrove(th._100pct, nectAmount, alice, alice, collateral, { from: alice })

    assert.equal(await iBGTToken.balanceOf(proxyAddress), '0')
    th.assertIsApproximatelyEqual(await collSurplusPool.getCollateral(proxyAddress), '0')
    th.assertIsApproximatelyEqual(await nectToken.balanceOf(proxyAddress), nectAmount.mul(toBN(2)))
    assert.equal(await troveManager.getTroveStatus(proxyAddress), 1)
    th.assertIsApproximatelyEqual(await troveManager.getTroveColl(proxyAddress), expectedSurplus.add(collateral))
  })

  // --- claimSPRewardsAndRecycle ---

  it('claimSPRewardsAndRecycle(): only owner can call it', async () => {
    // Whale opens Trove
    await openTrove({ extraNECTAmount: toBN(dec(1850, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: whale } })
    // Whale deposits 1850 NECT in StabilityPool
    await stabilityPool.provideToSP(dec(1850, 18), ZERO_ADDRESS, { from: whale })

    // alice opens trove and provides 150 NECT to StabilityPool
    await openTrove({ extraNECTAmount: toBN(dec(150, 18)), extraParams: { from: alice } })
    await stabilityPool.provideToSP(dec(150, 18), ZERO_ADDRESS, { from: alice })

    // Defaulter Trove opened
    await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: defaulter_1 } })

    // price drops: defaulters' Troves fall below MCR, alice and whale Trove remain active
    const price = toBN(dec(100, 18))
    await priceFeed.setPrice(price);

    // Defaulter trove closed
    const liquidationTX_1 = await troveManager.liquidate(defaulter_1, { from: owner })
    const [liquidatedDebt_1] = await th.getEmittedLiquidationValues(liquidationTX_1)

    // Bob tries to claims SP rewards in behalf of Alice
    const proxy = borrowerWrappers.getProxyFromUser(alice)
    const signature = 'claimSPRewardsAndRecycle(uint256,address,address)'
    const calldata = th.getTransactionData(signature, [th._100pct, alice, alice])
    await assertRevert(proxy.methods["execute(address,bytes)"](borrowerWrappers.scriptAddress, calldata, { from: bob }), 'ds-auth-unauthorized')
  })

  it('claimSPRewardsAndRecycle():', async () => {
    // Whale opens Trove
    const whaleDeposit = toBN(dec(2350, 18))
    await openTrove({ extraNECTAmount: whaleDeposit, ICR: toBN(dec(4, 18)), extraParams: { from: whale } })
    // Whale deposits 1850 NECT in StabilityPool
    await stabilityPool.provideToSP(whaleDeposit, ZERO_ADDRESS, { from: whale })

    // alice opens trove and provides 150 NECT to StabilityPool
    const aliceDeposit = toBN(dec(150, 18))
    await openTrove({ extraNECTAmount: aliceDeposit, ICR: toBN(dec(3, 18)), extraParams: { from: alice } })
    await stabilityPool.provideToSP(aliceDeposit, ZERO_ADDRESS, { from: alice })
    // Defaulter Trove opened
    const { nectAmount, netDebt, collateral } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: defaulter_1 } })

    // price drops: defaulters' Troves fall below MCR, alice and whale Trove remain active
    const price = toBN(dec(100, 18))
    await priceFeed.setPrice(price);

    // Defaulter trove closed
    const liquidationTX_1 = await troveManager.liquidate(defaulter_1, { from: owner })
    const [liquidatedDebt_1] = await th.getEmittedLiquidationValues(liquidationTX_1)

    // Alice NECTLoss is ((150/2500) * liquidatedDebt)
    const totalDeposits = whaleDeposit.add(aliceDeposit)
    const expectedNECTLoss_A = liquidatedDebt_1.mul(aliceDeposit).div(totalDeposits)

    const expectedCompoundedNECTDeposit_A = toBN(dec(150, 18)).sub(expectedNECTLoss_A)
    const compoundedNECTDeposit_A = await stabilityPool.getCompoundedNECTDeposit(alice)
    // collateral * 150 / 2500 * 0.995
    const expectediBGTGain_A = collateral.mul(aliceDeposit).div(totalDeposits).mul(toBN(dec(995, 15))).div(mv._1e18BN)

    assert.isAtMost(th.getDifference(expectedCompoundedNECTDeposit_A, compoundedNECTDeposit_A), 1000)

    const ibgtBalanceBefore = await iBGTToken.balanceOf(borrowerOperations.getProxyAddressFromUser(alice))
    const troveCollBefore = await troveManager.getTroveColl(alice)
    const nectBalanceBefore = await nectToken.balanceOf(alice)
    const troveDebtBefore = await troveManager.getTroveDebt(alice)
    const pollenBalanceBefore = await pollenToken.balanceOf(alice)
    const ICRBefore = await troveManager.getCurrentICR(alice, price)
    const depositBefore = (await stabilityPool.deposits(alice))[0]
    const stakeBefore = await pollenStaking.stakes(alice)

    const proportionalNECT = expectediBGTGain_A.mul(price).div(ICRBefore)
    const borrowingRate = await troveManagerOriginal.getBorrowingRateWithDecay()
    const netDebtChange = proportionalNECT.mul(mv._1e18BN).div(mv._1e18BN.add(borrowingRate))

    // to force POLLEN issuance
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    const expectedPOLLENGain_A = toBN('50373424199406504708132')

    await priceFeed.setPrice(price.mul(toBN(2)));

    // Alice claims SP rewards and puts them back in the system through the proxy
    const proxyAddress = borrowerWrappers.getProxyAddressFromUser(alice)
    await borrowerWrappers.claimSPRewardsAndRecycle(th._100pct, alice, alice, { from: alice })

    const ibgtBalanceAfter = await iBGTToken.balanceOf(borrowerOperations.getProxyAddressFromUser(alice))
    const troveCollAfter = await troveManager.getTroveColl(alice)
    const nectBalanceAfter = await nectToken.balanceOf(alice)
    const troveDebtAfter = await troveManager.getTroveDebt(alice)
    const pollenBalanceAfter = await pollenToken.balanceOf(alice)
    const ICRAfter = await troveManager.getCurrentICR(alice, price)
    const depositAfter = (await stabilityPool.deposits(alice))[0]
    const stakeAfter = await pollenStaking.stakes(alice)

    // check proxy balances remain the same
    assert.equal(ibgtBalanceAfter.toString(), ibgtBalanceBefore.toString())
    assert.equal(nectBalanceAfter.toString(), nectBalanceBefore.toString())
    assert.equal(pollenBalanceAfter.toString(), pollenBalanceBefore.toString())
    // check trove has increased debt by the ICR proportional amount to iBGT gain
    th.assertIsApproximatelyEqual(troveDebtAfter, troveDebtBefore.add(proportionalNECT))
    // check trove has increased collateral by the iBGT gain
    th.assertIsApproximatelyEqual(troveCollAfter, troveCollBefore.add(expectediBGTGain_A))
    // check that ICR remains constant
    th.assertIsApproximatelyEqual(ICRAfter, ICRBefore)
    // check that Stability Pool deposit
    th.assertIsApproximatelyEqual(depositAfter, depositBefore.sub(expectedNECTLoss_A).add(netDebtChange))
    // check pollen balance remains the same
    th.assertIsApproximatelyEqual(pollenBalanceAfter, pollenBalanceBefore)

    // POLLEN staking
    th.assertIsApproximatelyEqual(stakeAfter, stakeBefore.add(expectedPOLLENGain_A))

    // Expect Alice has withdrawn all iBGT gain
    const alice_pendingiBGTGain = await stabilityPool.getDepositoriBGTGain(alice)
    assert.equal(alice_pendingiBGTGain, 0)
  })


  // --- claimStakingGainsAndRecycle ---

  it('claimStakingGainsAndRecycle(): only owner can call it', async () => {
    // Whale opens Trove
    await openTrove({ extraNECTAmount: toBN(dec(1850, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: whale } })

    // alice opens trove
    await openTrove({ extraNECTAmount: toBN(dec(150, 18)), extraParams: { from: alice } })

    // mint some POLLEN
    await pollenTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(whale), dec(1850, 18))
    await pollenTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(alice), dec(150, 18))

    // stake POLLEN
    await pollenStaking.stake(dec(1850, 18), { from: whale })
    await pollenStaking.stake(dec(150, 18), { from: alice })

    // Defaulter Trove opened
    const { nectAmount, netDebt, totalDebt, collateral } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: defaulter_1 } })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // whale redeems 100 NECT
    const redeemedAmount = toBN(dec(100, 18))
    await th.redeemCollateral(whale, contracts, redeemedAmount, GAS_PRICE)

    // Bob tries to claims staking gains in behalf of Alice
    const proxy = borrowerWrappers.getProxyFromUser(alice)
    const signature = 'claimStakingGainsAndRecycle(uint256,address,address)'
    const calldata = th.getTransactionData(signature, [th._100pct, alice, alice])
    await assertRevert(proxy.methods["execute(address,bytes)"](borrowerWrappers.scriptAddress, calldata, { from: bob }), 'ds-auth-unauthorized')
  })

  it('claimStakingGainsAndRecycle(): reverts if user has no trove', async () => {
    const price = toBN(dec(200, 18))

    // Whale opens Trove
    await openTrove({ extraNECTAmount: toBN(dec(1850, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: whale } })
    // Whale deposits 1850 NECT in StabilityPool
    await stabilityPool.provideToSP(dec(1850, 18), ZERO_ADDRESS, { from: whale })

    // alice opens trove and provides 150 NECT to StabilityPool
    //await openTrove({ extraNECTAmount: toBN(dec(150, 18)), extraParams: { from: alice } })
    //await stabilityPool.provideToSP(dec(150, 18), ZERO_ADDRESS, { from: alice })

    // mint some POLLEN
    await pollenTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(whale), dec(1850, 18))
    await pollenTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(alice), dec(150, 18))

    // stake POLLEN
    await pollenStaking.stake(dec(1850, 18), { from: whale })
    await pollenStaking.stake(dec(150, 18), { from: alice })

    // Defaulter Trove opened
    const { nectAmount, netDebt, totalDebt, collateral } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: defaulter_1 } })
    const borrowingFee = netDebt.sub(nectAmount)

    // Alice NECT gain is ((150/2000) * borrowingFee)
    const expectedNECTGain_A = borrowingFee.mul(toBN(dec(150, 18))).div(toBN(dec(2000, 18)))

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // whale redeems 100 NECT
    const redeemedAmount = toBN(dec(100, 18))
    await th.redeemCollateral(whale, contracts, redeemedAmount, GAS_PRICE)

    const ibgtBalanceBefore = await iBGTToken.balanceOf(borrowerOperations.getProxyAddressFromUser(alice))
    const troveCollBefore = await troveManager.getTroveColl(alice)
    const nectBalanceBefore = await nectToken.balanceOf(alice)
    const troveDebtBefore = await troveManager.getTroveDebt(alice)
    const pollenBalanceBefore = await pollenToken.balanceOf(alice)
    const ICRBefore = await troveManager.getCurrentICR(alice, price)
    const depositBefore = (await stabilityPool.deposits(alice))[0]
    const stakeBefore = await pollenStaking.stakes(alice)

    // Alice claims staking rewards and puts them back in the system through the proxy
    await assertRevert(
      borrowerWrappers.claimStakingGainsAndRecycle(th._100pct, alice, alice, { from: alice }),
      'BorrowerWrappersScript: caller must have an active trove'
    )

    const ibgtBalanceAfter = await iBGTToken.balanceOf(borrowerOperations.getProxyAddressFromUser(alice))
    const troveCollAfter = await troveManager.getTroveColl(alice)
    const nectBalanceAfter = await nectToken.balanceOf(alice)
    const troveDebtAfter = await troveManager.getTroveDebt(alice)
    const pollenBalanceAfter = await pollenToken.balanceOf(alice)
    const ICRAfter = await troveManager.getCurrentICR(alice, price)
    const depositAfter = (await stabilityPool.deposits(alice))[0]
    const stakeAfter = await pollenStaking.stakes(alice)

    // check everything remains the same
    assert.equal(ibgtBalanceAfter.toString(), ibgtBalanceBefore.toString())
    assert.equal(nectBalanceAfter.toString(), nectBalanceBefore.toString())
    assert.equal(pollenBalanceAfter.toString(), pollenBalanceBefore.toString())
    th.assertIsApproximatelyEqual(troveDebtAfter, troveDebtBefore, 10000)
    th.assertIsApproximatelyEqual(troveCollAfter, troveCollBefore)
    th.assertIsApproximatelyEqual(ICRAfter, ICRBefore)
    th.assertIsApproximatelyEqual(depositAfter, depositBefore, 10000)
    th.assertIsApproximatelyEqual(pollenBalanceBefore, pollenBalanceAfter)
    // POLLEN staking
    th.assertIsApproximatelyEqual(stakeAfter, stakeBefore)

    // Expect Alice has withdrawn all iBGT gain
    const alice_pendingiBGTGain = await stabilityPool.getDepositoriBGTGain(alice)
    assert.equal(alice_pendingiBGTGain, 0)
  })

  it('claimStakingGainsAndRecycle(): with only iBGT gain', async () => {
    const price = toBN(dec(200, 18))

    // Whale opens Trove
    await openTrove({ extraNECTAmount: toBN(dec(1850, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: whale } })

    // Defaulter Trove opened
    const { nectAmount, netDebt, collateral } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: defaulter_1 } })
    const borrowingFee = netDebt.sub(nectAmount)

    // alice opens trove and provides 150 NECT to StabilityPool
    await openTrove({ extraNECTAmount: toBN(dec(150, 18)), extraParams: { from: alice } })
    await stabilityPool.provideToSP(dec(150, 18), ZERO_ADDRESS, { from: alice })

    // mint some POLLEN
    await pollenTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(whale), dec(1850, 18))
    await pollenTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(alice), dec(150, 18))

    // stake POLLEN
    await pollenStaking.stake(dec(1850, 18), { from: whale })
    await pollenStaking.stake(dec(150, 18), { from: alice })

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // whale redeems 100 NECT
    const redeemedAmount = toBN(dec(100, 18))
    await th.redeemCollateral(whale, contracts, redeemedAmount, GAS_PRICE)

    // Alice iBGT gain is ((150/2000) * (redemption fee over redeemedAmount) / price)
    const redemptionFee = await troveManager.getRedemptionFeeWithDecay(redeemedAmount)
    const expectediBGTGain_A = redemptionFee.mul(toBN(dec(150, 18))).div(toBN(dec(2000, 18))).mul(mv._1e18BN).div(price)

    const ibgtBalanceBefore = await iBGTToken.balanceOf(borrowerOperations.getProxyAddressFromUser(alice))
    const troveCollBefore = await troveManager.getTroveColl(alice)
    const nectBalanceBefore = await nectToken.balanceOf(alice)
    const troveDebtBefore = await troveManager.getTroveDebt(alice)
    const pollenBalanceBefore = await pollenToken.balanceOf(alice)
    const ICRBefore = await troveManager.getCurrentICR(alice, price)
    const depositBefore = (await stabilityPool.deposits(alice))[0]
    const stakeBefore = await pollenStaking.stakes(alice)

    const proportionalNECT = expectediBGTGain_A.mul(price).div(ICRBefore)
    const borrowingRate = await troveManagerOriginal.getBorrowingRateWithDecay()
    const netDebtChange = proportionalNECT.mul(toBN(dec(1, 18))).div(toBN(dec(1, 18)).add(borrowingRate))

    const expectedPOLLENGain_A = toBN('839557069990108416000000')

    const proxyAddress = borrowerWrappers.getProxyAddressFromUser(alice)
    // Alice claims staking rewards and puts them back in the system through the proxy
    await borrowerWrappers.claimStakingGainsAndRecycle(th._100pct, alice, alice, { from: alice })

    // Alice new NECT gain due to her own Trove adjustment: ((150/2000) * (borrowing fee over netDebtChange))
    const newBorrowingFee = await troveManagerOriginal.getBorrowingFeeWithDecay(netDebtChange)
    const expectedNewNECTGain_A = newBorrowingFee.mul(toBN(dec(150, 18))).div(toBN(dec(2000, 18)))

    const ibgtBalanceAfter = await iBGTToken.balanceOf(borrowerOperations.getProxyAddressFromUser(alice))
    const troveCollAfter = await troveManager.getTroveColl(alice)
    const nectBalanceAfter = await nectToken.balanceOf(alice)
    const troveDebtAfter = await troveManager.getTroveDebt(alice)
    const pollenBalanceAfter = await pollenToken.balanceOf(alice)
    const ICRAfter = await troveManager.getCurrentICR(alice, price)
    const depositAfter = (await stabilityPool.deposits(alice))[0]
    const stakeAfter = await pollenStaking.stakes(alice)

    // check proxy balances remain the same
    assert.equal(ibgtBalanceAfter.toString(), ibgtBalanceBefore.toString())
    assert.equal(pollenBalanceAfter.toString(), pollenBalanceBefore.toString())
    // check proxy nect balance has increased by own adjust trove reward
    th.assertIsApproximatelyEqual(nectBalanceAfter, nectBalanceBefore.add(expectedNewNECTGain_A))
    // check trove has increased debt by the ICR proportional amount to iBGT gain
    th.assertIsApproximatelyEqual(troveDebtAfter, troveDebtBefore.add(proportionalNECT), 10000)
    // check trove has increased collateral by the iBGT gain
    th.assertIsApproximatelyEqual(troveCollAfter, troveCollBefore.add(expectediBGTGain_A))
    // check that ICR remains constant
    th.assertIsApproximatelyEqual(ICRAfter, ICRBefore)
    // check that Stability Pool deposit
    th.assertIsApproximatelyEqual(depositAfter, depositBefore.add(netDebtChange), 10000)
    // check pollen balance remains the same
    th.assertIsApproximatelyEqual(pollenBalanceBefore, pollenBalanceAfter)

    // POLLEN staking
    th.assertIsApproximatelyEqual(stakeAfter, stakeBefore.add(expectedPOLLENGain_A))

    // Expect Alice has withdrawn all iBGT gain
    const alice_pendingiBGTGain = await stabilityPool.getDepositoriBGTGain(alice)
    assert.equal(alice_pendingiBGTGain, 0)
  })

  it('claimStakingGainsAndRecycle(): with only NECT gain', async () => {
    const price = toBN(dec(200, 18))

    // Whale opens Trove
    await openTrove({ extraNECTAmount: toBN(dec(1850, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: whale } })

    // alice opens trove and provides 150 NECT to StabilityPool
    await openTrove({ extraNECTAmount: toBN(dec(150, 18)), extraParams: { from: alice } })
    await stabilityPool.provideToSP(dec(150, 18), ZERO_ADDRESS, { from: alice })

    // mint some POLLEN
    await pollenTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(whale), dec(1850, 18))
    await pollenTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(alice), dec(150, 18))

    // stake POLLEN
    await pollenStaking.stake(dec(1850, 18), { from: whale })
    await pollenStaking.stake(dec(150, 18), { from: alice })

    // Defaulter Trove opened
    const { nectAmount, netDebt, collateral } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: defaulter_1 } })
    const borrowingFee = netDebt.sub(nectAmount)

    // Alice NECT gain is ((150/2000) * borrowingFee)
    const expectedNECTGain_A = borrowingFee.mul(toBN(dec(150, 18))).div(toBN(dec(2000, 18)))

    const ibgtBalanceBefore = await iBGTToken.balanceOf(borrowerOperations.getProxyAddressFromUser(alice))
    const troveCollBefore = await troveManager.getTroveColl(alice)
    const nectBalanceBefore = await nectToken.balanceOf(alice)
    const troveDebtBefore = await troveManager.getTroveDebt(alice)
    const pollenBalanceBefore = await pollenToken.balanceOf(alice)
    const ICRBefore = await troveManager.getCurrentICR(alice, price)
    const depositBefore = (await stabilityPool.deposits(alice))[0]
    const stakeBefore = await pollenStaking.stakes(alice)

    const borrowingRate = await troveManagerOriginal.getBorrowingRateWithDecay()

    // Alice claims staking rewards and puts them back in the system through the proxy
    await borrowerWrappers.claimStakingGainsAndRecycle(th._100pct, alice, alice, { from: alice })

    const ibgtBalanceAfter = await iBGTToken.balanceOf(borrowerOperations.getProxyAddressFromUser(alice))
    const troveCollAfter = await troveManager.getTroveColl(alice)
    const nectBalanceAfter = await nectToken.balanceOf(alice)
    const troveDebtAfter = await troveManager.getTroveDebt(alice)
    const pollenBalanceAfter = await pollenToken.balanceOf(alice)
    const ICRAfter = await troveManager.getCurrentICR(alice, price)
    const depositAfter = (await stabilityPool.deposits(alice))[0]
    const stakeAfter = await pollenStaking.stakes(alice)

    // check proxy balances remain the same
    assert.equal(ibgtBalanceAfter.toString(), ibgtBalanceBefore.toString())
    assert.equal(pollenBalanceAfter.toString(), pollenBalanceBefore.toString())
    // check proxy nect balance has increased by own adjust trove reward
    th.assertIsApproximatelyEqual(nectBalanceAfter, nectBalanceBefore)
    // check trove has increased debt by the ICR proportional amount to iBGT gain
    th.assertIsApproximatelyEqual(troveDebtAfter, troveDebtBefore, 10000)
    // check trove has increased collateral by the iBGT gain
    th.assertIsApproximatelyEqual(troveCollAfter, troveCollBefore)
    // check that ICR remains constant
    th.assertIsApproximatelyEqual(ICRAfter, ICRBefore)
    // check that Stability Pool deposit
    th.assertIsApproximatelyEqual(depositAfter, depositBefore.add(expectedNECTGain_A), 10000)
    // check pollen balance remains the same
    th.assertIsApproximatelyEqual(pollenBalanceBefore, pollenBalanceAfter)

    // Expect Alice has withdrawn all iBGT gain
    const alice_pendingiBGTGain = await stabilityPool.getDepositoriBGTGain(alice)
    assert.equal(alice_pendingiBGTGain, 0)
  })

  it('claimStakingGainsAndRecycle(): with both iBGT and NECT gains', async () => {
    const price = toBN(dec(200, 18))

    // Whale opens Trove
    await openTrove({ extraNECTAmount: toBN(dec(1850, 18)), ICR: toBN(dec(2, 18)), extraParams: { from: whale } })

    // alice opens trove and provides 150 NECT to StabilityPool
    await openTrove({ extraNECTAmount: toBN(dec(150, 18)), extraParams: { from: alice } })
    await stabilityPool.provideToSP(dec(150, 18), ZERO_ADDRESS, { from: alice })

    // mint some POLLEN
    await pollenTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(whale), dec(1850, 18))
    await pollenTokenOriginal.unprotectedMint(borrowerOperations.getProxyAddressFromUser(alice), dec(150, 18))

    // stake POLLEN
    await pollenStaking.stake(dec(1850, 18), { from: whale })
    await pollenStaking.stake(dec(150, 18), { from: alice })

    // Defaulter Trove opened
    const { nectAmount, netDebt, collateral } = await openTrove({ ICR: toBN(dec(210, 16)), extraParams: { from: defaulter_1 } })
    const borrowingFee = netDebt.sub(nectAmount)

    // Alice NECT gain is ((150/2000) * borrowingFee)
    const expectedNECTGain_A = borrowingFee.mul(toBN(dec(150, 18))).div(toBN(dec(2000, 18)))

    // skip bootstrapping phase
    await th.fastForwardTime(timeValues.SECONDS_IN_ONE_WEEK * 2, web3.currentProvider)

    // whale redeems 100 NECT
    const redeemedAmount = toBN(dec(100, 18))
    await th.redeemCollateral(whale, contracts, redeemedAmount, GAS_PRICE)

    // Alice iBGT gain is ((150/2000) * (redemption fee over redeemedAmount) / price)
    const redemptionFee = await troveManager.getRedemptionFeeWithDecay(redeemedAmount)
    const expectediBGTGain_A = redemptionFee.mul(toBN(dec(150, 18))).div(toBN(dec(2000, 18))).mul(mv._1e18BN).div(price)

    const ibgtBalanceBefore = await iBGTToken.balanceOf(borrowerOperations.getProxyAddressFromUser(alice))
    const troveCollBefore = await troveManager.getTroveColl(alice)
    const nectBalanceBefore = await nectToken.balanceOf(alice)
    const troveDebtBefore = await troveManager.getTroveDebt(alice)
    const pollenBalanceBefore = await pollenToken.balanceOf(alice)
    const ICRBefore = await troveManager.getCurrentICR(alice, price)
    const depositBefore = (await stabilityPool.deposits(alice))[0]
    const stakeBefore = await pollenStaking.stakes(alice)

    const proportionalNECT = expectediBGTGain_A.mul(price).div(ICRBefore)
    const borrowingRate = await troveManagerOriginal.getBorrowingRateWithDecay()
    const netDebtChange = proportionalNECT.mul(toBN(dec(1, 18))).div(toBN(dec(1, 18)).add(borrowingRate))
    const expectedTotalNECT = expectedNECTGain_A.add(netDebtChange)

    const expectedPOLLENGain_A = toBN('839557069990108416000000')

    // Alice claims staking rewards and puts them back in the system through the proxy
    await borrowerWrappers.claimStakingGainsAndRecycle(th._100pct, alice, alice, { from: alice })

    // Alice new NECT gain due to her own Trove adjustment: ((150/2000) * (borrowing fee over netDebtChange))
    const newBorrowingFee = await troveManagerOriginal.getBorrowingFeeWithDecay(netDebtChange)
    const expectedNewNECTGain_A = newBorrowingFee.mul(toBN(dec(150, 18))).div(toBN(dec(2000, 18)))

    const ibgtBalanceAfter = await iBGTToken.balanceOf(borrowerOperations.getProxyAddressFromUser(alice))
    const troveCollAfter = await troveManager.getTroveColl(alice)
    const nectBalanceAfter = await nectToken.balanceOf(alice)
    const troveDebtAfter = await troveManager.getTroveDebt(alice)
    const pollenBalanceAfter = await pollenToken.balanceOf(alice)
    const ICRAfter = await troveManager.getCurrentICR(alice, price)
    const depositAfter = (await stabilityPool.deposits(alice))[0]
    const stakeAfter = await pollenStaking.stakes(alice)

    // check proxy balances remain the same
    assert.equal(ibgtBalanceAfter.toString(), ibgtBalanceBefore.toString())
    assert.equal(pollenBalanceAfter.toString(), pollenBalanceBefore.toString())
    // check proxy nect balance has increased by own adjust trove reward
    th.assertIsApproximatelyEqual(nectBalanceAfter, nectBalanceBefore.add(expectedNewNECTGain_A))
    // check trove has increased debt by the ICR proportional amount to iBGT gain
    th.assertIsApproximatelyEqual(troveDebtAfter, troveDebtBefore.add(proportionalNECT), 10000)
    // check trove has increased collateral by the iBGT gain
    th.assertIsApproximatelyEqual(troveCollAfter, troveCollBefore.add(expectediBGTGain_A))
    // check that ICR remains constant
    th.assertIsApproximatelyEqual(ICRAfter, ICRBefore)
    // check that Stability Pool deposit
    th.assertIsApproximatelyEqual(depositAfter, depositBefore.add(expectedTotalNECT), 10000)
    // check pollen balance remains the same
    th.assertIsApproximatelyEqual(pollenBalanceBefore, pollenBalanceAfter)

    // POLLEN staking
    th.assertIsApproximatelyEqual(stakeAfter, stakeBefore.add(expectedPOLLENGain_A))

    // Expect Alice has withdrawn all iBGT gain
    const alice_pendingiBGTGain = await stabilityPool.getDepositoriBGTGain(alice)
    assert.equal(alice_pendingiBGTGain, 0)
  })

})
