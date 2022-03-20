const getETHWeb3 = require('../utils/getETHweb3.js');
const unicryptETHabi = require('../abi/unicryptETH_abi.json');
const uniswapETHabi = require('../abi/uniswapETH_abi.json');
const erc20abi = require('../abi/erc20.json');
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
    let newDecimals;
    let nativeDecimals;
    let nativeIndex;
    let nativeSymbol;
    let nativeAmount;
    let newAmount;

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

    let percentage = new BigNumber(tokenLocksArr[1]).dividedBy(10**LPtokensArr[2][0]).dividedBy(new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]));
    let token0Price = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(new BigNumber(tokenData0.derivedETH)).multipliedBy(ethPrice);
    let token1Price = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(new BigNumber(tokenData1.derivedETH)).multipliedBy(ethPrice);

    if (tokenData0.symbol == "WETH" || tokenData0.symbol == "WBNB" || tokenData0.symbol == "USDT" || tokenData0.symbol == "USDC" || tokenData0.symbol == "BUSD") {
      storingTokenName = tokenData1.name;
      storingTokenAddr = LPtokensArr[1][0];
      newDecimals = tokenData1.decimals;
      nativeDecimals = tokenData0.decimals;
      nativeIndex = "token0";
      nativeSymbol = tokenData0.symbol;
      nativeAmount = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(percentage).toFixed(4);
      newAmount = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(percentage).toFixed(2);
    } else if (tokenData1.symbol == "WETH" || tokenData1.symbol == "WBNB" || tokenData1.symbol == "USDT" || tokenData1.symbol == "USDC" || tokenData1.symbol == "BUSD") {
      storingTokenName = tokenData0.name;
      storingTokenAddr = LPtokensArr[0][0];
      newDecimals = tokenData0.decimals;
      nativeDecimals = tokenData1.decimals;
      nativeIndex = "token1";
      nativeSymbol = tokenData1.symbol;
      nativeAmount = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(percentage).toFixed(4);
      newAmount = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(percentage).toFixed(2);
    }

    const erc20Portal = new web3.eth.Contract(erc20abi, storingTokenAddr);
    let new_totalSupply = await erc20Portal.methods.totalSupply().call();
    let new_marketCap = new BigNumber(new_totalSupply).dividedBy(10**newDecimals).toFixed(2);

    const epochNum1 = new Date(tokenLocksArr[3] * 1000);
    let unlockDate = epochNum1.toLocaleString();

    const epochNum2 = new Date(tokenLocksArr[0] * 1000);
    let lockDate = epochNum2.toLocaleString();


    let db_connect = dbo.getDb("myFirstDatabase");
    await db_connect.collection("lastIndexes").findOne({Locker: "UnicryptETH"}).then(function(result) {
      lastIndex = result;
    });
    console.log(lastIndex);

    if (lastIndex === null) {
      await db_connect.collection("lastIndexes").insertOne({Locker: "UnicryptETH", LastId: total_tokenNums});
      console.log(nativeAmount, newAmount);

      let myobj = {
        PairToken: tokenData0.symbol + " / " + tokenData1.symbol,
        Blockchain: "Ethereum",
        Liquidity_Percentage: percentage.toFixed(3),
        Tokens_Locked: newAmount,
        Locked_Date: lockDate,
        Time_to_unlock: unlockDate,
        Locker: "Unicrypt",
        Marketcap: new_marketCap,
        Coingecko_Rank: "—",
        Token_TotalAmount: new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
        PairTokenAddress: tokenAddrsArr,
        TokenName: storingTokenName,
        TokenAddress: storingTokenAddr,
        NativeSymbol: nativeSymbol,
        NativeAmount: nativeAmount,
        NativeDecimals: nativeDecimals,
        NativeIndex: nativeIndex,
        NewDecimals: newDecimals
      };
      await db_connect.collection("records").insertOne(myobj);
    } else if (lastIndex.LastId >= total_tokenNums) {
      console.log(nativeAmount, newAmount);

      await db_connect.collection("records").updateOne({PairTokenAddress: tokenAddrsArr}, {$set: {
        PairToken: tokenData0.symbol + " / " + tokenData1.symbol,
        Blockchain: "Ethereum",
        Liquidity_Percentage: percentage.toFixed(3),
        Tokens_Locked: newAmount,
        Locked_Date: lockDate,
        Time_to_unlock: unlockDate,
        Locker: "Unicrypt",
        Marketcap: new_marketCap,
        Coingecko_Rank: "—",
        Token_TotalAmount: new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
        PairTokenAddress: tokenAddrsArr,
        TokenName: storingTokenName,
        TokenAddress: storingTokenAddr,
        NativeSymbol: nativeSymbol,
        NativeAmount: nativeAmount,
        NativeDecimals: nativeDecimals,
        NativeIndex: nativeIndex,
        NewDecimals: newDecimals
      }});
    } else {
      await db_connect.collection("lastIndexes").updateOne({Locker: "UnicryptETH"}, {$set: {LastId: total_tokenNums}});
      console.log(nativeAmount, newAmount);

      let myobj = {
        PairToken: tokenData0.symbol + " / " + tokenData1.symbol,
        Blockchain: "Ethereum",
        Liquidity_Percentage: percentage.toFixed(3),
        Tokens_Locked: newAmount,
        Locked_Date: lockDate,
        Time_to_unlock: unlockDate,
        Locker: "Unicrypt",
        Marketcap: new_marketCap,
        Coingecko_Rank: "—",
        Token_TotalAmount: new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
        PairTokenAddress: tokenAddrsArr,
        TokenName: storingTokenName,
        TokenAddress: storingTokenAddr,
        NativeSymbol: nativeSymbol,
        NativeAmount: nativeAmount,
        NativeDecimals: nativeDecimals,
        NativeIndex: nativeIndex,
        NewDecimals: newDecimals
      };
      await db_connect.collection("records").insertOne(myobj);
    }
  });
}
