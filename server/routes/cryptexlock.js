const getBSCWeb3 = require('../utils/getBSCweb3.js');
const cryptexlockabi = require('../abi/cryptexlock_abi.json');
const pancakeswapBSCabi = require('../abi/pancakeswapBSC_abi.json');
const BigNumber = require("bignumber.js");
const multicallBSC = require('./multicallBSC.js');
const fetch = require("node-fetch");
const cron = require("node-cron");
const dbo = require("../db/conn");
const Axios = require('axios');


const cryptexlockAddr = "0xe0c3ab2c69d8b43d8B0D922aFa224A0AB6780dE1";

module.exports = async function CryptexLock() {

    const web3 = getBSCWeb3();
    const cryptexlockPortal = new web3.eth.Contract(cryptexlockabi, cryptexlockAddr);

    cron.schedule('* * * * *', async () => {
        let total_tokenNums = await cryptexlockPortal.methods.lockNonce().call();

        let tokenData0;
        let tokenData1;
        let datainfo0;
        let datainfo1;
        let LPtokens = [];

        let lastIndex;
        let storingTokenName;
        let storingTokenAddr;

        let isData;
        let LPtokensArr;
        let tokenLocksArr = await cryptexlockPortal.methods.tokenLocks(total_tokenNums - 1).call();
        let pancakeApiurl = `https://api.pancakeswap.info/api/v2/tokens/${tokenLocksArr[0]}`;
        try {
            await Axios.get(pancakeApiurl).then(entry => isData = entry);
        } catch(err) {
            LPtokens.push({address: tokenLocksArr[0], name: "token0"});
            LPtokens.push({address: tokenLocksArr[0], name: "token1"});
            LPtokens.push({address: tokenLocksArr[0], name: "decimals"});
            LPtokens.push({address: tokenLocksArr[0], name: "getReserves"});
            LPtokens.push({address: tokenLocksArr[0], name: "totalSupply"});
        }

        if(isData) { return; }

        try {
            LPtokensArr = await multicallBSC(pancakeswapBSCabi, LPtokens);
        } catch (err) {
            return;
        }

        let apiurl0 = `https://api.pancakeswap.info/api/v2/tokens/${LPtokensArr[0][0]}`;
        try {
            await Axios.get(apiurl0).then(entry => 
            datainfo0 = entry);
        } catch(err) {
            console.log("Finding a first token info on pancakeswap API.");
            return;
        }

        let apiurl1 = `https://api.pancakeswap.info/api/v2/tokens/${LPtokensArr[1][0]}`;
        try {
            await Axios.get(apiurl1).then(entry => 
            datainfo1 = entry);
        } catch(err) {
            console.log("Finding a second token info on pancakeswap API.");
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

        if (datainfo0.data.data.symbol == "WBNB" || datainfo0.data.data.symbol == "BUSD" || datainfo0.data.data.symbol == "USDT" || datainfo0.data.data.symbol == "USDC") {
            storingTokenName = datainfo1.data.data.name;
            storingTokenAddr = LPtokensArr[1][0];
        } else if (datainfo1.data.data.symbol == "WBNB" || datainfo1.data.data.symbol == "BUSD" || datainfo1.data.data.symbol == "USDT" || datainfo1.data.data.symbol == "USDC") {
            storingTokenName = datainfo0.data.data.name;
            storingTokenAddr = LPtokensArr[0][0];
        }

        let percentage = new BigNumber(tokenLocksArr[2]).dividedBy(10**LPtokensArr[2][0]).dividedBy(new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]));
        let token0Price = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(new BigNumber(datainfo0.data.data.price));
        let token1Price = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(new BigNumber(datainfo1.data.data.price));

        const epochNum1 = new Date(tokenLocksArr[3] * 1000);
        let unlockDate = epochNum1.toLocaleString();

        const epochNum2 = new Date();
        let lockDate = epochNum2.toLocaleString();


        let db_connect = dbo.getDb("myFirstDatabase");
        await db_connect.collection("lastIndexes").findOne({Locker: "CryptexLock"}).then(function(result) {
            lastIndex = result;
        });
        console.log(lastIndex);

        if (lastIndex === null) {
            await db_connect.collection("lastIndexes").insertOne({Locker: "CryptexLock", LastId: total_tokenNums});
            let myobj = {
                PairToken: datainfo0.data.data.symbol + " / " + datainfo1.data.data.symbol,
                Blockchain: "BSC",
                Liquidity_Locked: token0Price.plus(token1Price).multipliedBy(percentage).toFixed(0), 
                Tokens_Locked: new BigNumber(tokenLocksArr[2]).dividedBy(10**LPtokensArr[2][0]).toFixed(2), 
                Locked_Date: lockDate, 
                Time_to_unlock: unlockDate, 
                Locker: "CryptexLock",
                Marketcap: token0Price.plus(token1Price).toFixed(0), 
                Coingecko_Rank: "—", 
                Token_TotalAmount: new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
                PairTokenAddress: tokenLocksArr[0],
                TokenName: storingTokenName,
                TokenAddress: storingTokenAddr
            };
            await db_connect.collection("records").insertOne(myobj);
        } else if (lastIndex.LastId >= total_tokenNums) {
            return;
        } else {
            await db_connect.collection("lastIndexes").updateOne({Locker: "CryptexLock"}, {$set: {LastId: total_tokenNums}});
            let myobj = {
                PairToken: datainfo0.data.data.symbol + " / " + datainfo1.data.data.symbol,
                Blockchain: "BSC",
                Liquidity_Locked: token0Price.plus(token1Price).multipliedBy(percentage).toFixed(0), 
                Tokens_Locked: new BigNumber(tokenLocksArr[2]).dividedBy(10**LPtokensArr[2][0]).toFixed(2), 
                Locked_Date: lockDate, 
                Time_to_unlock: unlockDate, 
                Locker: "CryptexLock",
                Marketcap: token0Price.plus(token1Price).toFixed(0), 
                Coingecko_Rank: "—", 
                Token_TotalAmount: new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
                PairTokenAddress: tokenLocksArr[0],
                TokenName: storingTokenName,
                TokenAddress: storingTokenAddr
            };
            await db_connect.collection("records").insertOne(myobj);
        }
    });
}
