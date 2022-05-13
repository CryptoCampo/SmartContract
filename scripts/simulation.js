const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const [deployer, c1, c2, funds, fees] = await ethers.getSigners();

  const BUSD = await hre.ethers.getContractFactory("BUSD");
  const busd = await BUSD.deploy();
  await busd.deployed();
  console.log("BUSD deployed to:", busd.address);

  const CCNFT = await hre.ethers.getContractFactory("CCNFT");
  const ccnft = await CCNFT.deploy();
  await ccnft.deployed();
  console.log("NFT deployed to:", ccnft.address);

  console.log(deployer.address);

  console.log(ethers.utils.formatEther(await busd.balanceOf(ccnft.address)))
  console.log(ethers.utils.formatEther(await busd.balanceOf(deployer.address)))
  console.log("---------------------------------")
  await busd.transfer(ccnft.address, ethers.utils.parseEther("5000"))
  console.log(ethers.utils.formatEther(await busd.balanceOf(ccnft.address)))
  console.log(ethers.utils.formatEther(await busd.balanceOf(deployer.address)))
  console.log("---------------------------------")
  await ccnft.recoverERC20(busd.address);
  
  console.log(ethers.utils.formatEther(await busd.balanceOf(ccnft.address)))
  console.log(ethers.utils.formatEther(await busd.balanceOf(deployer.address)))


  /*await nft.setFundsToken(busd.address);
  await nft.setFundsCollector(funds.address);
  await nft.setFeesCollector(fees.address);

  await nft.setMaxValueToRaise(ethers.utils.parseEther("5000"));
  await nft.setProfitToPay(5000);
  await nft.setCanBuy(true);
  await nft.setCanTrade(true);
  await nft.setCanClaim(true);

  await nft.addValidValues(ethers.utils.parseEther("100"));
  await nft.addValidValues(ethers.utils.parseEther("500"));
  await nft.addValidValues(ethers.utils.parseEther("1000"));

  await nft.setMaxBatchCount(10);
  await nft.setBuyFee(500);
  await nft.setTradeFee(100);

  

  await busd.transfer(c1.address, ethers.utils.parseEther("50000"));
  await busd.transfer(c2.address, ethers.utils.parseEther("50000"));

  await busd.connect(c1).approve(nft.address, ethers.utils.parseEther("10000000"))
  await busd.connect(c2).approve(nft.address, ethers.utils.parseEther("10000000"))

  await nft.connect(c1).buy(ethers.utils.parseEther("100"), 2);
  await nft.connect(c2).buy(ethers.utils.parseEther("500"), 2);

  await nft.connect(c1).putOnSale(0, ethers.utils.parseEther("500"));
  await nft.connect(c2).putOnSale(2, ethers.utils.parseEther("5000"));
  
  await nft.connect(c2).approve(nft.address, 2);
  await nft.connect(c1).trade(2);

  await logBalance(busd, nft);
  
  await busd.transfer(funds.address, ethers.utils.parseEther("600"));
  await busd.connect(funds).approve(nft.address, ethers.utils.parseEther("10000000"));

  await nft.connect(c1).claim([0,1,2]);
  await nft.connect(c2).claim([3]);

  await logBalance(busd, nft);*/
  
}

async function logBalance(busd, nft) {
  console.log("-------------------------------------------------------------")
  const [deployer, c1, c2, funds, fees] = await ethers.getSigners();
  let bal;

  bal = await busd.balanceOf(c1.address);
  console.log("Balance Comprador 1:", ethers.utils.formatEther(bal));

  bal = await busd.balanceOf(c2.address);
  console.log("Balance Comprador 2:", ethers.utils.formatEther(bal));

  bal = await busd.balanceOf(funds.address);
  console.log("Balance Funds Collector:", ethers.utils.formatEther(bal));

  bal = await busd.balanceOf(fees.address);
  console.log("Balance Fees Collector:", ethers.utils.formatEther(bal));


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
