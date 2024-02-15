const LockupContract = artifacts.require("./LockupContract.sol")
const LockupContractFactory = artifacts.require("./LockupContractFactory.sol")
const deploymentHelper = require("../../utils/deploymentHelpers.js")

const { TestHelper: th, TimeValues: timeValues } = require("../../utils/testHelpers.js")
const { dec, toBN, assertRevert, ZERO_ADDRESS } = th

contract('During the initial lockup period', async accounts => {
  const [
    beraborrowAG,
    teamMember_1,
    teamMember_2,
    teamMember_3,
    investor_1,
    investor_2,
    investor_3,
    A,
    B,
    C,
    D,
    E,
    F,
    G,
    H,
    I
  ] = accounts;

  const [bountyAddress, lpRewardsAddress, multisig] = accounts.slice(997, 1000)

  const SECONDS_IN_ONE_MONTH = timeValues.SECONDS_IN_ONE_MONTH
  const SECONDS_IN_364_DAYS = timeValues.SECONDS_IN_ONE_DAY * 364

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

  const POLLENEntitlement_A = dec(1, 24)
  const POLLENEntitlement_B = dec(2, 24)
  const POLLENEntitlement_C = dec(3, 24)
  const POLLENEntitlement_D = dec(4, 24)
  const POLLENEntitlement_E = dec(5, 24)

  let oneYearFromSystemDeployment
  let twoYearsFromSystemDeployment

  beforeEach(async () => {
    // Deploy all contracts from the first account
    coreContracts = await deploymentHelper.deployBeraBorrowCore()
    POLLENContracts = await deploymentHelper.deployPOLLENTesterContractsHardhat(bountyAddress, lpRewardsAddress, multisig)

    pollenStaking = POLLENContracts.pollenStaking
    pollenToken = POLLENContracts.pollenToken
    communityIssuance = POLLENContracts.communityIssuance
    lockupContractFactory = POLLENContracts.lockupContractFactory

    await deploymentHelper.connectPOLLENContracts(POLLENContracts)
    await deploymentHelper.connectCoreContracts(coreContracts, POLLENContracts)
    await deploymentHelper.connectPOLLENContractsToCore(POLLENContracts, coreContracts)

    oneYearFromSystemDeployment = await th.getTimeFromSystemDeployment(pollenToken, web3, timeValues.SECONDS_IN_ONE_YEAR)
    const secondsInTwoYears = toBN(timeValues.SECONDS_IN_ONE_YEAR).mul(toBN('2'))
    twoYearsFromSystemDeployment = await th.getTimeFromSystemDeployment(pollenToken, web3, secondsInTwoYears)

    // Deploy 3 LCs for team members on vesting schedules
    const deployedLCtx_T1 = await lockupContractFactory.deployLockupContract(teamMember_1, oneYearFromSystemDeployment, { from: beraborrowAG })
    const deployedLCtx_T2 = await lockupContractFactory.deployLockupContract(teamMember_2, oneYearFromSystemDeployment, { from: beraborrowAG })
    const deployedLCtx_T3 = await lockupContractFactory.deployLockupContract(teamMember_3, oneYearFromSystemDeployment, { from: beraborrowAG })

    // Deploy 3 LCs for investors
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

    // Fast forward time 364 days, so that still less than 1 year since launch has passed
    await th.fastForwardTime(SECONDS_IN_364_DAYS, web3.currentProvider)
  })

  describe('POLLEN transfer during first year after POLLEN deployment', async accounts => {
    // --- BeraBorrow AG transfer restriction, 1st year ---
    it("BeraBorrow multisig can not transfer POLLEN to a LC that was deployed directly", async () => {
      // BeraBorrow multisig deploys LC_A
      const LC_A = await LockupContract.new(pollenToken.address, A, oneYearFromSystemDeployment, { from: multisig })

      // Account F deploys LC_B
      const LC_B = await LockupContract.new(pollenToken.address, B, oneYearFromSystemDeployment, { from: F })

      // POLLEN deployer deploys LC_C
      const LC_C = await LockupContract.new(pollenToken.address, A, oneYearFromSystemDeployment, { from: beraborrowAG })

      // BeraBorrow multisig attempts POLLEN transfer to LC_A
      try {
        const POLLENtransferTx_A = await pollenToken.transfer(LC_A.address, dec(1, 18), { from: multisig })
        assert.isFalse(POLLENtransferTx_A.receipt.status)
      } catch (error) {
        assert.include(error.message, "POLLENToken: recipient must be a LockupContract registered in the Factory")
      }

      // BeraBorrow multisig attempts POLLEN transfer to LC_B
      try {
        const POLLENtransferTx_B = await pollenToken.transfer(LC_B.address, dec(1, 18), { from: multisig })
        assert.isFalse(POLLENtransferTx_B.receipt.status)
      } catch (error) {
        assert.include(error.message, "POLLENToken: recipient must be a LockupContract registered in the Factory")
      }

      try {
        const POLLENtransferTx_C = await pollenToken.transfer(LC_C.address, dec(1, 18), { from: multisig })
        assert.isFalse(POLLENtransferTx_C.receipt.status)
      } catch (error) {
        assert.include(error.message, "POLLENToken: recipient must be a LockupContract registered in the Factory")
      }
    })

    it("BeraBorrow multisig can not transfer to an EOA or BeraBorrow system contracts", async () => {
      // Multisig attempts POLLEN transfer to EOAs
      const POLLENtransferTxPromise_1 = pollenToken.transfer(A, dec(1, 18), { from: multisig })
      const POLLENtransferTxPromise_2 = pollenToken.transfer(B, dec(1, 18), { from: multisig })
      await assertRevert(POLLENtransferTxPromise_1)
      await assertRevert(POLLENtransferTxPromise_2)

      // Multisig attempts POLLEN transfer to core BeraBorrow contracts
      for (const contract of Object.keys(coreContracts)) {
        const POLLENtransferTxPromise = pollenToken.transfer(coreContracts[contract].address, dec(1, 18), { from: multisig })
        await assertRevert(POLLENtransferTxPromise, "POLLENToken: recipient must be a LockupContract registered in the Factory")
      }

      // Multisig attempts POLLEN transfer to POLLEN contracts (excluding LCs)
      for (const contract of Object.keys(POLLENContracts)) {
        const POLLENtransferTxPromise = pollenToken.transfer(POLLENContracts[contract].address, dec(1, 18), { from: multisig })
        await assertRevert(POLLENtransferTxPromise, "POLLENToken: recipient must be a LockupContract registered in the Factory")
      }
    })

    // --- BeraBorrow AG approval restriction, 1st year ---
    it("BeraBorrow multisig can not approve any EOA or BeraBorrow system contract to spend their POLLEN", async () => {
      // Multisig attempts to approve EOAs to spend POLLEN
      const POLLENApproveTxPromise_1 = pollenToken.approve(A, dec(1, 18), { from: multisig })
      const POLLENApproveTxPromise_2 = pollenToken.approve(B, dec(1, 18), { from: multisig })
      await assertRevert(POLLENApproveTxPromise_1, "POLLENToken: caller must not be the multisig")
      await assertRevert(POLLENApproveTxPromise_2, "POLLENToken: caller must not be the multisig")

      // Multisig attempts to approve BeraBorrow contracts to spend POLLEN
      for (const contract of Object.keys(coreContracts)) {
        const POLLENApproveTxPromise = pollenToken.approve(coreContracts[contract].address, dec(1, 18), { from: multisig })
        await assertRevert(POLLENApproveTxPromise, "POLLENToken: caller must not be the multisig")
      }

      // Multisig attempts to approve POLLEN contracts to spend POLLEN (excluding LCs)
      for (const contract of Object.keys(POLLENContracts)) {
        const POLLENApproveTxPromise = pollenToken.approve(POLLENContracts[contract].address, dec(1, 18), { from: multisig })
        await assertRevert(POLLENApproveTxPromise, "POLLENToken: caller must not be the multisig")
      }
    })

    // --- BeraBorrow AG increaseAllowance restriction, 1st year ---
    it("BeraBorrow multisig can not increaseAllowance for any EOA or BeraBorrow contract", async () => {
      // Multisig attempts to approve EOAs to spend POLLEN
      const POLLENIncreaseAllowanceTxPromise_1 = pollenToken.increaseAllowance(A, dec(1, 18), { from: multisig })
      const POLLENIncreaseAllowanceTxPromise_2 = pollenToken.increaseAllowance(B, dec(1, 18), { from: multisig })
      await assertRevert(POLLENIncreaseAllowanceTxPromise_1, "POLLENToken: caller must not be the multisig")
      await assertRevert(POLLENIncreaseAllowanceTxPromise_2, "POLLENToken: caller must not be the multisig")

      // Multisig attempts to approve BeraBorrow contracts to spend POLLEN
      for (const contract of Object.keys(coreContracts)) {
        const POLLENIncreaseAllowanceTxPromise = pollenToken.increaseAllowance(coreContracts[contract].address, dec(1, 18), { from: multisig })
        await assertRevert(POLLENIncreaseAllowanceTxPromise, "POLLENToken: caller must not be the multisig")
      }

      // Multisig attempts to approve POLLEN contracts to spend POLLEN (excluding LCs)
      for (const contract of Object.keys(POLLENContracts)) {
        const POLLENIncreaseAllowanceTxPromise = pollenToken.increaseAllowance(POLLENContracts[contract].address, dec(1, 18), { from: multisig })
        await assertRevert(POLLENIncreaseAllowanceTxPromise, "POLLENToken: caller must not be the multisig")
      }
    })

    // --- BeraBorrow AG decreaseAllowance restriction, 1st year ---
    it("BeraBorrow multisig can not decreaseAllowance for any EOA or BeraBorrow contract", async () => {
      // Multisig attempts to decreaseAllowance on EOAs 
      const POLLENDecreaseAllowanceTxPromise_1 = pollenToken.decreaseAllowance(A, dec(1, 18), { from: multisig })
      const POLLENDecreaseAllowanceTxPromise_2 = pollenToken.decreaseAllowance(B, dec(1, 18), { from: multisig })
      await assertRevert(POLLENDecreaseAllowanceTxPromise_1, "POLLENToken: caller must not be the multisig")
      await assertRevert(POLLENDecreaseAllowanceTxPromise_2, "POLLENToken: caller must not be the multisig")

      // Multisig attempts to decrease allowance on BeraBorrow contracts
      for (const contract of Object.keys(coreContracts)) {
        const POLLENDecreaseAllowanceTxPromise = pollenToken.decreaseAllowance(coreContracts[contract].address, dec(1, 18), { from: multisig })
        await assertRevert(POLLENDecreaseAllowanceTxPromise, "POLLENToken: caller must not be the multisig")
      }

      // Multisig attempts to decrease allowance on POLLEN contracts (excluding LCs)
      for (const contract of Object.keys(POLLENContracts)) {
        const POLLENDecreaseAllowanceTxPromise = pollenToken.decreaseAllowance(POLLENContracts[contract].address, dec(1, 18), { from: multisig })
        await assertRevert(POLLENDecreaseAllowanceTxPromise, "POLLENToken: caller must not be the multisig")
      }
    })

    // --- BeraBorrow multisig transferFrom restriction, 1st year ---
    it("BeraBorrow multisig can not be the sender in a transferFrom() call", async () => {
      // EOAs attempt to use multisig as sender in a transferFrom()
      const POLLENtransferFromTxPromise_1 = pollenToken.transferFrom(multisig, A, dec(1, 18), { from: A })
      const POLLENtransferFromTxPromise_2 = pollenToken.transferFrom(multisig, C, dec(1, 18), { from: B })
      await assertRevert(POLLENtransferFromTxPromise_1, "POLLENToken: sender must not be the multisig")
      await assertRevert(POLLENtransferFromTxPromise_2, "POLLENToken: sender must not be the multisig")
    })

    //  --- staking, 1st year ---
    it("BeraBorrow multisig can not stake their POLLEN in the staking contract", async () => {
      const POLLENStakingTxPromise_1 = pollenStaking.stake(dec(1, 18), { from: multisig })
      await assertRevert(POLLENStakingTxPromise_1, "POLLENToken: sender must not be the multisig")
    })

    // --- Anyone else ---

    it("Anyone (other than BeraBorrow multisig) can transfer POLLEN to LCs deployed by anyone through the Factory", async () => {
      // Start D, E, F with some POLLEN
      await pollenToken.unprotectedMint(D, dec(1, 24))
      await pollenToken.unprotectedMint(E, dec(2, 24))
      await pollenToken.unprotectedMint(F, dec(3, 24))

      // H, I, and BeraBorrow AG deploy lockup contracts with A, B, C as beneficiaries, respectively
      const deployedLCtx_A = await lockupContractFactory.deployLockupContract(A, oneYearFromSystemDeployment, { from: H })
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, oneYearFromSystemDeployment, { from: I })
      const deployedLCtx_C = await lockupContractFactory.deployLockupContract(C, oneYearFromSystemDeployment, { from: multisig })

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

    it("Anyone (other than BeraBorrow multisig) can transfer POLLEN to LCs deployed by anyone directly", async () => {
      // Start D, E, F with some POLLEN
      await pollenToken.unprotectedMint(D, dec(1, 24))
      await pollenToken.unprotectedMint(E, dec(2, 24))
      await pollenToken.unprotectedMint(F, dec(3, 24))

      // H, I, LiqAG deploy lockup contracts with A, B, C as beneficiaries, respectively
      const LC_A = await LockupContract.new(pollenToken.address, A, oneYearFromSystemDeployment, { from: H })
      const LC_B = await LockupContract.new(pollenToken.address, B, oneYearFromSystemDeployment, { from: I })
      const LC_C = await LockupContract.new(pollenToken.address, C, oneYearFromSystemDeployment, { from: multisig })

      // Check balances of LCs are 0
      assert.equal(await pollenToken.balanceOf(LC_A.address), '0')
      assert.equal(await pollenToken.balanceOf(LC_B.address), '0')
      assert.equal(await pollenToken.balanceOf(LC_C.address), '0')

      // D, E, F transfer POLLEN to LCs
      await pollenToken.transfer(LC_A.address, dec(1, 24), { from: D })
      await pollenToken.transfer(LC_B.address, dec(2, 24), { from: E })
      await pollenToken.transfer(LC_C.address, dec(3, 24), { from: F })

      // Check balances of LCs has increased
      assert.equal(await pollenToken.balanceOf(LC_A.address), dec(1, 24))
      assert.equal(await pollenToken.balanceOf(LC_B.address), dec(2, 24))
      assert.equal(await pollenToken.balanceOf(LC_C.address), dec(3, 24))
    })

    it("Anyone (other than beraborrow multisig) can transfer to an EOA", async () => {
      // Start D, E, F with some POLLEN
      await pollenToken.unprotectedMint(D, dec(1, 24))
      await pollenToken.unprotectedMint(E, dec(2, 24))
      await pollenToken.unprotectedMint(F, dec(3, 24))

      // POLLEN holders transfer to other transfer to EOAs
      const POLLENtransferTx_1 = await pollenToken.transfer(A, dec(1, 18), { from: D })
      const POLLENtransferTx_2 = await pollenToken.transfer(B, dec(1, 18), { from: E })
      const POLLENtransferTx_3 = await pollenToken.transfer(multisig, dec(1, 18), { from: F })

      assert.isTrue(POLLENtransferTx_1.receipt.status)
      assert.isTrue(POLLENtransferTx_2.receipt.status)
      assert.isTrue(POLLENtransferTx_3.receipt.status)
    })

    it("Anyone (other than beraborrow multisig) can approve any EOA or to spend their POLLEN", async () => {
      // EOAs approve EOAs to spend POLLEN
      const POLLENapproveTx_1 = await pollenToken.approve(A, dec(1, 18), { from: F })
      const POLLENapproveTx_2 = await pollenToken.approve(B, dec(1, 18), { from: G })
      await assert.isTrue(POLLENapproveTx_1.receipt.status)
      await assert.isTrue(POLLENapproveTx_2.receipt.status)
    })

    it("Anyone (other than beraborrow multisig) can increaseAllowance for any EOA or BeraBorrow contract", async () => {
      // Anyone can increaseAllowance of EOAs to spend POLLEN
      const POLLENIncreaseAllowanceTx_1 = await pollenToken.increaseAllowance(A, dec(1, 18), { from: F })
      const POLLENIncreaseAllowanceTx_2 = await pollenToken.increaseAllowance(B, dec(1, 18), { from: G })
      await assert.isTrue(POLLENIncreaseAllowanceTx_1.receipt.status)
      await assert.isTrue(POLLENIncreaseAllowanceTx_2.receipt.status)

      // Increase allowance of core BeraBorrow contracts
      for (const contract of Object.keys(coreContracts)) {
        const POLLENIncreaseAllowanceTx = await pollenToken.increaseAllowance(coreContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(POLLENIncreaseAllowanceTx.receipt.status)
      }

      // Increase allowance of POLLEN contracts
      for (const contract of Object.keys(POLLENContracts)) {
        const POLLENIncreaseAllowanceTx = await pollenToken.increaseAllowance(POLLENContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(POLLENIncreaseAllowanceTx.receipt.status)
      }
    })

    it("Anyone (other than beraborrow multisig) can decreaseAllowance for any EOA or BeraBorrow contract", async () => {
      //First, increase allowance of A, B and coreContracts and POLLEN contracts
      const POLLENIncreaseAllowanceTx_1 = await pollenToken.increaseAllowance(A, dec(1, 18), { from: F })
      const POLLENIncreaseAllowanceTx_2 = await pollenToken.increaseAllowance(B, dec(1, 18), { from: G })
      await assert.isTrue(POLLENIncreaseAllowanceTx_1.receipt.status)
      await assert.isTrue(POLLENIncreaseAllowanceTx_2.receipt.status)

      for (const contract of Object.keys(coreContracts)) {
        const POLLENtransferTx = await pollenToken.increaseAllowance(coreContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(POLLENtransferTx.receipt.status)
      }

      for (const contract of Object.keys(POLLENContracts)) {
        const POLLENtransferTx = await pollenToken.increaseAllowance(POLLENContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(POLLENtransferTx.receipt.status)
      }

      // Decrease allowance of A, B
      const POLLENDecreaseAllowanceTx_1 = await pollenToken.decreaseAllowance(A, dec(1, 18), { from: F })
      const POLLENDecreaseAllowanceTx_2 = await pollenToken.decreaseAllowance(B, dec(1, 18), { from: G })
      await assert.isTrue(POLLENDecreaseAllowanceTx_1.receipt.status)
      await assert.isTrue(POLLENDecreaseAllowanceTx_2.receipt.status)

      // Decrease allowance of core contracts
      for (const contract of Object.keys(coreContracts)) {
        const POLLENDecreaseAllowanceTx = await pollenToken.decreaseAllowance(coreContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(POLLENDecreaseAllowanceTx.receipt.status)
      }

      // Decrease allowance of POLLEN contracts
      for (const contract of Object.keys(POLLENContracts)) {
        const POLLENDecreaseAllowanceTx = await pollenToken.decreaseAllowance(POLLENContracts[contract].address, dec(1, 18), { from: F })
        await assert.isTrue(POLLENDecreaseAllowanceTx.receipt.status)
      }
    })

    it("Anyone (other than beraborrow multisig) can be the sender in a transferFrom() call", async () => {
      // Fund A, B
      await pollenToken.unprotectedMint(A, dec(1, 18))
      await pollenToken.unprotectedMint(B, dec(1, 18))

      // A, B approve F, G
      await pollenToken.approve(F, dec(1, 18), { from: A })
      await pollenToken.approve(G, dec(1, 18), { from: B })

      const POLLENtransferFromTx_1 = await pollenToken.transferFrom(A, F, dec(1, 18), { from: F })
      const POLLENtransferFromTx_2 = await pollenToken.transferFrom(B, C, dec(1, 18), { from: G })
      await assert.isTrue(POLLENtransferFromTx_1.receipt.status)
      await assert.isTrue(POLLENtransferFromTx_2.receipt.status)
    })

    it("Anyone (other than beraborrow AG) can stake their POLLEN in the staking contract", async () => {
      // Fund F
      await pollenToken.unprotectedMint(F, dec(1, 18))

      const POLLENStakingTx_1 = await pollenStaking.stake(dec(1, 18), { from: F })
      await assert.isTrue(POLLENStakingTx_1.receipt.status)
    })

  })
  // --- LCF ---

  describe('Lockup Contract Factory negative tests', async accounts => {
    it("deployLockupContract(): reverts when POLLEN token address is not set", async () => {
      // Fund F
      await pollenToken.unprotectedMint(F, dec(20, 24))

      // deploy new LCF
      const LCFNew = await LockupContractFactory.new()

      // Check POLLENToken address not registered
      const registeredPOLLENTokenAddr = await LCFNew.pollenTokenAddress()
      assert.equal(registeredPOLLENTokenAddr, ZERO_ADDRESS)

      const tx = LCFNew.deployLockupContract(A, oneYearFromSystemDeployment, { from: F })
      await assertRevert(tx)
    })
  })

  // --- LCs ---
  describe('Transferring POLLEN to LCs', async accounts => {
    it("BeraBorrow multisig can transfer POLLEN (vesting) to lockup contracts they deployed", async () => {
      const initialPOLLENBalanceOfLC_T1 = await pollenToken.balanceOf(LC_T1.address)
      const initialPOLLENBalanceOfLC_T2 = await pollenToken.balanceOf(LC_T2.address)
      const initialPOLLENBalanceOfLC_T3 = await pollenToken.balanceOf(LC_T3.address)

      // Check initial LC balances == entitlements
      assert.equal(initialPOLLENBalanceOfLC_T1, teamMemberInitialEntitlement_1)
      assert.equal(initialPOLLENBalanceOfLC_T2, teamMemberInitialEntitlement_2)
      assert.equal(initialPOLLENBalanceOfLC_T3, teamMemberInitialEntitlement_3)

      // One month passes
      await th.fastForwardTime(SECONDS_IN_ONE_MONTH, web3.currentProvider)

      // BeraBorrow multisig transfers vesting amount
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

      // BeraBorrow multisig transfers vesting amount
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

    it("BeraBorrow multisig can transfer POLLEN to lockup contracts deployed by anyone", async () => {
      // A, B, C each deploy a lockup contract with themself as beneficiary
      const deployedLCtx_A = await lockupContractFactory.deployLockupContract(A, twoYearsFromSystemDeployment, { from: A })
      const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, twoYearsFromSystemDeployment, { from: B })
      const deployedLCtx_C = await lockupContractFactory.deployLockupContract(C, twoYearsFromSystemDeployment, { from: C })

      // LCs for team members on vesting schedules
      const LC_A = await th.getLCFromDeploymentTx(deployedLCtx_A)
      const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)
      const LC_C = await th.getLCFromDeploymentTx(deployedLCtx_C)

      // Check balances of LCs are 0
      assert.equal(await pollenToken.balanceOf(LC_A.address), '0')
      assert.equal(await pollenToken.balanceOf(LC_B.address), '0')
      assert.equal(await pollenToken.balanceOf(LC_C.address), '0')

      // One month passes
      await th.fastForwardTime(SECONDS_IN_ONE_MONTH, web3.currentProvider)

      // BeraBorrow multisig transfers POLLEN to LCs deployed by other accounts
      await pollenToken.transfer(LC_A.address, dec(1, 24), { from: multisig })
      await pollenToken.transfer(LC_B.address, dec(2, 24), { from: multisig })
      await pollenToken.transfer(LC_C.address, dec(3, 24), { from: multisig })

      // Check balances of LCs have increased
      assert.equal(await pollenToken.balanceOf(LC_A.address), dec(1, 24))
      assert.equal(await pollenToken.balanceOf(LC_B.address), dec(2, 24))
      assert.equal(await pollenToken.balanceOf(LC_C.address), dec(3, 24))
    })
  })

  describe('Deploying new LCs', async accounts => {
    it("POLLEN Deployer can deploy LCs through the Factory", async () => {
      // POLLEN deployer deploys LCs
      const LCDeploymentTx_A = await lockupContractFactory.deployLockupContract(A, oneYearFromSystemDeployment, { from: beraborrowAG })
      const LCDeploymentTx_B = await lockupContractFactory.deployLockupContract(B, twoYearsFromSystemDeployment, { from: beraborrowAG })
      const LCDeploymentTx_C = await lockupContractFactory.deployLockupContract(C, '9595995999999900000023423234', { from: beraborrowAG })

      assert.isTrue(LCDeploymentTx_A.receipt.status)
      assert.isTrue(LCDeploymentTx_B.receipt.status)
      assert.isTrue(LCDeploymentTx_C.receipt.status)
    })

    it("BeraBorrow multisig can deploy LCs through the Factory", async () => {
      // POLLEN deployer deploys LCs
      const LCDeploymentTx_A = await lockupContractFactory.deployLockupContract(A, oneYearFromSystemDeployment, { from: multisig })
      const LCDeploymentTx_B = await lockupContractFactory.deployLockupContract(B, twoYearsFromSystemDeployment, { from: multisig })
      const LCDeploymentTx_C = await lockupContractFactory.deployLockupContract(C, '9595995999999900000023423234', { from: multisig })

      assert.isTrue(LCDeploymentTx_A.receipt.status)
      assert.isTrue(LCDeploymentTx_B.receipt.status)
      assert.isTrue(LCDeploymentTx_C.receipt.status)
    })

    it("Anyone can deploy LCs through the Factory", async () => {
      // Various EOAs deploy LCs
      const LCDeploymentTx_1 = await lockupContractFactory.deployLockupContract(A, oneYearFromSystemDeployment, { from: teamMember_1 })
      const LCDeploymentTx_2 = await lockupContractFactory.deployLockupContract(C, twoYearsFromSystemDeployment, { from: investor_2 })
      const LCDeploymentTx_3 = await lockupContractFactory.deployLockupContract(beraborrowAG, '9595995999999900000023423234', { from: A })
      const LCDeploymentTx_4 = await lockupContractFactory.deployLockupContract(D, twoYearsFromSystemDeployment, { from: B })

      assert.isTrue(LCDeploymentTx_1.receipt.status)
      assert.isTrue(LCDeploymentTx_2.receipt.status)
      assert.isTrue(LCDeploymentTx_3.receipt.status)
      assert.isTrue(LCDeploymentTx_4.receipt.status)
    })

    it("POLLEN Deployer can deploy LCs directly", async () => {
      // POLLEN deployer deploys LCs
      const LC_A = await LockupContract.new(pollenToken.address, A, oneYearFromSystemDeployment, { from: beraborrowAG })
      const LC_A_txReceipt = await web3.eth.getTransactionReceipt(LC_A.transactionHash)

      const LC_B = await LockupContract.new(pollenToken.address, B, twoYearsFromSystemDeployment, { from: beraborrowAG })
      const LC_B_txReceipt = await web3.eth.getTransactionReceipt(LC_B.transactionHash)

      const LC_C = await LockupContract.new(pollenToken.address, C, twoYearsFromSystemDeployment, { from: beraborrowAG })
      const LC_C_txReceipt = await web3.eth.getTransactionReceipt(LC_C.transactionHash)

      // Check deployment succeeded
      assert.isTrue(LC_A_txReceipt.status)
      assert.isTrue(LC_B_txReceipt.status)
      assert.isTrue(LC_C_txReceipt.status)
    })

    it("BeraBorrow multisig can deploy LCs directly", async () => {
      // POLLEN deployer deploys LCs
      const LC_A = await LockupContract.new(pollenToken.address, A, oneYearFromSystemDeployment, { from: multisig })
      const LC_A_txReceipt = await web3.eth.getTransactionReceipt(LC_A.transactionHash)

      const LC_B = await LockupContract.new(pollenToken.address, B, twoYearsFromSystemDeployment, { from: multisig })
      const LC_B_txReceipt = await web3.eth.getTransactionReceipt(LC_B.transactionHash)

      const LC_C = await LockupContract.new(pollenToken.address, C, twoYearsFromSystemDeployment, { from: multisig })
      const LC_C_txReceipt = await web3.eth.getTransactionReceipt(LC_C.transactionHash)

      // Check deployment succeeded
      assert.isTrue(LC_A_txReceipt.status)
      assert.isTrue(LC_B_txReceipt.status)
      assert.isTrue(LC_C_txReceipt.status)
    })

    it("Anyone can deploy LCs directly", async () => {
      // Various EOAs deploy LCs
      const LC_A = await LockupContract.new(pollenToken.address, A, oneYearFromSystemDeployment, { from: D })
      const LC_A_txReceipt = await web3.eth.getTransactionReceipt(LC_A.transactionHash)

      const LC_B = await LockupContract.new(pollenToken.address, B, twoYearsFromSystemDeployment, { from: E })
      const LC_B_txReceipt = await web3.eth.getTransactionReceipt(LC_B.transactionHash)

      const LC_C = await LockupContract.new(pollenToken.address, C, twoYearsFromSystemDeployment, { from: F })
      const LC_C_txReceipt = await web3.eth.getTransactionReceipt(LC_C.transactionHash)

      // Check deployment succeeded
      assert.isTrue(LC_A_txReceipt.status)
      assert.isTrue(LC_B_txReceipt.status)
      assert.isTrue(LC_C_txReceipt.status)
    })

    it("Anyone can deploy LCs with unlockTime = one year from deployment, directly and through factory", async () => {
      // Deploy directly
      const LC_1 = await LockupContract.new(pollenToken.address, A, oneYearFromSystemDeployment, { from: D })
      const LCTxReceipt_1 = await web3.eth.getTransactionReceipt(LC_1.transactionHash)

      const LC_2 = await LockupContract.new(pollenToken.address, B, oneYearFromSystemDeployment, { from: beraborrowAG })
      const LCTxReceipt_2 = await web3.eth.getTransactionReceipt(LC_2.transactionHash)

      const LC_3 = await LockupContract.new(pollenToken.address, C, oneYearFromSystemDeployment, { from: multisig })
      const LCTxReceipt_3 = await web3.eth.getTransactionReceipt(LC_2.transactionHash)

      // Deploy through factory
      const LCDeploymentTx_4 = await lockupContractFactory.deployLockupContract(A, oneYearFromSystemDeployment, { from: E })
      const LCDeploymentTx_5 = await lockupContractFactory.deployLockupContract(C, twoYearsFromSystemDeployment, { from: beraborrowAG })
      const LCDeploymentTx_6 = await lockupContractFactory.deployLockupContract(D, twoYearsFromSystemDeployment, { from: multisig })

      // Check deployments succeeded
      assert.isTrue(LCTxReceipt_1.status)
      assert.isTrue(LCTxReceipt_2.status)
      assert.isTrue(LCTxReceipt_3.status)
      assert.isTrue(LCDeploymentTx_4.receipt.status)
      assert.isTrue(LCDeploymentTx_5.receipt.status)
      assert.isTrue(LCDeploymentTx_6.receipt.status)
    })

    it("Anyone can deploy LCs with unlockTime > one year from deployment, directly and through factory", async () => {
      const justOverOneYear = oneYearFromSystemDeployment.add(toBN('1'))
      const _17YearsFromDeployment = oneYearFromSystemDeployment.add(toBN(timeValues.SECONDS_IN_ONE_YEAR).mul(toBN('2')))
      
      // Deploy directly
      const LC_1 = await LockupContract.new(pollenToken.address, A, twoYearsFromSystemDeployment, { from: D })
      const LCTxReceipt_1 = await web3.eth.getTransactionReceipt(LC_1.transactionHash)

      const LC_2 = await LockupContract.new(pollenToken.address, B, justOverOneYear, { from: multisig })
      const LCTxReceipt_2 = await web3.eth.getTransactionReceipt(LC_2.transactionHash)

      const LC_3 = await LockupContract.new(pollenToken.address, E, _17YearsFromDeployment, { from: E })
      const LCTxReceipt_3 = await web3.eth.getTransactionReceipt(LC_3.transactionHash)

      // Deploy through factory
      const LCDeploymentTx_4 = await lockupContractFactory.deployLockupContract(A, oneYearFromSystemDeployment, { from: E })
      const LCDeploymentTx_5 = await lockupContractFactory.deployLockupContract(C, twoYearsFromSystemDeployment, { from: multisig })
      const LCDeploymentTx_6 = await lockupContractFactory.deployLockupContract(D, twoYearsFromSystemDeployment, { from: teamMember_2 })

      // Check deployments succeeded
      assert.isTrue(LCTxReceipt_1.status)
      assert.isTrue(LCTxReceipt_2.status)
      assert.isTrue(LCTxReceipt_3.status)
      assert.isTrue(LCDeploymentTx_4.receipt.status)
      assert.isTrue(LCDeploymentTx_5.receipt.status)
      assert.isTrue(LCDeploymentTx_6.receipt.status)
    })

    it("No one can deploy LCs with unlockTime < one year from deployment, directly or through factory", async () => {
      const justUnderOneYear = oneYearFromSystemDeployment.sub(toBN('1'))
     
      // Attempt to deploy directly
      const directDeploymentTxPromise_1 = LockupContract.new(pollenToken.address, A, justUnderOneYear, { from: D })
      const directDeploymentTxPromise_2 = LockupContract.new(pollenToken.address, B, '43200', { from: multisig })
      const directDeploymentTxPromise_3 =  LockupContract.new(pollenToken.address, E, '354534', { from: E })
  
      // Attempt to deploy through factory
      const factoryDploymentTxPromise_1 = lockupContractFactory.deployLockupContract(A, justUnderOneYear, { from: E })
      const factoryDploymentTxPromise_2 = lockupContractFactory.deployLockupContract(C, '43200', { from: multisig })
      const factoryDploymentTxPromise_3 = lockupContractFactory.deployLockupContract(D, '354534', { from: teamMember_2 })

      // Check deployments reverted
      await assertRevert(directDeploymentTxPromise_1, "LockupContract: unlock time must be at least one year after system deployment")
      await assertRevert(directDeploymentTxPromise_2, "LockupContract: unlock time must be at least one year after system deployment")
      await assertRevert(directDeploymentTxPromise_3, "LockupContract: unlock time must be at least one year after system deployment")
      await assertRevert(factoryDploymentTxPromise_1, "LockupContract: unlock time must be at least one year after system deployment")
      await assertRevert(factoryDploymentTxPromise_2, "LockupContract: unlock time must be at least one year after system deployment")
      await assertRevert(factoryDploymentTxPromise_3, "LockupContract: unlock time must be at least one year after system deployment")
    })


    describe('Withdrawal Attempts on LCs before unlockTime has passed ', async accounts => {
      it("BeraBorrow multisig can't withdraw from a funded LC they deployed for another beneficiary through the Factory before the unlockTime", async () => {

        // Check currentTime < unlockTime
        const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
        const unlockTime = await LC_T1.unlockTime()
        assert.isTrue(currentTime.lt(unlockTime))

        // BeraBorrow multisig attempts withdrawal from LC they deployed through the Factory
        try {
          const withdrawalAttempt = await LC_T1.withdrawPOLLEN({ from: multisig })
          assert.isFalse(withdrawalAttempt.receipt.status)
        } catch (error) {
          assert.include(error.message, "LockupContract: caller is not the beneficiary")
        }
      })

      it("BeraBorrow multisig can't withdraw from a funded LC that someone else deployed before the unlockTime", async () => {
        // Account D deploys a new LC via the Factory
        const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, oneYearFromSystemDeployment, { from: D })
        const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

        //POLLEN multisig fund the newly deployed LCs
        await pollenToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

        // Check currentTime < unlockTime
        const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
        const unlockTime = await LC_B.unlockTime()
        assert.isTrue(currentTime.lt(unlockTime))

        // BeraBorrow multisig attempts withdrawal from LCs
        try {
          const withdrawalAttempt_B = await LC_B.withdrawPOLLEN({ from: multisig })
          assert.isFalse(withdrawalAttempt_B.receipt.status)
        } catch (error) {
          assert.include(error.message, "LockupContract: caller is not the beneficiary")
        }
      })

      it("Beneficiary can't withdraw from their funded LC before the unlockTime", async () => {
        // Account D deploys a new LC via the Factory
        const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, oneYearFromSystemDeployment, { from: D })
        const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

        // BeraBorrow multisig funds contracts
        await pollenToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

        // Check currentTime < unlockTime
        const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
        const unlockTime = await LC_B.unlockTime()
        assert.isTrue(currentTime.lt(unlockTime))

        /* Beneficiaries of all LCS - team, investor, and newly created LCs - 
        attempt to withdraw from their respective funded contracts */
        const LCs = [
          LC_T1,
          LC_T2,
          LC_T3,
          LC_I1,
          LC_I2,
          LC_T3,
          LC_B
        ]

        for (LC of LCs) {
          try {
            const beneficiary = await LC.beneficiary()
            const withdrawalAttempt = await LC.withdrawPOLLEN({ from: beneficiary })
            assert.isFalse(withdrawalAttempt.receipt.status)
          } catch (error) {
            assert.include(error.message, "LockupContract: The lockup duration must have passed")
          }
        }
      })

      it("No one can withdraw from a beneficiary's funded LC before the unlockTime", async () => {
        // Account D deploys a new LC via the Factory
        const deployedLCtx_B = await lockupContractFactory.deployLockupContract(B, oneYearFromSystemDeployment, { from: D })
        const LC_B = await th.getLCFromDeploymentTx(deployedLCtx_B)

        // BeraBorrow multisig funds contract
        await pollenToken.transfer(LC_B.address, dec(2, 18), { from: multisig })

        // Check currentTime < unlockTime
        const currentTime = toBN(await th.getLatestBlockTimestamp(web3))
        const unlockTime = await LC_B.unlockTime()
        assert.isTrue(currentTime.lt(unlockTime))

        const variousEOAs = [teamMember_2, beraborrowAG, multisig, investor_1, A, C, D, E]

        // Several EOAs attempt to withdraw from LC deployed by D
        for (account of variousEOAs) {
          try {
            const withdrawalAttempt = await LC_B.withdrawPOLLEN({ from: account })
            assert.isFalse(withdrawalAttempt.receipt.status)
          } catch (error) {
            assert.include(error.message, "LockupContract: caller is not the beneficiary")
          }
        }

        // Several EOAs attempt to withdraw from LC_T1 deployed by POLLEN deployer
        for (account of variousEOAs) {
          try {
            const withdrawalAttempt = await LC_T1.withdrawPOLLEN({ from: account })
            assert.isFalse(withdrawalAttempt.receipt.status)
          } catch (error) {
            assert.include(error.message, "LockupContract: caller is not the beneficiary")
          }
        }
      })
    })
  })
})