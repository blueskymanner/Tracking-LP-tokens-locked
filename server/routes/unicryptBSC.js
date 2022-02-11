const getBSCWeb3 = require('../utils/getBSCweb3.js');
const unicryptBSCabi = require('../abi/unicryptBSC_abi.json');
const pancakeswapBSCabi = require('../abi/pancakeswapBSC_abi.json');
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

    if (datainfo0.data.data.symbol == "WBNB" || datainfo0.data.data.symbol == "BUSD" || datainfo0.data.data.symbol == "USDT" || datainfo0.data.data.symbol == "USDC") {
      storingTokenName = datainfo1.data.data.name;
      storingTokenAddr = LPtokensArr[1][0];
    } else if (datainfo1.data.data.symbol == "WBNB" || datainfo1.data.data.symbol == "BUSD" || datainfo1.data.data.symbol == "USDT" || datainfo1.data.data.symbol == "USDC") {
      storingTokenName = datainfo0.data.data.name;
      storingTokenAddr = LPtokensArr[0][0];
    }

    let percentage = new BigNumber(tokenLocksArr[1]).dividedBy(10**LPtokensArr[2][0]).dividedBy(new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]));
    let token0Price = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(new BigNumber(datainfo0.data.data.price));
    let token1Price = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(new BigNumber(datainfo1.data.data.price));

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
      db_connect.collection("lastIndexes").insertOne({Locker: "UnicryptBSC", LastId: total_tokenNums}).then(function(res) {

      });
      let myobj = {
        PairToken: datainfo0.data.data.symbol + " / " + datainfo1.data.data.symbol,
        Blockchain: "BSC",
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
      db_connect.collection("lastIndexes").updateOne({Locker: "UnicryptBSC"}, {$set: {LastId: total_tokenNums}}).then(function(res) {

      });
      let myobj = {
        PairToken: datainfo0.data.data.symbol + " / " + datainfo1.data.data.symbol,
        Blockchain: "BSC",
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
