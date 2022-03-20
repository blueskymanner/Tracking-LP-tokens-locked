const getBSCWeb3 = require('../utils/getBSCweb3.js');
const unicryptBSCabi = require('../abi/unicryptBSC_abi.json');
const pancakeswapBSCabi = require('../abi/pancakeswapBSC_abi.json');
const bep20abi = require('../abi/bep20.json');
const multicallBSC = require('./multicallBSC.js');
const BigNumber = require("bignumber.js");
const fetch = require("node-fetch");
const cron = require("node-cron");
const dbo = require("../db/conn");
const Axios = require('axios');


const unicryptAddressBSC = "0xC765bddB93b0D1c1A88282BA0fa6B2d00E3e0c83";

module.exports = async function UnicryptBSC() {

  const web3 = getBSCWeb3();
  const unicryptBSCPortal = new web3.eth.Contract(unicryptBSCabi, unicryptAddressBSC);

  cron.schedule('* * * * *', async () => {
    let total_tokenNums = await unicryptBSCPortal.methods.getNumLockedTokens().call();
    
    let tokenData0;
    let tokenData1;
    let datainfo0;
    let datainfo1;
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

    const tokenAddrsArr = await unicryptBSCPortal.methods.getLockedTokenAtIndex(total_tokenNums - 1).call();
    const tokenLocksArr = await unicryptBSCPortal.methods.tokenLocks(tokenAddrsArr, 0).call();

    LPtokens.push({address: tokenAddrsArr, name: "token0"});
    LPtokens.push({address: tokenAddrsArr, name: "token1"});
    LPtokens.push({address: tokenAddrsArr, name: "decimals"});
    LPtokens.push({address: tokenAddrsArr, name: "getReserves"});
    LPtokens.push({address: tokenAddrsArr, name: "totalSupply"});

    const LPtokensArr = await multicallBSC(pancakeswapBSCabi, LPtokens);

    try {
    await fetch('https://api.thegraph.com/subgraphs/name/pancakeswap/pairs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
        query {
          token(id: "${LPtokensArr[0][0].toLowerCase()}"){
            decimals
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
    await fetch('https://api.thegraph.com/subgraphs/name/pancakeswap/pairs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
        query {
          token(id: "${LPtokensArr[1][0].toLowerCase()}"){
            decimals
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

    let apiurl0 = `https://api.pancakeswap.info/api/v2/tokens/${LPtokensArr[0][0]}`;
    try {
      await Axios.get(apiurl0).then(entry => 
        datainfo0 = entry);
        // console.log(datainfo0.data.data.symbol);
    } catch(err) {
      console.log("Finding a first token info on pancakeswap API.");
      return;
    }

    let apiurl1 = `https://api.pancakeswap.info/api/v2/tokens/${LPtokensArr[1][0]}`;
    try {
      await Axios.get(apiurl1).then(entry => 
        datainfo1 = entry);
        // console.log(datainfo1.data.data.symbol);
    } catch(err) {
      console.log("Finding a second token info on pancakeswap API.");
      return;
    }

    let percentage = new BigNumber(tokenLocksArr[1]).dividedBy(10**LPtokensArr[2][0]).dividedBy(new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]));
    let token0Price = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(new BigNumber(datainfo0.data.data.price));
    let token1Price = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(new BigNumber(datainfo1.data.data.price));

    if (datainfo0.data.data.symbol == "WETH" || datainfo0.data.data.symbol == "WBNB" || datainfo0.data.data.symbol == "BUSD" || datainfo0.data.data.symbol == "USDT" || datainfo0.data.data.symbol == "USDC") {
      storingTokenName = datainfo1.data.data.name;
      storingTokenAddr = LPtokensArr[1][0];
      newDecimals = tokenData1.decimals;
      nativeDecimals = tokenData0.decimals;
      nativeIndex = "token0";
      nativeSymbol = datainfo0.data.data.symbol;
      nativeAmount = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(percentage).toFixed(4);
      newAmount = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(percentage).toFixed(2);
    } else if (datainfo1.data.data.symbol == "WETH" || datainfo1.data.data.symbol == "WBNB" || datainfo1.data.data.symbol == "BUSD" || datainfo1.data.data.symbol == "USDT" || datainfo1.data.data.symbol == "USDC") {
      storingTokenName = datainfo0.data.data.name;
      storingTokenAddr = LPtokensArr[0][0];
      newDecimals = tokenData0.decimals;
      nativeDecimals = tokenData1.decimals;
      nativeIndex = "token1";
      nativeSymbol = datainfo1.data.data.symbol;
      nativeAmount = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(percentage).toFixed(4);
      newAmount = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(percentage).toFixed(2);
    }

    const bep20Portal = new web3.eth.Contract(bep20abi, storingTokenAddr);
    let new_totalSupply = await bep20Portal.methods.totalSupply().call();
    let new_marketCap = new BigNumber(new_totalSupply).dividedBy(10**newDecimals).toFixed(2);

    const epochNum1 = new Date(tokenLocksArr[3] * 1000);
    let unlockDate = epochNum1.toLocaleString();

    const epochNum2 = new Date(tokenLocksArr[0] * 1000);
    let lockDate = epochNum2.toLocaleString();


    let db_connect = dbo.getDb("myFirstDatabase");
    await db_connect.collection("lastIndexes").findOne({Locker: "UnicryptBSC"}).then(function(result) {
      lastIndex = result;
    });
    console.log(lastIndex);

    if (lastIndex === null) {
      await db_connect.collection("lastIndexes").insertOne({Locker: "UnicryptBSC", LastId: total_tokenNums});
      let myobj = {
        PairToken: datainfo0.data.data.symbol + " / " + datainfo1.data.data.symbol,
        Blockchain: "BSC",
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
        NativeIndex: nativeIndex
      };
      await db_connect.collection("records").insertOne(myobj);
    } else if (lastIndex.LastId >= total_tokenNums) {
      await db_connect.collection("records").updateOne({PairTokenAddress: tokenAddrsArr}, {$set: {
        PairToken: datainfo0.data.data.symbol + " / " + datainfo1.data.data.symbol,
        Blockchain: "BSC",
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
        NativeIndex: nativeIndex
      }});
    } else {
      await db_connect.collection("lastIndexes").updateOne({Locker: "UnicryptBSC"}, {$set: {LastId: total_tokenNums}});
      let myobj = {
        PairToken: datainfo0.data.data.symbol + " / " + datainfo1.data.data.symbol,
        Blockchain: "BSC",
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
        NativeIndex: nativeIndex
      };
      await db_connect.collection("records").insertOne(myobj);
    }
  });
}
