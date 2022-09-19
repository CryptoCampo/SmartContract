const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CCNFT", function () {
  let deployer, privateInvestor, c1, c2, funds, fees, busd, ccnft;
  let c1Balance = 0, c2Balance = 0, fundsBalance = 0, feesBalance = 0, privateInvestorBalance = 0, NFT_VALUE 
  before(async function() {
    [deployer, privateInvestor, c1, c2, funds, fees] = await ethers.getSigners();

    const BUSD = await hre.ethers.getContractFactory("BUSD");
    busd = await BUSD.deploy();
    await busd.deployed();
    console.log("BUSD deployed to:", busd.address);
  
    const CCNFT = await hre.ethers.getContractFactory("CCNFT");
    ccnft = await CCNFT.deploy();
    await ccnft.deployed();
    console.log("CCNFT deployed to:", ccnft.address);

    NFT_VALUE = parseFloat(ethers.utils.formatEther(await ccnft.NFT_VALUE()))
  })

  it("Cannot Mint to Address 0", async function () {
    await expect(ccnft.mint(ethers.constants.AddressZero, 1)).to.be.revertedWith("Cannot Mint to address 0");
  });
  
  it("Mint ", async function () {
    await ccnft.mint(privateInvestor.address, 50);
    expect(await ccnft.totalSupply()).to.be.equal(50);
    expect(await ccnft.tokenCount()).to.be.equal(50);
    expect(await ccnft.balanceOf(privateInvestor.address)).to.be.equal(50);
    expect(await ccnft.balanceOf(c1.address)).to.be.equal(0);
    expect(await ccnft.balanceOf(c2.address)).to.be.equal(0);
    expect(await ccnft.ownerOf(1)).to.be.equal(privateInvestor.address);

    checkBalance();
  });

  it("Cannot Buy: FundsCollector Not Set", async function () {
    await ccnft.setCanBuy(true);
    await expect(ccnft.connect(c1).buy(1)).to.be.revertedWith("FundsCollector not Set");
  });

  it("setFundsCollector", async function () {
    await ccnft.setFundsCollector(funds.address);
    expect(await ccnft.fundsCollector()).to.be.equal(funds.address);
  });

  it("Cannot Buy: FeesCollector Not Set", async function () {
    await expect(ccnft.connect(c1).buy(1)).to.be.revertedWith("FeesCollector not Set");
    await ccnft.setCanClaim(false);
  });

  it("setFundsToken", async function () {
    await ccnft.setFundsToken(busd.address);
    expect(await ccnft.fundsToken()).to.be.equal(busd.address);
  });

  it("setFeesCollector", async function () {
    await ccnft.setFeesCollector(fees.address);
    expect(await ccnft.feesCollector()).to.be.equal(fees.address);
  });

  it("setProfitToPay", async function () {
    await ccnft.setProfitToPay(5000);
    expect(await ccnft.profitToPay()).to.be.equal(5000);
  });
  
  it("setCanBuy", async function () {
    await ccnft.setCanBuy(true);
    expect(await ccnft.canBuy()).to.be.equal(true);
    await ccnft.setCanBuy(false);
  });
  
  it("setCanClaim", async function () {
    await ccnft.setCanClaim(true);
    expect(await ccnft.canClaim()).to.be.equal(true);
    await ccnft.setCanClaim(false);
  });

  it("setBuyFee", async function () {
    await ccnft.setBuyFee(100);
    expect(await ccnft.buyFee()).to.be.equal(100);
  });

  it("setMaxMintPerUser", async function () {
    await ccnft.setMaxMintPerUser(2);
    expect(await ccnft.maxMintPerUser()).to.be.equal(2);
  });

  it("Cannot Buy: canBuy=false", async function () {
    await expect(ccnft.connect(c1).buy(1)).to.be.revertedWith("Buy is not allowed");
  });

  it("Cannot Buy: ERC20: insufficient allowance ", async function () {
    await ccnft.setCanBuy(true);    
    await expect(ccnft.connect(c1).buy(1)).to.be.revertedWith("ERC20: insufficient allowance");
  });

  it("Cannot Buy ERC20: transfer amount exceeds balance (not enough to buy)", async function () {
    await busd.connect(c1).approve(ccnft.address, ethers.utils.parseEther("10000000"));
    await expect(ccnft.connect(c1).buy(1)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });

  it("Cannot Buy ERC20: transfer amount exceeds balance (not enough to pay fees)", async function () {
    await busd.transfer(c1.address, ethers.utils.parseEther("200"));
    c1Balance += 200
    await expect(ccnft.connect(c1).buy(1)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });

  it("First Buy ", async function () {
    await busd.transfer(c1.address, ethers.utils.parseEther("49800"));
    c1Balance += 49800
    await ccnft.connect(c1).buy(1);
    c1Balance -= NFT_VALUE * 1.01
    fundsBalance += NFT_VALUE
    feesBalance += NFT_VALUE * .01
    expect(await ccnft.totalSupply()).to.be.equal(51);
    expect(await ccnft.tokenCount()).to.be.equal(51);
    expect(await ccnft.balanceOf(privateInvestor.address)).to.be.equal(50);
    expect(await ccnft.balanceOf(c1.address)).to.be.equal(1);
    expect(await ccnft.balanceOf(c2.address)).to.be.equal(0);
    expect(await ccnft.ownerOf(1)).to.be.equal(privateInvestor.address);
    expect(await ccnft.ownerOf(51)).to.be.equal(c1.address);

    checkBalance();
  });

  it("Second Buy ", async function () {
    await busd.transfer(c2.address, ethers.utils.parseEther("50000"));
    c2Balance += 50000
    await busd.connect(c2).approve(ccnft.address, ethers.utils.parseEther("10000000"));
    await ccnft.connect(c2).buy(2);
    c2Balance -= 2 * NFT_VALUE * 1.01
    fundsBalance += 2 * NFT_VALUE
    feesBalance += 2 * NFT_VALUE * .01
    expect(await ccnft.totalSupply()).to.be.equal(53);
    expect(await ccnft.tokenCount()).to.be.equal(53);
    expect(await ccnft.balanceOf(privateInvestor.address)).to.be.equal(50);
    expect(await ccnft.balanceOf(c1.address)).to.be.equal(1);
    expect(await ccnft.balanceOf(c2.address)).to.be.equal(2);
    expect(await ccnft.ownerOf(1)).to.be.equal(privateInvestor.address);
    expect(await ccnft.ownerOf(51)).to.be.equal(c1.address);
    expect(await ccnft.ownerOf(52)).to.be.equal(c2.address);
    expect(await ccnft.ownerOf(53)).to.be.equal(c2.address);

    checkBalance();
  });

  it("Cannot Buy Over MaxMintPerUser", async function () {
    await busd.connect(privateInvestor).approve(ccnft.address, ethers.utils.parseEther("10000000"));
    await expect(ccnft.connect(privateInvestor).buy(5)).to.be.revertedWith("Cannot mint more than maximum mint");
  });

  it("Cannot Buy Over MaxMintPerUser", async function () {
    await expect(ccnft.connect(privateInvestor).buy(1)).to.be.revertedWith("Maximum mint per user exceeded");
  });

  it("Cannot Claim: CanClaim=False", async function () {
    await expect(ccnft.connect(c1).claim([0,1,2])).to.be.revertedWith("Claim is not allowed");
  });

  it("Cannot Claim: token doesn't exist", async function () {
    await ccnft.setCanClaim(true);
    await expect(ccnft.connect(c1).claim([100])).to.be.revertedWith("token doesn't exist");
  });

  it("Cannot Claim: Only owner can Claim", async function () {
    await expect(ccnft.connect(c1).claim([1])).to.be.revertedWith("Only owner can Claim");
  });

  it("Cannot Claim: ERC20: insufficient allowance", async function () {
    await expect(ccnft.connect(privateInvestor).claim([1,2,3])).to.be.revertedWith("ERC20: insufficient allowance");
  });

  it("Cannot Claim: ERC20: transfer amount exceeds balance", async function () {
    await busd.connect(funds).approve(ccnft.address, ethers.utils.parseEther("10000000"));
    await expect(ccnft.connect(privateInvestor).claim([1,2,3,4,5,6,7,8,9,10])).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });

  it("First Claim", async function () {
    await busd.transfer(funds.address, ethers.utils.parseEther("5000"));
    fundsBalance += 5000
    await ccnft.connect(privateInvestor).claim([1,2,3,4,5,6,7,8,9,10]);
    privateInvestorBalance += 10 * NFT_VALUE * 1.5
    fundsBalance -= 10 * NFT_VALUE * 1.5

    expect(await ccnft.totalSupply()).to.be.equal(43);
    expect(await ccnft.balanceOf(privateInvestor.address)).to.be.equal(40);
    expect(await ccnft.balanceOf(c1.address)).to.be.equal(1);
    expect(await ccnft.balanceOf(c2.address)).to.be.equal(2);
    await expect(ccnft.connect(c1).claim([1])).to.be.revertedWith("token doesn't exist");
    await expect(ccnft.connect(c1).claim([2])).to.be.revertedWith("token doesn't exist");
    await expect(ccnft.connect(c1).claim([3])).to.be.revertedWith("token doesn't exist");
    await expect(ccnft.connect(c1).claim([4])).to.be.revertedWith("token doesn't exist");
    await expect(ccnft.connect(c1).claim([5])).to.be.revertedWith("token doesn't exist");
    await expect(ccnft.connect(c1).claim([6])).to.be.revertedWith("token doesn't exist");
    await expect(ccnft.connect(c1).claim([7])).to.be.revertedWith("token doesn't exist");
    await expect(ccnft.connect(c1).claim([8])).to.be.revertedWith("token doesn't exist");
    await expect(ccnft.connect(c1).claim([9])).to.be.revertedWith("token doesn't exist");
    await expect(ccnft.connect(c1).claim([10])).to.be.revertedWith("token doesn't exist");
    await expect(ccnft.ownerOf(1)).to.be.revertedWith("");
    await expect(ccnft.ownerOf(2)).to.be.revertedWith("");
    await expect(ccnft.ownerOf(3)).to.be.revertedWith("");
    await expect(ccnft.ownerOf(4)).to.be.revertedWith("");
    await expect(ccnft.ownerOf(5)).to.be.revertedWith("");
    await expect(ccnft.ownerOf(6)).to.be.revertedWith("");
    await expect(ccnft.ownerOf(7)).to.be.revertedWith("");
    await expect(ccnft.ownerOf(8)).to.be.revertedWith("");
    await expect(ccnft.ownerOf(9)).to.be.revertedWith("");
    await expect(ccnft.ownerOf(10)).to.be.revertedWith("");
    expect(await ccnft.ownerOf(11)).to.be.equal(privateInvestor.address);
    expect(await ccnft.ownerOf(51)).to.be.equal(c1.address);
    expect(await ccnft.ownerOf(52)).to.be.equal(c2.address);
    expect(await ccnft.ownerOf(53)).to.be.equal(c2.address);

    checkBalance();
  });
  
  it("Second Claim", async function () {
    await ccnft.connect(c2).claim([52]);
    c2Balance += NFT_VALUE * 1.5
    fundsBalance -= NFT_VALUE * 1.5

    expect(await ccnft.totalSupply()).to.be.equal(42);
    expect(await ccnft.balanceOf(privateInvestor.address)).to.be.equal(40);
    expect(await ccnft.balanceOf(c1.address)).to.be.equal(1);
    expect(await ccnft.balanceOf(c2.address)).to.be.equal(1);
    await expect(ccnft.connect(c2).claim([52])).to.be.revertedWith("token doesn't exist");
    await expect(ccnft.ownerOf(52)).to.be.revertedWith("");
    expect(await ccnft.ownerOf(11)).to.be.equal(privateInvestor.address);
    expect(await ccnft.ownerOf(51)).to.be.equal(c1.address);
    expect(await ccnft.ownerOf(53)).to.be.equal(c2.address);

    checkBalance();
  });

  it("Cannot Transfer", async function () {  
    await expect(ccnft.connect(c1).transferFrom(c1.address, c2.address, 51)).to.be.revertedWith("Not Allowed");
  });

  it("Recover ERC20", async function () {  
    await busd.transfer(ccnft.address, ethers.utils.parseEther("1000"));
    expect(await busd.balanceOf(ccnft.address)).to.be.equal(ethers.utils.parseEther("1000"));    
    await ccnft.recover(busd.address);
    expect(await busd.balanceOf(ccnft.address)).to.be.equal(ethers.utils.parseEther("0"));    
  });

  it("Send ETH", async function () {  
    expect(await ethers.provider.getBalance(ccnft.address)).to.be.equal(ethers.utils.parseEther("0"));    
    await ccnft.deposit({ value: ethers.utils.parseEther("1") });
    expect(await ethers.provider.getBalance(ccnft.address)).to.be.equal(ethers.utils.parseEther("1"));    
  });

  it("Withdraw ETH", async function () {  
    await ccnft.withdraw();
    expect(await ethers.provider.getBalance(ccnft.address)).to.be.equal(ethers.utils.parseEther("0"));    
  });

});

const checkBalance = async () => {
  expect(await busd.balanceOf(privateInvestor.address)).to.be.equal(ethers.utils.parseEther(privateInvestorBalance.toString()));
  expect(await busd.balanceOf(c1.address)).to.be.equal(ethers.utils.parseEther(c1Balance.toString()));
  expect(await busd.balanceOf(c2.address)).to.be.equal(ethers.utils.parseEther(c2Balance.toString()));
  expect(await busd.balanceOf(funds.address)).to.be.equal(ethers.utils.parseEther(fundsBalance.toString()));
  expect(await busd.balanceOf(fees.address)).to.be.equal(ethers.utils.parseEther(feesBalance.toString()));
}