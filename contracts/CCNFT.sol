//SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "hardhat/console.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";
import "openzeppelin-solidity/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/security/ReentrancyGuard.sol";

/// @title Smart Contract for managing CryptoCampo NFT
/// @author Eduardo Mannarino
/// @notice Implements ERC721 Standard with specific buy, trade and claim functions
contract CCNFT is ERC721Enumerable, Ownable, ReentrancyGuard {

    event Buy(address indexed buyer, uint256 indexed tokenId);
    event Mint(address indexed buyer, uint256 indexed tokenId);
    event Claim(address indexed claimer, uint256 indexed tokenId);

    string private baseURI;
    mapping(address => bool) public buyers;
    address public fundsCollector;
    address public feesCollector;
    address public returnCollector;
    bool public canBuy;
    bool public canClaim;
    bool public canReturn;
    bool public canReBuy;
    uint256 public constant MAX_SUPPLY = 1420;
    uint256 public constant NFT_VALUE = 225 * 10 ** 18 ;
    uint16 public tokenCount = 0; 
    uint16 public tokenBurned = 0; 
    uint16 public buyFee; 
    uint16 public returnFee; 
    uint16 public reBuyFee; 
    uint16 public profitToPay;
    IERC20 public fundsToken;
    
    constructor() ERC721("CryptoCampo NFT", "CCNFT") {
    }

    // PUBLIC FUNCTIONS

    /// @notice Mints a NFT charging value and fees.
    function buy() external nonReentrant {
        require(canBuy, "Buy is not allowed");
        require(fundsCollector != address(0), "FundsCollector not Set");
        require(feesCollector != address(0), "FeesCollector not Set");
        require(tokenCount < MAX_SUPPLY, "No more NFT");
        require(!buyers[_msgSender()], "Address already bought");

        tokenCount++;
        buyers[_msgSender()] = true;

        _safeMint(_msgSender(), tokenCount);
        emit Buy(_msgSender(), tokenCount);

    if (!fundsToken.transferFrom(_msgSender(), fundsCollector, NFT_VALUE)) 
            revert("Cannot send funds tokens");

        if (!fundsToken.transferFrom(_msgSender(), feesCollector, NFT_VALUE * buyFee / 10000)) 
            revert("Cannot send fees tokens");
    } 

    /// @notice Mints a batch of NFT for free (OnlyOwner)
    function mint(address to, uint16 amount) external onlyOwner {
        require(to != address(0), "Cannot Mint to address 0");
        require(tokenCount + amount <= MAX_SUPPLY , "No more NFT");

        for (uint8 i=1;i<=amount;i++) {
            tokenCount++;
            _safeMint(to, tokenCount);
            emit Mint(to, tokenCount);
        }
    } 

    /// @notice Claims a NFTs.
    /// @param listTokenId List of TokenId to be claimed.
    function claim(uint256[] calldata listTokenId) external nonReentrant {
        require(canClaim, "Claim is not allowed");
        for (uint8 i=0;i<listTokenId.length;i++) {
            
            require(_exists(listTokenId[i]), "token doesn't exist");
            require(_msgSender() == ownerOf(listTokenId[i]), "Only owner can Claim");

            tokenBurned++;
            _burn(listTokenId[i]);

            if (!fundsToken.transferFrom(fundsCollector, _msgSender(), NFT_VALUE + (NFT_VALUE * profitToPay / 10000))) 
                revert("cannot send funds");

            emit Claim(_msgSender(), listTokenId[i]);
        }
    }   

    /// @notice Return a NFT to CryptoCampo for a value with a discount.
    /// @param tokenId TokenId to be returned.
    function returnToken(uint256 tokenId) external nonReentrant {
        require(canReturn, "Return is not allowed");
        require(fundsCollector != address(0), "FundsCollector not Set");
        require(returnCollector != address(0), "ReturnCollector not Set");
		require(_exists(tokenId), "token doesn't exist");
        require(_msgSender() == ownerOf(tokenId), "Only owner can Return");

        _safeTransfer(_msgSender(), returnCollector, tokenId, "");

        if (!fundsToken.transferFrom(fundsCollector, _msgSender(), NFT_VALUE - (NFT_VALUE * returnFee / 10000))) 
            revert("cannot send funds");
    }

    /// @notice Transfer a minted NFT from CryptoCampo for a value with an extra charge.
    /// @param tokenId TokenId to be returned.
    function reBuy(uint256 tokenId) external nonReentrant {
        require(canReBuy, "ReBuy is not allowed");
		require(_exists(tokenId), "token doesn't exist");
		require(returnCollector == ownerOf(tokenId), "owner is not returnCollector");

        _safeTransfer(returnCollector, _msgSender(), tokenId, "");

        if (!fundsToken.transferFrom(_msgSender(), fundsCollector, NFT_VALUE + (NFT_VALUE * reBuyFee / 10000))) 
            revert("cannot send funds");
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

    function setReturnCollector(address _address) external onlyOwner {
        require(_address != address(0), "Cannot set address 0");
        returnCollector = _address;
    }

    function setProfitToPay(uint16 _profitToPay) external onlyOwner {
        profitToPay = _profitToPay;
    }

    function setCanBuy(bool _canBuy) external onlyOwner {
        canBuy = _canBuy;
    }

    function setCanClaim(bool _canClaim) external onlyOwner {
        canClaim = _canClaim;
    }

    function setCanReturn(bool _canReturn) external onlyOwner {
        canReturn = _canReturn;
    }

    function setCanReBuy(bool _canReBuy) external onlyOwner {
        canReBuy = _canReBuy;
    }

    function setBuyFee(uint16 _buyFee) external onlyOwner {
        buyFee = _buyFee;
    }

    function setReturnFee(uint16 _returnFee) external onlyOwner {
        returnFee = _returnFee;
    }

    function setReBuyFee(uint16 _reBuyFee) external onlyOwner {
        reBuyFee = _reBuyFee;
    }

    function setBaseURI(string memory _baseURI) external onlyOwner {
        baseURI = _baseURI;
    }

    // GETTERS
    
    /// @notice Returns the metadata of a specific token
    /// @param tokenId ID of the token type
    function uri(uint256 tokenId) public view returns (string memory) {
        require(_exists(tokenId), "token doesn't exist");
        return string(abi.encodePacked(baseURI, Strings.toString(tokenId)));
    }    

    // RECOVER FUNDS 

    function recover(address token) external onlyOwner {
        if (IERC20(token).transfer(owner(), IERC20(token).balanceOf(address(this)))){
            revert("Cannot send funds.");
        }
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
