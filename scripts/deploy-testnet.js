const main = async () => {
  const CCNFT = await hre.ethers.getContractFactory("CCNFT");
  const ccnft = await CCNFT.deploy();
  await ccnft.deployed();
  console.log("CCNFT deployed to:", ccnft.address);

  await ccnft.setFundsCollector("0x75989D26758E40eD509B0Cb5cEa9C905721f0631");
  await ccnft.setFeesCollector("0x7091111665c720F1e0BC5494602056B8C64D0Df7");
  await ccnft.setFundsToken("0x5aeBbE8bFA46866Ec8b1EC51a1B6cB98fAAC35f7");
  await ccnft.setProfitToPay(5000);
  await ccnft.setBuyFee(100);
  await ccnft.setCanBuy(true);
  await ccnft.setCanClaim(true);
  await ccnft.setMaxMintPerUser(2);
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
