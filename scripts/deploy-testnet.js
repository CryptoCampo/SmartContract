const main = async () => {
  
  const CCNFT = await hre.ethers.getContractFactory("CCNFT");
  const ccnft = await CCNFT.deploy();
  await ccnft.deployed();
  console.log("CCNFT deployed to:", ccnft.address);
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
