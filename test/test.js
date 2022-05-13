const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CCNFT", function () {
  let deployer, c1, c2, funds, fees, busd, ccnft;
  before(async function() {
    [deployer, c1, c2, funds, fees] = await ethers.getSigners();

    const BUSD = await hre.ethers.getContractFactory("BUSD");
    busd = await BUSD.deploy();
    await busd.deployed();
    console.log("BUSD deployed to:", busd.address);
  
    const CCNFT = await hre.ethers.getContractFactory("CCNFT");
    ccnft = await CCNFT.deploy();
    await ccnft.deployed();
    console.log("CCNFT deployed to:", ccnft.address);

  })
  
  it("setFundsToken", async function () {
    await ccnft.setFundsToken(busd.address);
    expect(await ccnft.fundsToken()).to.be.equal(busd.address);
  });

  it("setFundsCollector", async function () {
    await ccnft.setFundsCollector(funds.address);
    expect(await ccnft.fundsCollector()).to.be.equal(funds.address);
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
  
  it("setCanTrade", async function () {
    await ccnft.setCanTrade(true);
    expect(await ccnft.canTrade()).to.be.equal(true);
    await ccnft.setCanTrade(false);
  });

  it("setCanClaim", async function () {
    await ccnft.setCanClaim(true);
    expect(await ccnft.canClaim()).to.be.equal(true);
    await ccnft.setCanClaim(false);
  });

  it("setMaxValueToRaise", async function () {
    await ccnft.setMaxValueToRaise(ethers.utils.parseEther("5000"));
    expect(await ccnft.maxValueToRaise()).to.be.equal(ethers.utils.parseEther("5000"));
    await ccnft.setMaxValueToRaise(ethers.utils.parseEther("0"));
  });
  
  it("addValidValues", async function () {
    await ccnft.addValidValues(ethers.utils.parseEther("100"));
    expect(await ccnft.validValues(ethers.utils.parseEther("100"))).to.be.equal(true);
    await ccnft.addValidValues(ethers.utils.parseEther("500"));
    expect(await ccnft.validValues(ethers.utils.parseEther("500"))).to.be.equal(true);
    await ccnft.addValidValues(ethers.utils.parseEther("1000"));
    expect(await ccnft.validValues(ethers.utils.parseEther("1000"))).to.be.equal(true);
    await ccnft.addValidValues(ethers.utils.parseEther("5000"));
    expect(await ccnft.validValues(ethers.utils.parseEther("5000"))).to.be.equal(true);
  });

  it("deleteValidValues", async function () {
    await ccnft.deleteValidValues(ethers.utils.parseEther("5000"));
    expect(await ccnft.validValues(ethers.utils.parseEther("5000"))).to.be.equal(false);
  });

  it("setMaxBatchCount", async function () {
    await ccnft.setMaxBatchCount(10);
    expect(await ccnft.maxBatchCount()).to.be.equal(10);
  });

  it("setBuyFee", async function () {
    await ccnft.setBuyFee(500);
    expect(await ccnft.buyFee()).to.be.equal(500);
  });

  it("setTradeFee", async function () {
    await ccnft.setTradeFee(100);
    expect(await ccnft.tradeFee()).to.be.equal(100);
  });

  it("Cannot Buy: canBuy=false", async function () {
    await expect(ccnft.connect(c1).buy(ethers.utils.parseEther("100"), 2)).to.be.revertedWith("Buy is not allowed");
  });

  it("Cannot Buy: Buy amount not valid", async function () {
    await ccnft.setCanBuy(true);
    await expect(ccnft.connect(c1).buy(ethers.utils.parseEther("100"), 0)).to.be.revertedWith("Buy amount not valid");
    await expect(ccnft.connect(c1).buy(ethers.utils.parseEther("100"), 11)).to.be.revertedWith("Buy amount not valid");
  });

  it("Cannot Buy: Value is not valid", async function () {
    await expect(ccnft.connect(c1).buy(ethers.utils.parseEther("1"), 1)).to.be.revertedWith("Value is not valid");
  });

  it("Cannot Buy: Buy exceeds maxValueToRaise", async function () {
    await expect(ccnft.connect(c1).buy(ethers.utils.parseEther("100"), 1)).to.be.revertedWith("Buy exceeds maxValueToRaise");
  });

  it("Cannot Buy: ERC20: insufficient allowance ", async function () {
    await ccnft.setMaxValueToRaise(ethers.utils.parseEther("5000"));
    await expect(ccnft.connect(c1).buy(ethers.utils.parseEther("100"), 2)).to.be.revertedWith("ERC20: insufficient allowance");
  });

  it("Cannot Buy ERC20: transfer amount exceeds balance (not enough to buy)", async function () {
    await busd.connect(c1).approve(ccnft.address, ethers.utils.parseEther("10000000"));
    await expect(ccnft.connect(c1).buy(ethers.utils.parseEther("100"), 2)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });

  it("Cannot Buy ERC20: transfer amount exceeds balance (not enough to pay fees)", async function () {
    await busd.transfer(c1.address, ethers.utils.parseEther("200"));
    await expect(ccnft.connect(c1).buy(ethers.utils.parseEther("100"), 2)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });

  it("First Buy ", async function () {
    await busd.transfer(c1.address, ethers.utils.parseEther("49800"));
    await ccnft.connect(c1).buy(ethers.utils.parseEther("100"), 2);
    expect(await ccnft.totalSupply()).to.be.equal(2);
    expect(await ccnft.balanceOf(c1.address)).to.be.equal(2);
    expect(await ccnft.balanceOf(c2.address)).to.be.equal(0);
    expect(await ccnft.ownerOf(0)).to.be.equal(c1.address);
    expect(await ccnft.ownerOf(1)).to.be.equal(c1.address);
    expect(await ccnft.totalValue()).to.be.equal(ethers.utils.parseEther("200"));

    expect(await busd.balanceOf(c1.address)).to.be.equal(ethers.utils.parseEther("49790"));
    expect(await busd.balanceOf(c2.address)).to.be.equal(ethers.utils.parseEther("0"));
    expect(await busd.balanceOf(funds.address)).to.be.equal(ethers.utils.parseEther("200"));
    expect(await busd.balanceOf(fees.address)).to.be.equal(ethers.utils.parseEther("10"));
  });

  it("Second Buy ", async function () {
    await busd.transfer(c2.address, ethers.utils.parseEther("50000"));
    await busd.connect(c2).approve(ccnft.address, ethers.utils.parseEther("10000000"));
    await ccnft.connect(c2).buy(ethers.utils.parseEther("500"), 3);
    expect(await ccnft.totalSupply()).to.be.equal(5);
    expect(await ccnft.balanceOf(c1.address)).to.be.equal(2);
    expect(await ccnft.balanceOf(c2.address)).to.be.equal(3);
    expect(await ccnft.ownerOf(0)).to.be.equal(c1.address);
    expect(await ccnft.ownerOf(1)).to.be.equal(c1.address);
    expect(await ccnft.ownerOf(2)).to.be.equal(c2.address);
    expect(await ccnft.ownerOf(3)).to.be.equal(c2.address);
    expect(await ccnft.totalValue()).to.be.equal(ethers.utils.parseEther("1700"));

    expect(await busd.balanceOf(c1.address)).to.be.equal(ethers.utils.parseEther("49790"));
    expect(await busd.balanceOf(c2.address)).to.be.equal(ethers.utils.parseEther("48425"));
    expect(await busd.balanceOf(funds.address)).to.be.equal(ethers.utils.parseEther("1700"));
    expect(await busd.balanceOf(fees.address)).to.be.equal(ethers.utils.parseEther("85"));
  });

   it("Cannot Trade: CanTrade=False", async function () {
     await expect(ccnft.connect(c1).trade(2)).to.be.revertedWith("Trade is not allowed");
   });

   it("PutOnSale: Trade is not allowed", async function () {
    await expect(ccnft.connect(c2).putOnSale(2, ethers.utils.parseEther("5000"))).to.be.revertedWith("Trade is not allowed");
  });

  it("RemoveFromSale: Trade is not allowed", async function () {
    await expect(ccnft.connect(c2).removeFromSale(2)).to.be.revertedWith("Trade is not allowed");
  });

   it("Cannot Trade: token doesn't exist", async function () {
     await ccnft.setCanTrade(true);
     await expect(ccnft.connect(c1).trade(5)).to.be.revertedWith("token doesn't exist");
   });

   it("Cannot Trade: Buyer is the Seller", async function () {
    await ccnft.setCanTrade(true);
    await expect(ccnft.connect(c1).trade(0)).to.be.revertedWith("Buyer is the Seller");
  });

  it("Cannot Trade: Token not On Sale", async function () {
    await expect(ccnft.connect(c1).trade(2)).to.be.revertedWith("Token not On Sale");
  });

  it("PutOnSale: token doesn't exist", async function () {
    await expect(ccnft.connect(c2).putOnSale(5, ethers.utils.parseEther("5000"))).to.be.revertedWith("token doesn't exist");
  });

  it("PutOnSale: Only owner can Put On Sale", async function () {
    await expect(ccnft.connect(c2).putOnSale(0, ethers.utils.parseEther("5000"))).to.be.revertedWith("Only owner can Put On Sale");
  });

  it("First PutOnSale", async function () {
    await ccnft.connect(c2).putOnSale(2, ethers.utils.parseEther("5000"));
    let tokenSale = await ccnft.tokensOnSale(0);
    expect(tokenSale.onSale).to.be.equal(false);
    tokenSale = await ccnft.tokensOnSale(2);
    expect(tokenSale.onSale).to.be.equal(true);
    expect(tokenSale.price).to.be.equal(ethers.utils.parseEther("5000"));
    let tokensOnSale = await ccnft.listTokensOnSale(0);
    expect(tokensOnSale.toString()).to.be.equal("2");    
  });

  it("Cannot Trade: ERC20: insufficient allowance", async function () {
    await busd.connect(c1).approve(ccnft.address, ethers.utils.parseEther("0"));
    await expect(ccnft.connect(c1).trade(2)).to.be.revertedWith("ERC20: insufficient allowance");
  }); 

  it("Cannot Trade: ERC20: transfer amount exceeds balance (not enough to buy)", async function () {
    await busd.connect(c1).approve(ccnft.address, ethers.utils.parseEther("10000000"));
    await busd.connect(c1).transfer(deployer.address, busd.balanceOf(c1.address));
    await expect(ccnft.connect(c1).trade(2)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  }); 

  it("Cannot Trade: ERC20: transfer amount exceeds balance (not enough to pay fees)", async function () {
    await busd.transfer(c1.address, ethers.utils.parseEther("5000"));
    await expect(ccnft.connect(c1).trade(2)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  }); 

  it("Trade", async function () {
    await busd.transfer(c1.address, ethers.utils.parseEther("44790"));
    await ccnft.connect(c1).trade(2);
    let tokenSale = await ccnft.tokensOnSale(2);
    expect(tokenSale.onSale).to.be.equal(false);
    expect(tokenSale.price).to.be.equal(ethers.utils.parseEther("0"));
    expect(ccnft.listTokensOnSale(0)).to.be.revertedWith("");
    expect(await ccnft.totalSupply()).to.be.equal(5);
    expect(await ccnft.balanceOf(c1.address)).to.be.equal(3);
    expect(await ccnft.balanceOf(c2.address)).to.be.equal(2);
    expect(await ccnft.ownerOf(2)).to.be.equal(c1.address);
    expect(await busd.balanceOf(c1.address)).to.be.equal(ethers.utils.parseEther("44785"));
    expect(await busd.balanceOf(c2.address)).to.be.equal(ethers.utils.parseEther("53425"));
    expect(await busd.balanceOf(funds.address)).to.be.equal(ethers.utils.parseEther("1700"));
    expect(await busd.balanceOf(fees.address)).to.be.equal(ethers.utils.parseEther("90"));
  }); 

  it("Second PutOnSale", async function () {
    await ccnft.connect(c2).putOnSale(3, ethers.utils.parseEther("1000"));
    let tokenSale = await ccnft.tokensOnSale(0);
    expect(tokenSale.onSale).to.be.equal(false);
    tokenSale = await ccnft.tokensOnSale(3);
    expect(tokenSale.onSale).to.be.equal(true);
    expect(tokenSale.price).to.be.equal(ethers.utils.parseEther("1000"));
    let tokensOnSale = await ccnft.listTokensOnSale(0);
    expect(tokensOnSale.toString()).to.be.equal("3");    
  });

  it("RemoveFromSale: token doesn't exist", async function () {
    await expect(ccnft.connect(c2).removeFromSale(5)).to.be.revertedWith("token doesn't exist");
  });

  it("RemoveFromSale: Only owner can Put On Sale", async function () {
    await expect(ccnft.connect(c1).removeFromSale(3)).to.be.revertedWith("Only owner can Remove From Sale");
  });

  it("RemoveFromSale: Only owner can Put On Sale", async function () {
    await expect(ccnft.connect(c2).removeFromSale(4)).to.be.revertedWith("Token not On Sale");
  });

  it("removeFromSale", async function () {
    await ccnft.connect(c2).removeFromSale(3);
    tokenSale = await ccnft.tokensOnSale(3);
    expect(tokenSale.onSale).to.be.equal(false);
    expect(tokenSale.price).to.be.equal(ethers.utils.parseEther("0"));
    expect(ccnft.listTokensOnSale(0)).to.be.revertedWith("");
  });

  it("Cannot Claim: CanClaim=False", async function () {
    await expect(ccnft.connect(c1).claim([0,1,2])).to.be.revertedWith("Claim is not allowed");
  });

  it("Cannot Claim: Claim amount not valid", async function () {
    await ccnft.setCanClaim(true);
    await expect(ccnft.connect(c1).claim([])).to.be.revertedWith("Claim amount not valid");
    await expect(ccnft.connect(c1).claim([0,1,2,3,4,5,6,7,8,9,10])).to.be.revertedWith("Claim amount not valid");
  });

  it("Cannot Claim: token doesn't exist", async function () {
    await expect(ccnft.connect(c1).claim([5])).to.be.revertedWith("token doesn't exist");
  });

  it("Cannot Claim: Only owner can Claim", async function () {
    await expect(ccnft.connect(c1).claim([3])).to.be.revertedWith("Only owner can Claim");
  });

  it("Cannot Claim: ERC20: insufficient allowance", async function () {
    await expect(ccnft.connect(c1).claim([0,1,2])).to.be.revertedWith("ERC20: insufficient allowance");
  });

  it("Cannot Claim: ERC20: transfer amount exceeds balance", async function () {
    await busd.connect(funds).approve(ccnft.address, ethers.utils.parseEther("10000000"));
    await busd.connect(funds).transfer(deployer.address, ethers.utils.parseEther("1700"));
    await expect(ccnft.connect(c1).claim([0,1,2])).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });

  it("First Claim", async function () {
    await busd.transfer(funds.address, ethers.utils.parseEther("2550"));
    await ccnft.connect(c1).claim([0,1,2]);

    expect(await ccnft.totalSupply()).to.be.equal(2);
    expect(await ccnft.balanceOf(c1.address)).to.be.equal(0);
    expect(await ccnft.balanceOf(c2.address)).to.be.equal(2);
    await expect(ccnft.connect(c1).claim([0])).to.be.revertedWith("token doesn't exist");
    await expect(ccnft.connect(c1).claim([1])).to.be.revertedWith("token doesn't exist");
    await expect(ccnft.connect(c1).claim([2])).to.be.revertedWith("token doesn't exist");
    await expect(ccnft.ownerOf(0)).to.be.revertedWith("");
    await expect(ccnft.ownerOf(1)).to.be.revertedWith("");
    await expect(ccnft.ownerOf(2)).to.be.revertedWith("");
    expect(await ccnft.ownerOf(3)).to.be.equal(c2.address);
    expect(await ccnft.ownerOf(4)).to.be.equal(c2.address);
    expect(await ccnft.totalValue()).to.be.equal(ethers.utils.parseEther("1000"));


    expect(await busd.balanceOf(c1.address)).to.be.equal(ethers.utils.parseEther("45835"));
    expect(await busd.balanceOf(c2.address)).to.be.equal(ethers.utils.parseEther("53425"));
    expect(await busd.balanceOf(funds.address)).to.be.equal(ethers.utils.parseEther("1500"));
    expect(await busd.balanceOf(fees.address)).to.be.equal(ethers.utils.parseEther("90"));
  });
  
});
