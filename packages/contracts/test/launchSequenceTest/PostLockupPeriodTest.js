const deploymentHelper = require("../../utils/deploymentHelpers.js")
const testHelpers = require("../../utils/testHelpers.js")

const th = testHelpers.TestHelper
const timeValues = testHelpers.TimeValues
const { dec, toBN, assertRevert } = th

contract('After the initial lockup period has passed', async accounts => {
  const [
    beraborrowAG,
    teamMember_1,
    teamMember_2,
    teamMember_3,
    investor_1,
    investor_2,
    investor_3,
    A, B, C, D, E, F, G, H, I, J, K] = accounts;

  const [bountyAddress, lpRewardsAddress, multisig] = accounts.slice(997, 1000)

  const SECONDS_IN_ONE_DAY = timeValues.SECONDS_IN_ONE_DAY
  const SECONDS_IN_ONE_MONTH = timeValues.SECONDS_IN_ONE_MONTH
  const SECONDS_IN_ONE_YEAR = timeValues.SECONDS_IN_ONE_YEAR
  const maxBytes32 = th.maxBytes32

  let POLLENContracts
  let coreContracts

  // LCs for team members on vesting schedules
  let LC_T1
  let LC_T2
  let LC_T3

  // LCs for investors
  let LC_I1
  let LC_I2
  let LC_I3

  // 1e24 = 1 million tokens with 18 decimal digits
  const teamMemberInitialEntitlement_1 = dec(1, 24)
  const teamMemberInitialEntitlement_2 = dec(2, 24)
  const teamMemberInitialEntitlement_3 = dec(3, 24)

  const investorInitialEntitlement_1 = dec(4, 24)
  const investorInitialEntitlement_2 = dec(5, 24)
  const investorInitialEntitlement_3 = dec(6, 24)

  const teamMemberMonthlyVesting_1 = dec(1, 23)
  const teamMemberMonthlyVesting_2 = dec(2, 23)
  const teamMemberMonthlyVesting_3 = dec(3, 23)

  const POLLENEntitlement_A = dec(1, 24)
  const POLLENEntitlement_B = dec(2, 24)
  const POLLENEntitlement_C = dec(3, 24)
  const POLLENEntitlement_D = dec(4, 24)
  const POLLENEntitlement_E = dec(5, 24)

  let oneYearFromSystemDeployment
  let twoYearsFromSystemDeployment
  let justOverOneYearFromSystemDeployment
  let _18monthsFromSystemDeployment

  beforeEach(async () => {
    // Deploy all contracts from the first account
    POLLENContracts = await deploymentHelper.deployPOLLENTesterContractsHardhat(bountyAddress, lpRewardsAddress, multisig)
    coreContracts = await deploymentHelper.deployBeraBorrowCore()

    pollenStaking = POLLENContracts.pollenStaking
    pollenToken = POLLENContracts.pollenToken
    communityIssuance = POLLENContracts.communityIssuance
    lockupContractFactory = POLLENContracts.lockupContractFactory

    await deploymentHelper.connectPOLLENContracts(POLLENContracts)
    await deploymentHelper.connectCoreContracts(coreContracts, POLLENContracts)
    await deploymentHelper.connectPOLLENContractsToCore(POLLENContracts, coreContracts)

    oneYearFromSystemDeployment = await th.getTimeFromSystemDeployment(pollenToken, web3, timeValues.SECONDS_IN_ONE_YEAR)
    justOverOneYearFromSystemDeployment = oneYearFromSystemDeployment.add(toBN('1'))

    const secondsInTwoYears = toBN(timeValues.SECONDS_IN_ONE_YEAR).mul(toBN('2'))
    const secondsIn18Months = toBN(timeValues.SECONDS_IN_ONE_MONTH).mul(toBN('18'))
    twoYearsFromSystemDeployment = await th.getTimeFromSystemDeployment(pollenToken, web3, secondsInTwoYears)
    _18monthsFromSystemDeployment = await th.getTimeFromSystemDeployment(pollenToken, web3, secondsIn18Months)

    // Deploy 3 LCs for team members on vesting schedules
    const deployedLCtx_T1 = await lockupContractFactory.deployLockupContract(teamMember_1, oneYearFromSystemDeployment, { from: beraborrowAG })
    const deployedLCtx_T2 = await lockupContractFactory.deployLockupContract(teamMember_2, oneYearFromSystemDeployment, { from: beraborrowAG })
    const deployedLCtx_T3 = await lockupContractFactory.deployLockupContract(teamMember_3, oneYearFromSystemDeployment, { from: beraborrowAG })

    const deployedLCtx_I1 = await lockupContractFactory.deployLockupContract(investor_1, oneYearFromSystemDeployment, { from: beraborrowAG })
    const deployedLCtx_I2 = await lockupContractFactory.deployLockupContract(investor_2, oneYearFromSystemDeployment, { from: beraborrowAG })
    const deployedLCtx_I3 = await lockupContractFactory.deployLockupContract(investor_3, oneYearFromSystemDeployment, { from: beraborrowAG })

    // LCs for team members on vesting schedules
    LC_T1 = await th.getLCFromDeploymentTx(deployedLCtx_T1)
    LC_T2 = await th.getLCFromDeploymentTx(deployedLCtx_T2)
    LC_T3 = await th.getLCFromDeploymentTx(deployedLCtx_T3)

    // LCs for investors
    LC_I1 = await th.getLCFromDeploymentTx(deployedLCtx_I1)
    LC_I2 = await th.getLCFromDeploymentTx(deployedLCtx_I2)
    LC_I3 = await th.getLCFromDeploymentTx(deployedLCtx_I3)

    // Multisig transfers initial POLLEN entitlements to LCs
    await pollenToken.transfer(LC_T1.address, teamMemberInitialEntitlement_1, { from: multisig })
    await pollenToken.transfer(LC_T2.address, teamMemberInitialEntitlement_2, { from: multisig })
    await pollenToken.transfer(LC_T3.address, teamMemberInitialEntitlement_3, { from: multisig })

    await pollenToken.transfer(LC_I1.address, investorInitialEntitlement_1, { from: multisig })
    await pollenToken.transfer(LC_I2.address, investorInitialEntitlement_2, { from: multisig })
    await pollenToken.transfer(LC_I3.address, investorInitialEntitlement_3, { from: multisig })

    const systemDeploymentTime = await pollenToken.getDeploymentStartTime()

    // Every thirty days, mutlsig transfers vesting amounts to team members
    for (i = 0; i < 12; i++) {
      await th.fastForwardTime(SECONDS_IN_ONE_MONTH, web3.currentProvider)

      await pollenToken.transfer(LC_T1.address, teamMemberMonthlyVesting_1, { from: multisig })
      await pollenToken.transfer(LC_T2.address, teamMemberMonthlyVesting_2, { from: multisig })
      await pollenToken.transfer(LC_T3.address, teamMemberMonthlyVesting_3, { from: multisig })
    }

    // After Since only 360 days have passed, fast forward 5 more days, until LCs unlock
    await th.fastForwardTime((SECONDS_IN_ONE_DAY * 5), web3.currentProvider)

    const endTime = toBN(await th.getLatestBlockTimestamp(web3))

    const timePassed = endTime.sub(systemDeploymentTime)
    // Confirm that just over one year has passed -  not more than 1000 seconds 
    assert.isTrue(timePassed.sub(toBN(SECONDS_IN_ONE_YEAR)).lt(toBN('1000')))
    assert.isTrue(timePassed.sub(toBN(SECONDS_IN_ONE_YEAR)).gt(toBN('0')))
  })

  describe('Deploying new LCs', async accounts => {
    it("POLLEN Deployer can deploy new LCs", async () => {
      // POLLEN deployer deploys LCs
      const LCDeploymentTx_A = await lockupContractFactory.deployLockupContract(A, justOverOneYearFromSystemDeployment, { from: beraborrowAG })
      const LCDeploymentTx_B = await lockupContractFactory.deployLockupContract(B, oneYearFromSystemDeployment, { from: beraborrowAG })
      const LCDeploymentTx_C = await lockupContractFactory.deployLockupContract(C, '9595995999999900000023423234', { from: beraborrowAG })

      assert.isTrue(LCDeploymentTx_A.receipt.status)
      assert.isTrue(LCDeploymentTx_B.receipt.status)
      assert.isTrue(LCDeploymentTx_C.receipt.status)
    })

    it("Anyone can deploy new LCs", async () => {
      // Various EOAs deploy LCs
      const LCDeploymentTx_1 = await lockupContractFactory.deployLockupContract(A, justOverOneYearFromSystemDeployment, { from: teamMember_1 })
      const LCDeploymentTx_2 = await lockupContractFactory.deployLockupContract(C, oneYearFromSystemDeployment, { from: investor_2 })
      const LCDeploymentTx_3 = await lockupContractFactory.deployLockupContract(beraborrowAG, '9595995999999900000023423234', { from: A })

      assert.isTrue(LCDeploymentTx_1.receipt.status)
      assert.isTrue(LCDeploymentTx_2.receipt.status)
      assert.isTrue(LCDeploymentTx_3.receipt.status)
    })

    it("Anyone can deploy new LCs with unlockTime in the past", async () => {
      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider )
      // Various EOAs deploy LCs
      const LCDeploymentTx_1 = await lockupContractFactory.deployLockupContract(A, justOverOneYearFromSystemDeployment, { from: teamMember_1 })
      const LCDeploymentTx_2 = await lockupContractFactory.deployLockupContract(B, oneYearFromSystemDeployment, { from: E })
      const LCDeploymentTx_3 = await lockupContractFactory.deployLockupContract(C, _18monthsFromSystemDeployment, { from: multisig })
      
      const LC_1 = await th.getLCFromDeploymentTx(LCDeploymentTx_1)
      const LC_2 = await th.getLCFromDeploymentTx(LCDeploymentTx_2)
      const LC_3 = await th.getLCFromDeploymentTx(LCDeploymentTx_3)

      // Check deployments succeeded
      assert.isTrue(LCDeploymentTx_1.receipt.status)
      assert.isTrue(LCDeploymentTx_2.receipt.status)
      assert.isTrue(LCDeploymentTx_3.receipt.status)

      // Check LCs have unlockTimes in the past
      unlockTime_1 = await LC_1.unlockTime()
      unlockTime_2 = await LC_2.unlockTime()
      unlockTime_3 = await LC_3.unlockTime()

      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      assert.isTrue(unlockTime_1.lt(currentTime))
      assert.isTrue(unlockTime_2.lt(currentTime))
      assert.isTrue(unlockTime_3.lt(currentTime))
    })

    it("Anyone can deploy new LCs with unlockTime in the future", async () => {
      // Various EOAs deploy LCs
      const LCDeploymentTx_1 = await lockupContractFactory.deployLockupContract(A, twoYearsFromSystemDeployment, { from: teamMember_1 })
      const LCDeploymentTx_2 = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: E })
    
      const LC_1 = await th.getLCFromDeploymentTx(LCDeploymentTx_1)
      const LC_2 = await th.getLCFromDeploymentTx(LCDeploymentTx_2)

      // Check deployments succeeded
      assert.isTrue(LCDeploymentTx_1.receipt.status)
      assert.isTrue(LCDeploymentTx_2.receipt.status)

      // Check LCs have unlockTimes in the future
      unlockTime_1 = await LC_1.unlockTime()
      unlockTime_2 = await LC_2.unlockTime()

      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      assert.isTrue(unlockTime_1.gt(currentTime))
      assert.isTrue(unlockTime_2.gt(currentTime))
    })
  })

  describe('Beneficiary withdrawal from initial LC', async accounts => {
    it("A beneficiary can withdraw their full entitlement from their LC", async () => {

      // Check POLLEN balances of investors' LCs are equal to their initial entitlements
      assert.equal(await pollenToken.balanceOf(LC_I1.address), investorInitialEntitlement_1)
      assert.equal(await pollenToken.balanceOf(LC_I2.address), investorInitialEntitlement_2)
      assert.equal(await pollenToken.balanceOf(LC_I3.address), investorInitialEntitlement_3)

      // Check POLLEN balances of investors are 0
      assert.equal(await pollenToken.balanceOf(investor_1), '0')
      assert.equal(await pollenToken.balanceOf(investor_2), '0')
      assert.equal(await pollenToken.balanceOf(investor_3), '0')

      // All investors withdraw from their respective LCs
      await LC_I1.withdrawPOLLEN({ from: investor_1 })
      await LC_I2.withdrawPOLLEN({ from: investor_2 })
      await LC_I3.withdrawPOLLEN({ from: investor_3 })

      // Check POLLEN balances of investors now equal their entitlements
      assert.equal(await pollenToken.balanceOf(investor_1), investorInitialEntitlement_1)
      assert.equal(await pollenToken.balanceOf(investor_2), investorInitialEntitlement_2)
      assert.equal(await pollenToken.balanceOf(investor_3), investorInitialEntitlement_3)

      // Check POLLEN balances of investors' LCs are now 0
      assert.equal(await pollenToken.balanceOf(LC_I1.address), '0')
      assert.equal(await pollenToken.balanceOf(LC_I2.address), '0')
      assert.equal(await pollenToken.balanceOf(LC_I3.address), '0')
    })

    it("A beneficiary on a vesting schedule can withdraw their total vested amount from their LC", async () => {
      // Get POLLEN balances of LCs for beneficiaries (team members) on vesting schedules
      const POLLENBalanceOfLC_T1_Before = await pollenToken.balanceOf(LC_T1.address)
      const POLLENBalanceOfLC_T2_Before = await pollenToken.balanceOf(LC_T2.address)
      const POLLENBalanceOfLC_T3_Before = await pollenToken.balanceOf(LC_T3.address)

      // Check POLLEN balances of vesting beneficiaries' LCs are greater than their initial entitlements
      assert.isTrue(POLLENBalanceOfLC_T1_Before.gt(th.toBN(teamMemberInitialEntitlement_1)))
      assert.isTrue(POLLENBalanceOfLC_T2_Before.gt(th.toBN(teamMemberInitialEntitlement_2)))
      assert.isTrue(POLLENBalanceOfLC_T3_Before.gt(th.toBN(teamMemberInitialEntitlement_3)))

      // Check POLLEN balances of beneficiaries are 0
      assert.equal(await pollenToken.balanceOf(teamMember_1), '0')
      assert.equal(await pollenToken.balanceOf(teamMember_2), '0')
      assert.equal(await pollenToken.balanceOf(teamMember_3), '0')

      // All beneficiaries withdraw from their respective LCs
      await LC_T1.withdrawPOLLEN({ from: teamMember_1 })
      await LC_T2.withdrawPOLLEN({ from: teamMember_2 })
      await LC_T3.withdrawPOLLEN({ from: teamMember_3 })

      // Check beneficiaries' POLLEN balances now equal their accumulated vested entitlements
      assert.isTrue((await pollenToken.balanceOf(teamMember_1)).eq(POLLENBalanceOfLC_T1_Before))
      assert.isTrue((await pollenToken.balanceOf(teamMember_2)).eq(POLLENBalanceOfLC_T2_Before))
      assert.isTrue((await pollenToken.balanceOf(teamMember_3)).eq(POLLENBalanceOfLC_T3_Before))

      // Check POLLEN balances of beneficiaries' LCs are now 0
      assert.equal(await pollenToken.balanceOf(LC_T1.address), '0')
      assert.equal(await pollenToken.balanceOf(LC_T2.address), '0')
      assert.equal(await pollenToken.balanceOf(LC_T3.address), '0')
    })

    it("Beneficiaries can withraw full POLLEN balance of LC if it has increased since lockup period ended", async () => {
      // Check POLLEN balances of investors' LCs are equal to their initial entitlements
      assert.equal(await pollenToken.balanceOf(LC_I1.address), investorInitialEntitlement_1)
      assert.equal(await pollenToken.balanceOf(LC_I2.address), investorInitialEntitlement_2)
      assert.equal(await pollenToken.balanceOf(LC_I3.address), investorInitialEntitlement_3)

      // Check POLLEN balances of investors are 0
      assert.equal(await pollenToken.balanceOf(investor_1), '0')
      assert.equal(await pollenToken.balanceOf(investor_2), '0')
      assert.equal(await pollenToken.balanceOf(investor_3), '0')

      // POLLEN multisig sends extra POLLEN to investor LCs
      await pollenToken.transfer(LC_I1.address, dec(1, 24), { from: multisig })
      await pollenToken.transfer(LC_I2.address, dec(1, 24), { from: multisig })
      await pollenToken.transfer(LC_I3.address, dec(1, 24), { from: multisig })

      // 1 month passes
      await th.fastForwardTime(SECONDS_IN_ONE_MONTH, web3.currentProvider)

      // POLLEN multisig again sends extra POLLEN to investor LCs
      await pollenToken.transfer(LC_I1.address, dec(1, 24), { from: multisig })
      await pollenToken.transfer(LC_I2.address, dec(1, 24), { from: multisig })
      await pollenToken.transfer(LC_I3.address, dec(1, 24), { from: multisig })

      // Get POLLEN balances of LCs for investors 
      const POLLENBalanceOfLC_I1_Before = await pollenToken.balanceOf(LC_I1.address)
      const POLLENBalanceOfLC_I2_Before = await pollenToken.balanceOf(LC_I2.address)
      const POLLENBalanceOfLC_I3_Before = await pollenToken.balanceOf(LC_I3.address)

      // Check POLLEN balances of investors' LCs are greater than their initial entitlements
      assert.isTrue(POLLENBalanceOfLC_I1_Before.gt(th.toBN(investorInitialEntitlement_1)))
      assert.isTrue(POLLENBalanceOfLC_I2_Before.gt(th.toBN(investorInitialEntitlement_2)))
      assert.isTrue(POLLENBalanceOfLC_I3_Before.gt(th.toBN(investorInitialEntitlement_3)))

      // All investors withdraw from their respective LCs
      await LC_I1.withdrawPOLLEN({ from: investor_1 })
      await LC_I2.withdrawPOLLEN({ from: investor_2 })
      await LC_I3.withdrawPOLLEN({ from: investor_3 })

      // Check POLLEN balances of investors now equal their LC balances prior to withdrawal
      assert.isTrue((await pollenToken.balanceOf(investor_1)).eq(POLLENBalanceOfLC_I1_Before))
      assert.isTrue((await pollenToken.balanceOf(investor_2)).eq(POLLENBalanceOfLC_I2_Before))
      assert.isTrue((await pollenToken.balanceOf(investor_3)).eq(POLLENBalanceOfLC_I3_Before))

      // Check POLLEN balances of investors' LCs are now 0
      assert.equal(await pollenToken.balanceOf(LC_I1.address), '0')
      assert.equal(await pollenToken.balanceOf(LC_I2.address), '0')
      assert.equal(await pollenToken.balanceOf(LC_I3.address), '0')
    })
  })

  describe('Withdrawal attempts from LCs by non-beneficiaries', async accounts => {
    it("POLLEN Multisig can't withdraw from a LC they deployed through the Factory", async () => {
      try {
        const withdrawalAttempt = await LC_T1.withdrawPOLLEN({ from: multisig })
        assert.isFalse(withdrawalAttempt.receipt.status)
      } catch (error) {
        assert.include(error.message, "LockupContract: caller is not the beneficiary")
      }
    })

    it("POLLEN Multisig can't withdraw from a LC that someone else deployed", async () => {
      // Account D deploys a new LC via the Factory
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, oneYearFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      //POLLEN multisig fund the newly deployed LCs
      await pollenToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

      // POLLEN multisig attempts withdrawal from LC
      try {
        const withdrawalAttempt_B = await LC_B.withdrawPOLLEN({ from: multisig })
        assert.isFalse(withdrawalAttempt_B.receipt.status)
      } catch (error) {
        assert.include(error.message, "LockupContract: caller is not the beneficiary")
      }
    })

    it("Non-beneficiaries cannot withdraw from a LC", async () => {
      const variousEOAs = [
        teamMember_1,
        teamMember_3,
        beraborrowAG,
        investor_1,
        investor_2,
        investor_3,
        A,
        B,
        C,
        D,
        E]

      // Several EOAs attempt to withdraw from the LC that has teamMember_2 as beneficiary
      for (account of variousEOAs) {
        try {
          const withdrawalAttempt = await LC_T2.withdrawPOLLEN({ from: account })
          assert.isFalse(withdrawalAttempt.receipt.status)
        } catch (error) {
          assert.include(error.message, "LockupContract: caller is not the beneficiary")
        }
      }
    })
  })

  describe('Transferring POLLEN', async accounts => {
    it("POLLEN multisig can transfer POLLEN to LCs they deployed", async () => {
      const initialPOLLENBalanceOfLC_T1 = await pollenToken.balanceOf(LC_T1.address)
      const initialPOLLENBalanceOfLC_T2 = await pollenToken.balanceOf(LC_T2.address)
      const initialPOLLENBalanceOfLC_T3 = await pollenToken.balanceOf(LC_T3.address)

      // One month passes
      await th.fastForwardTime(SECONDS_IN_ONE_MONTH, web3.currentProvider)

      // POLLEN multisig transfers vesting amount
      await pollenToken.transfer(LC_T1.address, dec(1, 24), { from: multisig })
      await pollenToken.transfer(LC_T2.address, dec(1, 24), { from: multisig })
      await pollenToken.transfer(LC_T3.address, dec(1, 24), { from: multisig })

      // Get new LC POLLEN balances
      const POLLENBalanceOfLC_T1_1 = await pollenToken.balanceOf(LC_T1.address)
      const POLLENBalanceOfLC_T2_1 = await pollenToken.balanceOf(LC_T2.address)
      const POLLENBalanceOfLC_T3_1 = await pollenToken.balanceOf(LC_T3.address)

      // // Check team member LC balances have increased 
      assert.isTrue(POLLENBalanceOfLC_T1_1.eq(th.toBN(initialPOLLENBalanceOfLC_T1).add(th.toBN(dec(1, 24)))))
      assert.isTrue(POLLENBalanceOfLC_T2_1.eq(th.toBN(initialPOLLENBalanceOfLC_T2).add(th.toBN(dec(1, 24)))))
      assert.isTrue(POLLENBalanceOfLC_T3_1.eq(th.toBN(initialPOLLENBalanceOfLC_T3).add(th.toBN(dec(1, 24)))))

      // Another month passes
      await th.fastForwardTime(SECONDS_IN_ONE_MONTH, web3.currentProvider)

      // POLLEN multisig transfers vesting amount
      await pollenToken.transfer(LC_T1.address, dec(1, 24), { from: multisig })
      await pollenToken.transfer(LC_T2.address, dec(1, 24), { from: multisig })
      await pollenToken.transfer(LC_T3.address, dec(1, 24), { from: multisig })

      // Get new LC POLLEN balances
      const POLLENBalanceOfLC_T1_2 = await pollenToken.balanceOf(LC_T1.address)
      const POLLENBalanceOfLC_T2_2 = await pollenToken.balanceOf(LC_T2.address)
      const POLLENBalanceOfLC_T3_2 = await pollenToken.balanceOf(LC_T3.address)

      // Check team member LC balances have increased again
      assert.isTrue(POLLENBalanceOfLC_T1_2.eq(POLLENBalanceOfLC_T1_1.add(th.toBN(dec(1, 24)))))
      assert.isTrue(POLLENBalanceOfLC_T2_2.eq(POLLENBalanceOfLC_T2_1.add(th.toBN(dec(1, 24)))))
      assert.isTrue(POLLENBalanceOfLC_T3_2.eq(POLLENBalanceOfLC_T3_1.add(th.toBN(dec(1, 24)))))
    })

    it("POLLEN multisig can transfer tokens to LCs deployed by anyone", async () => {
      // A, B, C each deploy a lockup contract ith themself as beneficiary
      const deployedLCtx_A = await lockupContractFactory.deployLockupContract(A, oneYearFromSystemDeployment, { from: A })
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, justOverOneYearFromSystemDeployment, { from: B })
      const deployedLCtx_C = await lockupContractFactory.deployLockupContract(C, twoYearsFromSystemDeployment, { from: C })

      const LC_A = await th.getLCFromDeploymentTx(deployedLCtx_A)
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)
      const LC_C = await th.getLCFromDeploymentTx(deployedLCtx_C)

      // Check balances of LCs are 0
      assert.equal(await pollenToken.balanceOf(LC_A.address), '0')
      assert.equal(await pollenToken.balanceOf(LC_B.address), '0')
      assert.equal(await pollenToken.balanceOf(LC_C.address), '0')

      // One month passes
      await th.fastForwardTime(SECONDS_IN_ONE_MONTH, web3.currentProvider)

      // POLLEN multisig transfers POLLEN to LCs deployed by other accounts
      await pollenToken.transfer(LC_A.address, dec(1, 24), { from: multisig })
      await pollenToken.transfer(LC_B.address, dec(2, 24), { from: multisig })
      await pollenToken.transfer(LC_C.address, dec(3, 24), { from: multisig })

      // Check balances of LCs have increased
      assert.equal(await pollenToken.balanceOf(LC_A.address), dec(1, 24))
      assert.equal(await pollenToken.balanceOf(LC_B.address), dec(2, 24))
      assert.equal(await pollenToken.balanceOf(LC_C.address), dec(3, 24))
    })

    it("POLLEN multisig can transfer POLLEN directly to any externally owned account", async () => {
      // Check POLLEN balances of EOAs
      assert.equal(await pollenToken.balanceOf(A), '0')
      assert.equal(await pollenToken.balanceOf(B), '0')
      assert.equal(await pollenToken.balanceOf(C), '0')

      // POLLEN multisig transfers POLLEN to EOAs
      const txA = await pollenToken.transfer(A, dec(1, 24), { from: multisig })
      const txB = await pollenToken.transfer(B, dec(2, 24), { from: multisig })
      const txC = await pollenToken.transfer(C, dec(3, 24), { from: multisig })

      // Check new balances have increased by correct amount
      assert.equal(await pollenToken.balanceOf(A), dec(1, 24))
      assert.equal(await pollenToken.balanceOf(B), dec(2, 24))
      assert.equal(await pollenToken.balanceOf(C), dec(3, 24))
    })

    it("Anyone can transfer POLLEN to LCs deployed by anyone", async () => {
      // Start D, E, F with some POLLEN
      await pollenToken.transfer(D, dec(1, 24), { from: multisig })
      await pollenToken.transfer(E, dec(2, 24), { from: multisig })
      await pollenToken.transfer(F, dec(3, 24), { from: multisig })

      // H, I, J deploy lockup contracts with A, B, C as beneficiaries, respectively
      const deployedLCtx_A = await lockupContractFactory.deployLockupContract(A, oneYearFromSystemDeployment, { from: H })
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, justOverOneYearFromSystemDeployment, { from: I })
      const deployedLCtx_C = await lockupContractFactory.deployLockupContract(C, twoYearsFromSystemDeployment, { from: J })

      // Grab contract addresses from deployment tx events
      const LCAddress_A = await th.getLCAddressFromDeploymentTx(deployedLCtx_A)
      const LCAddress_B = await th.getLCAddressFromDeploymentTx(deployedLCtx_B)
      const LCAddress_C = await th.getLCAddressFromDeploymentTx(deployedLCtx_C)

      // Check balances of LCs are 0
      assert.equal(await pollenToken.balanceOf(LCAddress_A), '0')
      assert.equal(await pollenToken.balanceOf(LCAddress_B), '0')
      assert.equal(await pollenToken.balanceOf(LCAddress_C), '0')

      // D, E, F transfer POLLEN to LCs
      await pollenToken.transfer(LCAddress_A, dec(1, 24), { from: D })
      await pollenToken.transfer(LCAddress_B, dec(2, 24), { from: E })
      await pollenToken.transfer(LCAddress_C, dec(3, 24), { from: F })

      // Check balances of LCs has increased
      assert.equal(await pollenToken.balanceOf(LCAddress_A), dec(1, 24))
      assert.equal(await pollenToken.balanceOf(LCAddress_B), dec(2, 24))
      assert.equal(await pollenToken.balanceOf(LCAddress_C), dec(3, 24))
    })


    it("Anyone can transfer to an EOA", async () => {
      // Start D, E, beraborrowAG with some POLLEN
      await pollenToken.unprotectedMint(D, dec(1, 24))
      await pollenToken.unprotectedMint(E, dec(2, 24))
      await pollenToken.unprotectedMint(beraborrowAG, dec(3, 24))
      await pollenToken.unprotectedMint(multisig, dec(4, 24))

      // POLLEN holders transfer to other EOAs
      const POLLENtransferTx_1 = await pollenToken.transfer(A, dec(1, 18), { from: D })
      const POLLENtransferTx_2 = await pollenToken.transfer(beraborrowAG, dec(1, 18), { from: E })
      const POLLENtransferTx_3 = await pollenToken.transfer(F, dec(1, 18), { from: beraborrowAG })
      const POLLENtransferTx_4 = await pollenToken.transfer(G, dec(1, 18), { from: multisig })

      assert.isTrue(POLLENtransferTx_1.receipt.status)
      assert.isTrue(POLLENtransferTx_2.receipt.status)
      assert.isTrue(POLLENtransferTx_3.receipt.status)
      assert.isTrue(POLLENtransferTx_4.receipt.status)
    })

    it("Anyone can approve any EOA to spend their POLLEN", async () => {
      // EOAs approve EOAs to spend POLLEN
      const POLLENapproveTx_1 = await pollenToken.approve(A, dec(1, 18), { from: multisig })
      const POLLENapproveTx_2 = await pollenToken.approve(B, dec(1, 18), { from: G })
      const POLLENapproveTx_3 = await pollenToken.approve(beraborrowAG, dec(1, 18), { from: F })
      await assert.isTrue(POLLENapproveTx_1.receipt.status)
      await assert.isTrue(POLLENapproveTx_2.receipt.status)
      await assert.isTrue(POLLENapproveTx_3.receipt.status)
    })

    it("Anyone can increaseAllowance for any EOA or BeraBorrow contract", async () => {
      // Anyone can increaseAllowance of EOAs to spend POLLEN
      const POLLENIncreaseAllowanceTx_1 = await pollenToken.increaseAllowance(A, dec(1, 18), { from: multisig })
      const POLLENIncreaseAllowanceTx_2 = await pollenToken.increaseAllowance(B, dec(1, 18), { from: G })
      const POLLENIncreaseAllowanceTx_3 = await pollenToken.increaseAllowance(multisig, dec(1, 18), { from: F })
      await assert.isTrue(POLLENIncreaseAllowanceTx_1.receipt.status)
      await assert.isTrue(POLLENIncreaseAllowanceTx_2.receipt.status)
      await assert.isTrue(POLLENIncreaseAllowanceTx_3.receipt.status)

      // Increase allowance of BeraBorrow contracts from F
      for (const contract of Object.keys(coreContracts)) {
        const POLLENIncreaseAllowanceTx = await pollenToken.increaseAllowance(coreContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(POLLENIncreaseAllowanceTx.receipt.status)
      }

      // Increase allowance of BeraBorrow contracts from multisig
      for (const contract of Object.keys(coreContracts)) {
        const POLLENIncreaseAllowanceTx = await pollenToken.increaseAllowance(coreContracts[contract].address, dec(1, 18), { from: multisig })
        await assert.isTrue(POLLENIncreaseAllowanceTx.receipt.status)
      }

      // Increase allowance of POLLEN contracts from F
      for (const contract of Object.keys(POLLENContracts)) {
        const POLLENIncreaseAllowanceTx = await pollenToken.increaseAllowance(POLLENContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(POLLENIncreaseAllowanceTx.receipt.status)
      }

      // Increase allowance of LQT contracts from multisig
      for (const contract of Object.keys(POLLENContracts)) {
        const POLLENIncreaseAllowanceTx = await pollenToken.increaseAllowance(POLLENContracts[contract].address, dec(1, 18), { from: multisig })
        await assert.isTrue(POLLENIncreaseAllowanceTx.receipt.status)
      }
    })

    it("Anyone can decreaseAllowance for any EOA or BeraBorrow contract", async () => {
      //First, increase allowance of A, B LiqAG and core contracts
      const POLLENapproveTx_1 = await pollenToken.approve(A, dec(1, 18), { from: multisig })
      const POLLENapproveTx_2 = await pollenToken.approve(B, dec(1, 18), { from: G })
      const POLLENapproveTx_3 = await pollenToken.approve(multisig, dec(1, 18), { from: F })
      await assert.isTrue(POLLENapproveTx_1.receipt.status)
      await assert.isTrue(POLLENapproveTx_2.receipt.status)
      await assert.isTrue(POLLENapproveTx_3.receipt.status)

      // --- SETUP ---

      // IncreaseAllowance of core contracts, from F
      for (const contract of Object.keys(coreContracts)) {
        const POLLENtransferTx = await pollenToken.increaseAllowance(coreContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(POLLENtransferTx.receipt.status)
      }

      // IncreaseAllowance of core contracts, from multisig
      for (const contract of Object.keys(coreContracts)) {
        const POLLENtransferTx = await pollenToken.increaseAllowance(coreContracts[contract].address, dec(1, 18), { from: multisig })
        await assert.isTrue(POLLENtransferTx.receipt.status)
      }

      // Increase allowance of POLLEN contracts from F
      for (const contract of Object.keys(POLLENContracts)) {
        const POLLENIncreaseAllowanceTx = await pollenToken.increaseAllowance(POLLENContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(POLLENIncreaseAllowanceTx.receipt.status)
      }

      // Increase allowance of LQTT contracts from multisig 
      for (const contract of Object.keys(POLLENContracts)) {
        const POLLENIncreaseAllowanceTx = await pollenToken.increaseAllowance(POLLENContracts[contract].address, dec(1, 18), { from: multisig })
        await assert.isTrue(POLLENIncreaseAllowanceTx.receipt.status)
      }

      // --- TEST ---

      // Decrease allowance of A, B, multisig
      const POLLENDecreaseAllowanceTx_1 = await pollenToken.decreaseAllowance(A, dec(1, 18), { from: multisig })
      const POLLENDecreaseAllowanceTx_2 = await pollenToken.decreaseAllowance(B, dec(1, 18), { from: G })
      const POLLENDecreaseAllowanceTx_3 = await pollenToken.decreaseAllowance(multisig, dec(1, 18), { from: F })
      await assert.isTrue(POLLENDecreaseAllowanceTx_1.receipt.status)
      await assert.isTrue(POLLENDecreaseAllowanceTx_2.receipt.status)
      await assert.isTrue(POLLENDecreaseAllowanceTx_3.receipt.status)

      // Decrease allowance of core contracts, from F
      for (const contract of Object.keys(coreContracts)) {
        const POLLENDecreaseAllowanceTx = await pollenToken.decreaseAllowance(coreContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(POLLENDecreaseAllowanceTx.receipt.status)
      }

      // Decrease allowance of core contracts from multisig
      for (const contract of Object.keys(coreContracts)) {
        const POLLENDecreaseAllowanceTx = await pollenToken.decreaseAllowance(coreContracts[contract].address, dec(1, 18), { from: multisig })
        await assert.isTrue(POLLENDecreaseAllowanceTx.receipt.status)
      }

      // Decrease allowance of POLLEN contracts from F
      for (const contract of Object.keys(POLLENContracts)) {
        const POLLENIncreaseAllowanceTx = await pollenToken.decreaseAllowance(POLLENContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(POLLENIncreaseAllowanceTx.receipt.status)
      }

      // Decrease allowance of POLLEN contracts from multisig
      for (const contract of Object.keys(POLLENContracts)) {
        const POLLENIncreaseAllowanceTx = await pollenToken.decreaseAllowance(POLLENContracts[contract].address, dec(1, 18), { from: multisig })
        await assert.isTrue(POLLENIncreaseAllowanceTx.receipt.status)
      }
    })

    it("Anyone can be the sender in a transferFrom() call", async () => {
      // Fund B, C
      await pollenToken.unprotectedMint(B, dec(1, 18))
      await pollenToken.unprotectedMint(C, dec(1, 18))

      // LiqAG, B, C approve F, G, multisig respectively
      await pollenToken.approve(F, dec(1, 18), { from: multisig })
      await pollenToken.approve(G, dec(1, 18), { from: B })
      await pollenToken.approve(multisig, dec(1, 18), { from: C })

      // Approved addresses transfer from the address they're approved for
      const POLLENtransferFromTx_1 = await pollenToken.transferFrom(multisig, F, dec(1, 18), { from: F })
      const POLLENtransferFromTx_2 = await pollenToken.transferFrom(B, multisig, dec(1, 18), { from: G })
      const POLLENtransferFromTx_3 = await pollenToken.transferFrom(C, A, dec(1, 18), { from: multisig })
      await assert.isTrue(POLLENtransferFromTx_1.receipt.status)
      await assert.isTrue(POLLENtransferFromTx_2.receipt.status)
      await assert.isTrue(POLLENtransferFromTx_3.receipt.status)
    })

    it("Anyone can stake their POLLEN in the staking contract", async () => {
      // Fund F
      await pollenToken.unprotectedMint(F, dec(1, 18))

      const POLLENStakingTx_1 = await pollenStaking.stake(dec(1, 18), { from: F })
      const POLLENStakingTx_2 = await pollenStaking.stake(dec(1, 18), { from: multisig })
      await assert.isTrue(POLLENStakingTx_1.receipt.status)
      await assert.isTrue(POLLENStakingTx_2.receipt.status)
    })
  })

  describe('Withdrawal Attempts on new LCs before unlockTime has passed', async accounts => {
    it("POLLEN Deployer can't withdraw from a funded LC they deployed for another beneficiary through the Factory, before the unlockTime", async () => {
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      // Check currentTime < unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.lt(unlockTime))

      // POLLEN multisig attempts withdrawal from LC they deployed through the Factory
      try {
        const withdrawalAttempt = await LC_B.withdrawPOLLEN({ from: multisig })
        assert.isFalse(withdrawalAttempt.receipt.status)
      } catch (error) {
        assert.include(error.message, "LockupContract: caller is not the beneficiary")
      }
    })

    it("POLLEN Deployer can't withdraw from a funded LC that someone else deployed, before the unlockTime", async () => {
      // Account D deploys a new LC via the Factory
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      //POLLEN multisig fund the newly deployed LCs
      await pollenToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

      // Check currentTime < unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.lt(unlockTime))

      // POLLEN multisig attempts withdrawal from LCs
      try {
        const withdrawalAttempt_B = await LC_B.withdrawPOLLEN({ from: multisig })
        assert.isFalse(withdrawalAttempt_B.receipt.status)
      } catch (error) {
        assert.include(error.message, "LockupContract: caller is not the beneficiary")
      }
    })

    it("Beneficiary can't withdraw from their funded LC, before the unlockTime", async () => {
      // Account D deploys a new LC via the Factory
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      // POLLEN multisig funds contracts
      await pollenToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

      // Check currentTime < unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.lt(unlockTime))

      try {
        const beneficiary = await LC_B.beneficiary()
        const withdrawalAttempt = await LC_B.withdrawPOLLEN({ from: beneficiary })
        assert.isFalse(withdrawalAttempt.receipt.status)
      } catch (error) {
        assert.include(error.message, "LockupContract: The lockup duration must have passed")
      }
    })

    it("No one can withdraw from a beneficiary's funded LC, before the unlockTime", async () => {
      // Account D deploys a new LC via the Factory
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      // POLLEN multisig funds contracts
      await pollenToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

      // Check currentTime < unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.lt(unlockTime))

      const variousEOAs = [teamMember_2, multisig, investor_1, A, C, D, E]

      // Several EOAs attempt to withdraw from LC deployed by D
      for (account of variousEOAs) {
        try {
          const withdrawalAttempt = await LC_B.withdrawPOLLEN({ from: account })
          assert.isFalse(withdrawalAttempt.receipt.status)
        } catch (error) {
          assert.include(error.message, "LockupContract: caller is not the beneficiary")
        }
      }
    })
  })

  describe('Withdrawals from new LCs after unlockTime has passed', async accounts => {
    it("POLLEN Deployer can't withdraw from a funded LC they deployed for another beneficiary through the Factory, after the unlockTime", async () => {
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

      // Check currentTime > unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.gt(unlockTime))

      // POLLEN multisig attempts withdrawal from LC they deployed through the Factory
      try {
        const withdrawalAttempt = await LC_B.withdrawPOLLEN({ from: multisig })
        assert.isFalse(withdrawalAttempt.receipt.status)
      } catch (error) {
        assert.include(error.message, "LockupContract: caller is not the beneficiary")
      }
    })

    it("POLLEN multisig can't withdraw from a funded LC when they are not the beneficiary, after the unlockTime", async () => {
      // Account D deploys a new LC via the Factory
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      //POLLEN multisig fund the newly deployed LC
      await pollenToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

      // Check currentTime > unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.gt(unlockTime))

      // POLLEN multisig attempts withdrawal from LCs
      try {
        const withdrawalAttempt_B = await LC_B.withdrawPOLLEN({ from: multisig })
        assert.isFalse(withdrawalAttempt_B.receipt.status)
      } catch (error) {
        assert.include(error.message, "LockupContract: caller is not the beneficiary")
      }
    })

    it("Beneficiary can withdraw from their funded LC, after the unlockTime", async () => {
      // Account D deploys a new LC via the Factory
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      // POLLEN multisig funds contract
      await pollenToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

      // Check currentTime > unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.gt(unlockTime))

      const beneficiary = await LC_B.beneficiary()
      assert.equal(beneficiary, B)

      // Get B's balance before
      const B_balanceBefore = await pollenToken.balanceOf(B)
      assert.equal(B_balanceBefore, '0')
      
      const withdrawalAttempt = await LC_B.withdrawPOLLEN({ from: B })
      assert.isTrue(withdrawalAttempt.receipt.status)

       // Get B's balance after
       const B_balanceAfter = await pollenToken.balanceOf(B)
       assert.equal(B_balanceAfter, dec(2, 18))
    })

    it("Non-beneficiaries can't withdraw from a beneficiary's funded LC, after the unlockTime", async () => {
      // Account D deploys a new LC via the Factory
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, _18monthsFromSystemDeployment, { from: D })
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

      // POLLEN multisig funds contracts
      await pollenToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

      await th.fastForwardTime(timeValues.SECONDS_IN_ONE_YEAR, web3.currentProvider)

      // Check currentTime > unlockTime
      const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
      const unlockTime = await LC_B.unlockTime()
      assert.isTrue(currentTime.gt(unlockTime))

      const variousEOAs = [teamMember_2, beraborrowAG, investor_1, A, C, D, E]

      // Several EOAs attempt to withdraw from LC deployed by D
      for (account of variousEOAs) {
        try {
          const withdrawalAttempt = await LC_B.withdrawPOLLEN({ from: account })
          assert.isFalse(withdrawalAttempt.receipt.status)
        } catch (error) {
          assert.include(error.message, "LockupContract: caller is not the beneficiary")
        }
      }
    })
  })
})
