//SPDX-License-Identifier: None
pragma solidity ^0.8.1;

import "hardhat/console.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";
import "openzeppelin-solidity/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/utils/Counters.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/security/ReentrancyGuard.sol";

/// @title Smart Contract for managing CryptoCampo NFT
/// @author Eduardo Mannarino
/// @notice Implements ERC721 Standard with specific buy, trade and claim functions
contract CCNFT is ERC721Enumerable, Ownable, ReentrancyGuard {

    event Buy(address indexed buyer, uint256 indexed tokenId, uint256 value);
    event Claim(address indexed claimer, uint256 indexed tokenId);
    event Trade(address indexed buyer, address indexed seller, uint256 indexed tokenId, uint256 value);
    event PutOnSale(uint256 indexed tokenId, uint256 price);
    event RemoveFromSale(uint256 indexed tokenId);

    struct TokenSale {
        bool onSale;
        uint256 price;
    }

    using Counters for Counters.Counter; 
    
    Counters.Counter private tokenIdTracker;

    mapping(uint256 => uint256) public values;
    mapping(uint256 => bool) public validValues;

    mapping(uint256 => TokenSale) public tokensOnSale;
    uint256[] public listTokensOnSale;
    
    address public fundsCollector;
    address public feesCollector;

    bool public canBuy;
    bool public canClaim;
    bool public canTrade;

    uint256 public totalValue;
    uint256 public maxValueToRaise;

    uint16 public buyFee; 
    uint16 public tradeFee; 
    
    uint16 public maxBatchCount;

    uint32 public profitToPay;

    IERC20 public fundsToken;
    
    constructor() ERC721("CryptoCampo NFT", "CCNFT") {
    }

    // PUBLIC FUNCTIONS

    /// @notice Mints one o more NFTs for the selected value.
    /// @dev There is a limit on minting amount (maxBatchCount) to avoid exceeding max gas.
    /// @param value The Value of each NFT. Must be a valid Value specified on ValidValues.
    /// @param amount The amount of NFT to be minted. 
    function buy(uint256 value, uint8 amount) external nonReentrant {
        require(canBuy, "Buy is not allowed");
        require(amount > 0 && amount <= maxBatchCount, "Buy amount not valid");
        require(validValues[value], "Value is not valid");
        require(totalValue + (value * amount) <= maxValueToRaise, "Buy exceeds maxValueToRaise");

        totalValue += value * amount;

        for (uint8 i=1;i<=amount;i++) {
            values[tokenIdTracker.current()] = value;
            _safeMint(msg.sender, tokenIdTracker.current());
            emit Buy(_msgSender(), tokenIdTracker.current(), value);
            tokenIdTracker.increment();        
        }

        if (!fundsToken.transferFrom(_msgSender(), fundsCollector, value * amount)) {
            revert("Cannot send funds tokens");
        }

        if (!fundsToken.transferFrom(_msgSender(), feesCollector, value * amount * buyFee / 10000)) {
            revert("Cannot send fees tokens");
        }

    } 

    /// @notice Claims one or more NFTs.
    /// @dev There is a limit on claiming amount (maxBatchCount) to avoid exceeding max gas.
    /// @param listTokenId Array including each TokenId to be claimed.
    function claim(uint256[] calldata listTokenId) external nonReentrant {
        require(canClaim, "Claim is not allowed");
        require(listTokenId.length > 0 && listTokenId.length <= maxBatchCount, "Claim amount not valid");
        uint256 claimValue = 0;
        TokenSale storage tokenSale;
        for (uint8 i=0;i<listTokenId.length;i++) {
			require(_exists(listTokenId[i]), "token doesn't exist");
            require(_msgSender() == ownerOf(listTokenId[i]), "Only owner can Claim");
            claimValue += values[listTokenId[i]];
            values[listTokenId[i]] = 0;
            tokenSale = tokensOnSale[listTokenId[i]];
            tokenSale.onSale = false;
            tokenSale.price = 0;
            removeFromArray(listTokensOnSale, listTokenId[i]);            
            _burn(listTokenId[i]);
            emit Claim(_msgSender(), listTokenId[i]);
        }
        totalValue -= claimValue;

        if (!fundsToken.transferFrom(fundsCollector, _msgSender(), claimValue + (claimValue * profitToPay / 10000))) {
            revert("cannot send funds");
        }
    }   

    /// @notice Transfer a NFT from a user to another.
    /// @param tokenId Token to be transfered.
    function trade(uint256 tokenId) external nonReentrant {
        require(canTrade, "Trade is not allowed");
        require(_exists(tokenId), "token doesn't exist");
        require(_msgSender() != ownerOf(tokenId), "Buyer is the Seller");

        TokenSale storage tokenSale = tokensOnSale[tokenId];
        require(tokenSale.onSale, "Token not On Sale");

        if (!fundsToken.transferFrom(_msgSender(), ownerOf(tokenId), tokenSale.price)) {
            revert("cannot send funds");
        }

       if (!fundsToken.transferFrom(_msgSender(), feesCollector, values[tokenId] * tradeFee / 10000)) {
            revert("cannot send funds");
        }
        
        emit Trade(_msgSender(), ownerOf(tokenId), tokenId, tokenSale.price);

        _safeTransfer(ownerOf(tokenId), _msgSender(), tokenId, "");

        tokenSale.onSale = false;
        tokenSale.price = 0;
        removeFromArray(listTokensOnSale, tokenId);

    }

    /// @notice Put a NFT to be available to transfer for a certain price.
    /// @param tokenId Token to be put on sale.
    /// @param price Price to be paid to transfer the NFT.
    function putOnSale(uint256 tokenId, uint256 price) external {
        require(canTrade, "Trade is not allowed");
        require(_exists(tokenId), "token doesn't exist");
        require(_msgSender() == ownerOf(tokenId), "Only owner can Put On Sale");

        TokenSale storage tokenSale = tokensOnSale[tokenId];
        tokenSale.onSale = true;
        tokenSale.price = price;
        addToArray(listTokensOnSale, tokenId);
        
        emit PutOnSale(tokenId, price);
    }

    /// @notice Remove a NFT from being available to transfer.
    /// @param tokenId Token to be remove from sale.
    function removeFromSale(uint256 tokenId) external {
        require(canTrade, "Trade is not allowed");
        require(_exists(tokenId), "token doesn't exist");
        require(_msgSender() == ownerOf(tokenId), "Only owner can Remove From Sale");

        TokenSale storage tokenSale = tokensOnSale[tokenId];
		require(tokenSale.onSale, "Token not On Sale");
        tokenSale.onSale = false;
        tokenSale.price = 0;
        removeFromArray(listTokensOnSale, tokenId);

        emit RemoveFromSale(tokenId);
    }

    // SETTERS

    function setFundsToken(address token) external onlyOwner {
        require(token != address(0), "Cannot set address 0");
        fundsToken = IERC20(token);
    }
   
    function setFundsCollector(address _address) external onlyOwner {
        require(_address != address(0), "Cannot set address 0");
        fundsCollector = _address;
    }

    function setFeesCollector(address _address) external onlyOwner {
        require(_address != address(0), "Cannot set address 0");
        feesCollector = _address;
    }

    function setProfitToPay(uint32 _profitToPay) external onlyOwner {
        profitToPay = _profitToPay;
    }

    function setCanBuy(bool _canBuy) external onlyOwner {
        canBuy = _canBuy;
    }

    function setCanClaim(bool _canClaim) external onlyOwner {
        canClaim = _canClaim;
    }

    function setCanTrade(bool _canTrade) external onlyOwner {
        canTrade = _canTrade;
    }

    function setMaxValueToRaise(uint256 _maxValueToRaise) external onlyOwner {
        maxValueToRaise = _maxValueToRaise;
    }
    
    function addValidValues(uint256 value) external onlyOwner {
        validValues[value] = true;
    }

    function deleteValidValues(uint256 value) external onlyOwner {
        validValues[value] = false;
    }

    function setMaxBatchCount(uint16 _maxBatchCount) external onlyOwner {
        maxBatchCount = _maxBatchCount;
    }

    function setBuyFee(uint16 _buyFee) external onlyOwner {
        buyFee = _buyFee;
    }

    function setTradeFee(uint16 _tradeFee) external onlyOwner {
        tradeFee = _tradeFee;
    }
    
    // GETTERS

    function getListTokensOnSale() external view returns (uint256[] memory) {
        return listTokensOnSale;
    }

    // RECOVER FUNDS 

    function recover() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        if (!success) {
            revert("Cannot send funds.");
        }
    }   

    function recoverERC20(address token) external onlyOwner {
         if (!IERC20(token).transfer(owner(), IERC20(token).balanceOf(address(this)))){
             revert("Cannot send funds.");
         }
    }

    // RECEIVE

    receive() external payable {}

    // ARRAYS

    function addToArray(uint256[] storage list, uint256 value) private {
        uint256 index = find(list, value);
        if (index == list.length) {
            list.push(value);
        }
    }

    function removeFromArray(uint256[] storage list, uint256 value) private {
        uint256 index = find(list, value);
        if (index < list.length) {
            list[index] = list[list.length - 1];
            list.pop();
        }
    }

    function find(uint256[] memory list, uint256 value) private pure returns(uint)  {
        for (uint i=0;i<list.length;i++) {
            if (list[i] == value) {
               return i;
            }
        }
        return list.length;
    }

    // NOT SUPPORTED FUNCTIONS
    function transferFrom(address, address, uint256) 
        public 
        pure 
        override(ERC721, IERC721) 
    {
        revert("Not Allowed");
    }

    function safeTransferFrom(address, address, uint256) 
        public pure override(ERC721, IERC721) 
    {
        revert("Not Allowed");
    }

    function safeTransferFrom(address, address, uint256,  bytes memory) 
        public 
        pure
        override(ERC721, IERC721) 
    {
        revert("Not Allowed");
    }

    // Compliance required by Solidity

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }    

}
