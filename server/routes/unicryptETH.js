const getETHWeb3 = require('../utils/getETHweb3.js');
const unicryptETHabi = require('../abi/unicryptETH_abi.json');
const uniswapETHabi = require('../abi/uniswapETH_abi.json');
const multicallETH = require('./multicallETH.js');
const BigNumber = require("bignumber.js");
const fetch = require("node-fetch");
const cron = require("node-cron");
const dbo = require("../db/conn");
// const Axios = require('axios');


const unicryptAddressETH = "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214";

module.exports = async function UnicryptETH() {

  const web3 = getETHWeb3();
  const unicryptETHPortal = new web3.eth.Contract(unicryptETHabi, unicryptAddressETH);

  cron.schedule('* * * * *', async () => {
    let total_tokenNums = await unicryptETHPortal.methods.getNumLockedTokens().call();

    let ethPrice;
    try {
    await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            bundle(id: "1" ) {
              ethPrice
            }
          }
        `
      }),
    })
      .then((res) => res.json())
      .then((result) => ethPrice = result.data.bundle.ethPrice);
    } catch(err) {
      console.log("Finding a ETH price on thegraph.");
      return;
    }

    let tokenData0;
    let tokenData1;
    let LPtokens = [];

    let lastIndex;
    let storingTokenName;
    let storingTokenAddr;

    const tokenAddrsArr = await unicryptETHPortal.methods.getLockedTokenAtIndex(total_tokenNums - 1).call();
    const tokenLocksArr = await unicryptETHPortal.methods.tokenLocks(tokenAddrsArr, 0).call();

    LPtokens.push({address: tokenAddrsArr, name: "token0"});
    LPtokens.push({address: tokenAddrsArr, name: "token1"});
    LPtokens.push({address: tokenAddrsArr, name: "decimals"});
    LPtokens.push({address: tokenAddrsArr, name: "getReserves"});
    LPtokens.push({address: tokenAddrsArr, name: "totalSupply"});

    const LPtokensArr = await multicallETH(uniswapETHabi, LPtokens);

    try {
    await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            token(id: "${LPtokensArr[0][0].toLowerCase()}"){
              name
              symbol
              decimals
              derivedETH
            }
          }
        `
      }),
    })
      .then((res) => res.json())
      .then((result) => tokenData0 = result.data.token);
    } catch(err) {
      console.log("Finding a first token info on thegraph.");
      return;
    }

    try {
    await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            token(id: "${LPtokensArr[1][0].toLowerCase()}"){
              name
              symbol
              decimals
              derivedETH
            }
          }
        `
      }),
    })
      .then((res) => res.json())
      .then((result) => tokenData1 = result.data.token);
    } catch(err) {
      console.log("Finding a second token info on thegraph.");
      return;
    }

    if (tokenData0.symbol == "WETH" || tokenData0.symbol == "USDT" || tokenData0.symbol == "USDC") {
      storingTokenName = tokenData1.name;
      storingTokenAddr = LPtokensArr[1][0];
    } else if (tokenData1.symbol == "WETH" || tokenData1.symbol == "USDT" || tokenData1.symbol == "USDC") {
      storingTokenName = tokenData0.name;
      storingTokenAddr = LPtokensArr[0][0];
    }
    
    let percentage = new BigNumber(tokenLocksArr[1]).dividedBy(10**LPtokensArr[2][0]).dividedBy(new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]));
    let token0Price = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(new BigNumber(tokenData0.derivedETH)).multipliedBy(ethPrice);
    let token1Price = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(new BigNumber(tokenData1.derivedETH)).multipliedBy(ethPrice);

    const epochNum1 = new Date(tokenLocksArr[3] * 1000);
    let unlockDate = epochNum1.toLocaleDateString();

    const epochNum2 = new Date(tokenLocksArr[0] * 1000);
    let lockDate = epochNum2.toLocaleDateString();


    let db_connect = dbo.getDb("myFirstDatabase");
    await db_connect.collection("lastIndexes").findOne({Locker: "UnicryptETH"}).then(function(result) {
      lastIndex = result;
    });
    console.log(lastIndex);

    if (lastIndex === null) {
      db_connect.collection("lastIndexes").insertOne({Locker: "UnicryptETH", LastId: total_tokenNums}).then(function(res) {

      });
      let myobj = {
        PairToken: tokenData0.symbol + " / " + tokenData1.symbol,
        Blockchain: "Ethereum",
        Liquidity_Locked: token0Price.plus(token1Price).multipliedBy(percentage).toFixed(0),
        Tokens_Locked: new BigNumber(tokenLocksArr[1]).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
        Locked_Date: lockDate,
        Time_to_unlock: unlockDate,
        Locker: "Unicrypt",
        Marketcap: token0Price.plus(token1Price).toFixed(0),
        Coingecko_Rank: "—",
        Token_TotalAmount: new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
        PairTokenAddress: tokenAddrsArr,
        TokenName: storingTokenName,
        TokenAddress: storingTokenAddr
      };
      db_connect.collection("records").insertOne(myobj).then(function(res) {

      });
    } else if (lastIndex.LastId >= total_tokenNums) {
      return;
    } else {
      db_connect.collection("lastIndexes").updateOne({Locker: "UnicryptETH"}, {$set: {LastId: total_tokenNums}}).then(function(res) {

      });
      let myobj = {
        PairToken: tokenData0.symbol + " / " + tokenData1.symbol,
        Blockchain: "Ethereum",
        Liquidity_Locked: token0Price.plus(token1Price).multipliedBy(percentage).toFixed(0),
        Tokens_Locked: new BigNumber(tokenLocksArr[1]).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
        Locked_Date: lockDate,
        Time_to_unlock: unlockDate,
        Locker: "Unicrypt",
        Marketcap: token0Price.plus(token1Price).toFixed(0),
        Coingecko_Rank: "—",
        Token_TotalAmount: new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
        PairTokenAddress: tokenAddrsArr,
        TokenName: storingTokenName,
        TokenAddress: storingTokenAddr
      };
      db_connect.collection("records").insertOne(myobj).then(function(res) {

      });
    }
  });
}
