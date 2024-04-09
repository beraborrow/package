// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "../Dependencies/CheckContract.sol";
import "../Dependencies/SafeMath.sol";
import "../Interfaces/IPOLLENToken.sol";
import "../Interfaces/ILockupContractFactory.sol";
import "../Dependencies/Ownable.sol";
import "../Dependencies/console.sol";

contract POLLENToken is CheckContract, IPOLLENToken, Ownable {
    using SafeMath for uint256;

    // --- ERC20 Data ---

    string constant internal _NAME = "POLLEN";
    string constant internal _SYMBOL = "POLLEN";
    string constant internal _VERSION = "1";
    uint8 constant internal  _DECIMALS = 18;

    mapping (address => uint256) private _balances;
    mapping (address => mapping (address => uint256)) private _allowances;
    uint private _totalSupply;

    // --- EIP 2612 Data ---

    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 private constant _PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant _TYPE_HASH = 0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f;

    // Cache the domain separator as an immutable value, but also store the chain id that it corresponds to, in order to
    // invalidate the cached domain separator if the chain id changes.
    bytes32 private immutable _CACHED_DOMAIN_SEPARATOR;
    uint256 private immutable _CACHED_CHAIN_ID;

    bytes32 private immutable _HASHED_NAME;
    bytes32 private immutable _HASHED_VERSION;
    
    mapping (address => uint256) private _nonces;

    // --- POLLENToken specific data ---

    uint public constant ONE_YEAR_IN_SECONDS = 31536000;  // 60 * 60 * 24 * 365

    // uint for use with SafeMath
    uint internal _1_MILLION = 1e24;    // 1e6 * 1e18 = 1e24

    uint internal immutable deploymentStartTime;
    address public immutable multisigAddress;

    address public immutable communityIssuanceAddress;
    address public immutable pollenStakingAddress;

    uint internal immutable lpRewardsEntitlement;

    ILockupContractFactory public immutable lockupContractFactory;

    // --- Events ---

    event CommunityIssuanceAddressSet(address _communityIssuanceAddress);
    event POLLENStakingAddressSet(address _pollenStakingAddress);
    event LockupContractFactoryAddressSet(address _lockupContractFactoryAddress);

    // --- Functions ---

    /*
    * Total Supply: 420 million
    * Seed Sale: 18% -> 75.6 million
    * Public Sale: 0.2% -> 0.84 million
    * Strategic: 7.8% -> 32.76 million
    * Community: 37% -> 155.4 million
    * Team + Advisors: 17% -> 71.4 million
    * BaB: 40 million
    * Treasury: 40 million
    * LP reward: 4 million
    */

    constructor
    (
        address _communityIssuanceAddress, 
        address _pollenStakingAddress,
        address _lockupFactoryAddress,
        address _seedSaleAddress,
        address _publicSaleAddress,
        address _strategicAddress,
        address _teamAddress,
        address _babAddress,
        address _lpRewardsAddress,
        address _multisigAddress
    ) 
        public 
    {
        checkContract(_communityIssuanceAddress);
        checkContract(_pollenStakingAddress);
        checkContract(_lockupFactoryAddress);

        multisigAddress = _multisigAddress;
        deploymentStartTime  = block.timestamp;
        
        communityIssuanceAddress = _communityIssuanceAddress;
        pollenStakingAddress = _pollenStakingAddress;
        lockupContractFactory = ILockupContractFactory(_lockupFactoryAddress);

        bytes32 hashedName = keccak256(bytes(_NAME));
        bytes32 hashedVersion = keccak256(bytes(_VERSION));

        _HASHED_NAME = hashedName;
        _HASHED_VERSION = hashedVersion;
        _CACHED_CHAIN_ID = _chainID();
        _CACHED_DOMAIN_SEPARATOR = _buildDomainSeparator(_TYPE_HASH, hashedName, hashedVersion);
        
        // --- Initial POLLEN allocations ---

        uint seedSaleEntitlement = 75_600_000; // Allocate 75.6 million for seed sale
        _mint(_seedSaleAddress, seedSaleEntitlement);

        uint publicSaleEntitlement = 840_000; // Allocate 0.84 million for seed sale
        _mint(_publicSaleAddress, publicSaleEntitlement);

        uint strategicEntitlement = 32_760_000; // Allocate 32.76 million for seed sale
        _mint(_strategicAddress, strategicEntitlement);

        uint teamEntitlement = 71_400_000; // Allocate 71.4 million for seed sale
        _mint(_teamAddress, teamEntitlement);

        uint babEntitlement = _1_MILLION.mul(40); // Allocate 40 million for seed sale
        _mint(_babAddress, babEntitlement);

        uint depositorsAndFrontEndsEntitlement = 155_400_000; // Allocate 155.4 million to the algorithmic issuance schedule
        _mint(_communityIssuanceAddress, depositorsAndFrontEndsEntitlement);

        uint _lpRewardsEntitlement = _1_MILLION.mul(4);  // Allocate 4 million for LP rewards
        lpRewardsEntitlement = _lpRewardsEntitlement;
        _mint(_lpRewardsAddress, _lpRewardsEntitlement);
        
        // Allocate the remainder to the POLLEN Multisig: (420 - 75.6 - 0.84 - 32.76 - 71.4 - 40 - 155.4 - 4) million = 64.66 million
        uint multisigEntitlement = _1_MILLION.mul(420)
            .sub(seedSaleEntitlement)
            .sub(publicSaleEntitlement)
            .sub(teamEntitlement)
            .sub(babEntitlement)
            .sub(strategicEntitlement)
            .sub(depositorsAndFrontEndsEntitlement)
            .sub(_lpRewardsEntitlement);

        _mint(_multisigAddress, multisigEntitlement); // treasury
    }

    // --- External functions ---

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function getDeploymentStartTime() external view override returns (uint256) {
        return deploymentStartTime;
    }

    function getLpRewardsEntitlement() external view override returns (uint256) {
        return lpRewardsEntitlement;
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        // Restrict the multisig's transfers in first year
        if (_callerIsMultisig() && _isFirstYear()) {
            _requireRecipientIsRegisteredLC(recipient);
        }

        _requireValidRecipient(recipient);

        // Otherwise, standard transfer functionality
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        if (_isFirstYear()) { _requireCallerIsNotMultisig(); }

        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
        if (_isFirstYear()) { _requireSenderIsNotMultisig(sender); }
        
        _requireValidRecipient(recipient);

        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) external override returns (bool) {
        if (_isFirstYear()) { _requireCallerIsNotMultisig(); }
        
        _approve(msg.sender, spender, _allowances[msg.sender][spender].add(addedValue));
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external override returns (bool) {
        if (_isFirstYear()) { _requireCallerIsNotMultisig(); }
        
        _approve(msg.sender, spender, _allowances[msg.sender][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }

    function sendToPOLLENStaking(address _sender, uint256 _amount) external override {
        _requireCallerIsPOLLENStaking();
        if (_isFirstYear()) { _requireSenderIsNotMultisig(_sender); }  // Prevent the multisig from staking POLLEN
        _transfer(_sender, pollenStakingAddress, _amount);
    }

    // --- EIP 2612 functionality ---

    function domainSeparator() public view override returns (bytes32) {    
        console.log ("_chainID()", _chainID());
        console.log ("_CACHED_CHAIN_ID", _CACHED_CHAIN_ID);
        if (_chainID() == _CACHED_CHAIN_ID) {
            return _CACHED_DOMAIN_SEPARATOR;
        } else {
            return _buildDomainSeparator(_TYPE_HASH, _HASHED_NAME, _HASHED_VERSION);
        }
    }

    function permit
    (
        address owner, 
        address spender, 
        uint amount, 
        uint deadline, 
        uint8 v, 
        bytes32 r, 
        bytes32 s
    ) 
        external 
        override 
    {
        require(deadline >= now, 'POLLEN: expired deadline');
        bytes32 digest = keccak256(abi.encodePacked('\x19\x01', 
                         domainSeparator(), keccak256(abi.encode(
                         _PERMIT_TYPEHASH, owner, spender, amount, 
                         _nonces[owner], deadline))));
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress == owner, 'POLLEN: invalid signature');
        _approve(owner, spender, amount);
    }

    function nonces(address owner) external view override returns (uint256) { // FOR EIP 2612
        return _nonces[owner];
    }

    // --- Internal operations ---

    function _chainID() private pure returns (uint256 chainID) {
        assembly {
            chainID := chainid()
        }
    }

    function _buildDomainSeparator(bytes32 typeHash, bytes32 name, bytes32 version) private view returns (bytes32) {
        return keccak256(abi.encode(typeHash, name, version, _chainID(), address(this)));
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _balances[sender] = _balances[sender].sub(amount, "ERC20: transfer amount exceeds balance");
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    // --- Helper functions ---

    function _callerIsMultisig() internal view returns (bool) {
        return (msg.sender == multisigAddress);
    }

    function _isFirstYear() internal view returns (bool) {
        return (block.timestamp.sub(deploymentStartTime) < ONE_YEAR_IN_SECONDS);
    }

    // --- 'require' functions ---
    
    function _requireValidRecipient(address _recipient) internal view {
        require(
            _recipient != address(0) && 
            _recipient != address(this),
            "POLLEN: Cannot transfer tokens directly to the POLLEN token contract or the zero address"
        );
        require(
            _recipient != communityIssuanceAddress &&
            _recipient != pollenStakingAddress,
            "POLLEN: Cannot transfer tokens directly to the community issuance or staking contract"
        );
    }

    function _requireRecipientIsRegisteredLC(address _recipient) internal view {
        require(lockupContractFactory.isRegisteredLockup(_recipient), 
        "POLLENToken: recipient must be a LockupContract registered in the Factory");
    }

    function _requireSenderIsNotMultisig(address _sender) internal view {
        require(_sender != multisigAddress, "POLLENToken: sender must not be the multisig");
    }

    function _requireCallerIsNotMultisig() internal view {
        require(!_callerIsMultisig(), "POLLENToken: caller must not be the multisig");
    }

    function _requireCallerIsPOLLENStaking() internal view {
         require(msg.sender == pollenStakingAddress, "POLLENToken: caller must be the POLLENStaking contract");
    }

    // --- Optional functions ---

    function name() external view override returns (string memory) {
        return _NAME;
    }

    function symbol() external view override returns (string memory) {
        return _SYMBOL;
    }

    function decimals() external view override returns (uint8) {
        return _DECIMALS;
    }

    function version() external view override returns (string memory) {
        return _VERSION;
    }

    function permitTypeHash() external view override returns (bytes32) {
        return _PERMIT_TYPEHASH;
    }
}
