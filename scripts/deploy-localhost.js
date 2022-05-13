const main = async () => {
    const [deployer, c1, c2, funds, fees] = await ethers.getSigners();

    const BUSD = await hre.ethers.getContractFactory("BUSD");
    const busd = await BUSD.deploy();
    await busd.deployed();
    console.log("BUSD deployed to:", busd.address);
  
    const CCNFT = await hre.ethers.getContractFactory("CCNFT");
    const ccnft = await CCNFT.deploy();
    await ccnft.deployed();
    console.log("CCNFT deployed to:", ccnft.address);
  
    await ccnft.setFundsToken(busd.address);
    await ccnft.setFundsCollector(funds.address);
    await ccnft.setFeesCollector(fees.address);
  
    await ccnft.setMaxValueToRaise(ethers.utils.parseEther("5000"));
    await ccnft.setProfitToPay(5000);
    await ccnft.setCanBuy(true);
    await ccnft.setCanTrade(true);
    await ccnft.setCanClaim(true);
  
    await ccnft.addValidValues(ethers.utils.parseEther("100"));
    await ccnft.addValidValues(ethers.utils.parseEther("500"));
    await ccnft.addValidValues(ethers.utils.parseEther("1000"));
  
    await ccnft.setMaxBatchCount(10);
    await ccnft.setBuyFee(500);
    await ccnft.setTradeFee(100);
  
    await busd.transfer(c1.address, ethers.utils.parseEther("50000"));
    await busd.transfer(c2.address, ethers.utils.parseEther("50000"));
  
    // await busd.connect(c1).approve(ccnft.address, ethers.utils.parseEther("10000000"))
    // await busd.connect(c2).approve(ccnft.address, ethers.utils.parseEther("10000000"))

    await busd.connect(funds).approve(ccnft.address, ethers.utils.parseEther("10000000"))
  };
  
  const runMain = async () => {
    try {
      await main();
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  };
  
  runMain();
  