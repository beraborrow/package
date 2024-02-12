// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Interfaces/IPOLLENToken.sol";
import "../Interfaces/ICommunityIssuance.sol";
import "../Dependencies/BaseMath.sol";
import "../Dependencies/BeraBorrowMath.sol";
import "../Dependencies/Ownable.sol";
import "../Dependencies/CheckContract.sol";
import "../Dependencies/SafeMath.sol";


contract CommunityIssuance is ICommunityIssuance, Ownable, CheckContract, BaseMath {
    using SafeMath for uint;

    // --- Data ---

    string constant public NAME = "CommunityIssuance";

    uint constant public SECONDS_IN_ONE_MINUTE = 60;

   /* The issuance factor F determines the curvature of the issuance curve.
    *
    * Minutes in one year: 60*24*365 = 525600
    *
    * For 50% of remaining tokens issued each year, with minutes as time units, we have:
    * 
    * F ** 525600 = 0.5
    * 
    * Re-arranging:
    * 
    * 525600 * ln(F) = ln(0.5)
    * F = 0.5 ** (1/525600)
    * F = 0.999998681227695000 
    */
    uint constant public ISSUANCE_FACTOR = 999998681227695000;

    /* 
    * The community POLLEN supply cap is the starting balance of the Community Issuance contract.
    * It should be minted to this contract by POLLENToken, when the token is deployed.
    * 
    * Set to 32M (slightly less than 1/3) of total POLLEN supply.
    */
    uint constant public POLLENSupplyCap = 32e24; // 32 million

    IPOLLENToken public pollenToken;

    address public stabilityPoolAddress;

    uint public totalPOLLENIssued;
    uint public immutable deploymentTime;

    // --- Events ---

    event POLLENTokenAddressSet(address _pollenTokenAddress);
    event StabilityPoolAddressSet(address _stabilityPoolAddress);
    event TotalPOLLENIssuedUpdated(uint _totalPOLLENIssued);

    // --- Functions ---

    constructor() public {
        deploymentTime = block.timestamp;
    }

    function setAddresses
    (
        address _pollenTokenAddress, 
        address _stabilityPoolAddress
    ) 
        external 
        onlyOwner 
        override 
    {
        checkContract(_pollenTokenAddress);
        checkContract(_stabilityPoolAddress);

        pollenToken = IPOLLENToken(_pollenTokenAddress);
        stabilityPoolAddress = _stabilityPoolAddress;

        // When POLLENToken deployed, it should have transferred CommunityIssuance's POLLEN entitlement
        uint POLLENBalance = pollenToken.balanceOf(address(this));
        assert(POLLENBalance >= POLLENSupplyCap);

        emit POLLENTokenAddressSet(_pollenTokenAddress);
        emit StabilityPoolAddressSet(_stabilityPoolAddress);

        _renounceOwnership();
    }

    function issuePOLLEN() external override returns (uint) {
        _requireCallerIsStabilityPool();

        uint latestTotalPOLLENIssued = POLLENSupplyCap.mul(_getCumulativeIssuanceFraction()).div(DECIMAL_PRECISION);
        uint issuance = latestTotalPOLLENIssued.sub(totalPOLLENIssued);

        totalPOLLENIssued = latestTotalPOLLENIssued;
        emit TotalPOLLENIssuedUpdated(latestTotalPOLLENIssued);
        
        return issuance;
    }

    /* Gets 1-f^t    where: f < 1

    f: issuance factor that determines the shape of the curve
    t:  time passed since last POLLEN issuance event  */
    function _getCumulativeIssuanceFraction() internal view returns (uint) {
        // Get the time passed since deployment
        uint timePassedInMinutes = block.timestamp.sub(deploymentTime).div(SECONDS_IN_ONE_MINUTE);

        // f^t
        uint power = BeraBorrowMath._decPow(ISSUANCE_FACTOR, timePassedInMinutes);

        //  (1 - f^t)
        uint cumulativeIssuanceFraction = (uint(DECIMAL_PRECISION).sub(power));
        assert(cumulativeIssuanceFraction <= DECIMAL_PRECISION); // must be in range [0,1]

        return cumulativeIssuanceFraction;
    }

    function sendPOLLEN(address _account, uint _POLLENamount) external override {
        _requireCallerIsStabilityPool();

        pollenToken.transfer(_account, _POLLENamount);
    }

    // --- 'require' functions ---

    function _requireCallerIsStabilityPool() internal view {
        require(msg.sender == stabilityPoolAddress, "CommunityIssuance: caller is not SP");
    }
}
