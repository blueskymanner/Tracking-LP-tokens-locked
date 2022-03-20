const getBSCWeb3 = require('../utils/getBSCweb3.js');
const deepLockerabi = require('../abi/deepLocker_abi.json');
const pancakeswapBSCabi = require('../abi/pancakeswapBSC_abi.json');
const bep20abi = require('../abi/bep20.json');
const BigNumber = require("bignumber.js");
const multicallBSC = require('./multicallBSC.js');
const fetch = require("node-fetch");
const cron = require("node-cron");
const dbo = require("../db/conn");
const Axios = require('axios');


const deepLockerAddr = "0x3f4D6bf08CB7A003488Ef082102C2e6418a4551e";

module.exports = async function DeepLocker() {

    const web3 = getBSCWeb3();
    const deepLockerPortal = new web3.eth.Contract(deepLockerabi, deepLockerAddr);

    cron.schedule('* * * * *', async () => {
        let total_tokenNums = await deepLockerPortal.methods.depositId().call();

        console.log(total_tokenNums);

        let tokenData0;
        let tokenData1;
        let datainfo0;
        let datainfo1;
        let LPtokens = [];

        let lastIndex;
        let storingTokenName;
        let storingTokenAddr;
        let newDecimals;
        let nativeSymbol;
        let nativeAmount;
        let newAmount;

        let isData;
        let LPtokensArr;
        let tokenLocksArr = await deepLockerPortal.methods.lockedToken(total_tokenNums).call();

        console.log(tokenLocksArr[0]);
        let pancakeApiurl = `https://api.pancakeswap.info/api/v2/tokens/${tokenLocksArr[0]}`;
        try {
            isData = await Axios.get(pancakeApiurl);
        } catch(err) {
            LPtokens.push({address: tokenLocksArr[0], name: "token0"});
            LPtokens.push({address: tokenLocksArr[0], name: "token1"});
            LPtokens.push({address: tokenLocksArr[0], name: "decimals"});
            LPtokens.push({address: tokenLocksArr[0], name: "getReserves"});
            LPtokens.push({address: tokenLocksArr[0], name: "totalSupply"});
        }

        console.log(isData,  "isData?");
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

        console.log(datainfo0.data.data.symbol, datainfo0.data.data.price, "datainfo0 symbol and price");
        let apiurl1 = `https://api.pancakeswap.info/api/v2/tokens/${LPtokensArr[1][0]}`;
        try {
            await Axios.get(apiurl1).then(entry => 
            datainfo1 = entry);
        } catch(err) {
            console.log("Finding a second token info on pancakeswap API.");
            return;
        }
        
        console.log(datainfo1.data.data.symbol, datainfo1.data.data.price, "datainfo1 symbold and price");
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

        console.log(tokenData0.decimals, "tokenData0.decimals");
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

        console.log(tokenData1.decimals, "tokenData1.decimals");

        let percentage = new BigNumber(tokenLocksArr[2]).dividedBy(10**LPtokensArr[2][0]).dividedBy(new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]));
        let token0Price = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(new BigNumber(datainfo0.data.data.price));
        let token1Price = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(new BigNumber(datainfo1.data.data.price));

        if (datainfo0.data.data.symbol == "WETH" || datainfo0.data.data.symbol == "WBNB" || datainfo0.data.data.symbol == "BUSD" || datainfo0.data.data.symbol == "USDT" || datainfo0.data.data.symbol == "USDC") {
            storingTokenName = datainfo1.data.data.name;
            storingTokenAddr = LPtokensArr[1][0];
            newDecimals = tokenData1.decimals;
            nativeSymbol = datainfo0.data.data.symbol;
            nativeAmount = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(percentage).toFixed(4);
            newAmount = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(percentage).toFixed(2);
        } else if (datainfo1.data.data.symbol == "WETH" || datainfo1.data.data.symbol == "WBNB" || datainfo1.data.data.symbol == "BUSD" || datainfo1.data.data.symbol == "USDT" || datainfo1.data.data.symbol == "USDC") {
            storingTokenName = datainfo0.data.data.name;
            storingTokenAddr = LPtokensArr[0][0];
            newDecimals = tokenData0.decimals;
            nativeSymbol = datainfo1.data.data.symbol;
            nativeAmount = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(percentage).toFixed(4);
            newAmount = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(percentage).toFixed(2);
        }

        const bep20Portal = new web3.eth.Contract(bep20abi, storingTokenAddr);
        let new_totalSupply = await bep20Portal.methods.totalSupply().call();
        let new_marketCap = new BigNumber(new_totalSupply).dividedBy(10**newDecimals).toFixed(2);

        const epochNum1 = new Date(tokenLocksArr[3] * 1000);
        let unlockDate = epochNum1.toLocaleString();

        const epochNum2 = new Date();
        let lockDate = epochNum2.toLocaleString();


        let db_connect = dbo.getDb("myFirstDatabase");
        await db_connect.collection("lastIndexes").findOne({Locker: "DeepLocker"}).then(function(result) {
            lastIndex = result;
        });
        console.log(lastIndex);

        if (lastIndex === null) {
            await db_connect.collection("lastIndexes").insertOne({Locker: "DeepLocker", LastId: total_tokenNums});
            
            let myobj = {
                PairToken: datainfo0.data.data.symbol + " / " + datainfo1.data.data.symbol,
                Blockchain: "BSC",
                Liquidity_Percentage: percentage.toFixed(3),
                Tokens_Locked: newAmount, 
                Locked_Date: lockDate, 
                Time_to_unlock: unlockDate, 
                Locker: "DeepLock",
                Marketcap: new_marketCap, 
                Coingecko_Rank: "—", 
                Token_TotalAmount: new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
                PairTokenAddress: tokenLocksArr[0],
                TokenName: storingTokenName,
                TokenAddress: storingTokenAddr,
                NativeSymbol: nativeSymbol,
                NativeAmount: nativeAmount
            };
            await db_connect.collection("records").insertOne(myobj);
            
        } else if (lastIndex.LastId >= total_tokenNums) {
            await db_connect.collection("records").updateOne({PairTokenAddress: tokenLocksArr[0]}, {$set: {
                PairToken: datainfo0.data.data.symbol + " / " + datainfo1.data.data.symbol,
                Blockchain: "BSC",
                Liquidity_Percentage: percentage.toFixed(3),
                Tokens_Locked: newAmount, 
                Locked_Date: lockDate, 
                Time_to_unlock: unlockDate, 
                Locker: "DeepLock",
                Marketcap: new_marketCap, 
                Coingecko_Rank: "—", 
                Token_TotalAmount: new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
                PairTokenAddress: tokenLocksArr[0],
                TokenName: storingTokenName,
                TokenAddress: storingTokenAddr,
                NativeSymbol: nativeSymbol,
                NativeAmount: nativeAmount
            }});
        } else {
            await db_connect.collection("lastIndexes").updateOne({Locker: "DeepLocker"}, {$set: {LastId: total_tokenNums}});
            
            let myobj = {
                PairToken: datainfo0.data.data.symbol + " / " + datainfo1.data.data.symbol,
                Blockchain: "BSC",
                Liquidity_Percentage: percentage.toFixed(3),
                Tokens_Locked: newAmount, 
                Locked_Date: lockDate, 
                Time_to_unlock: unlockDate, 
                Locker: "DeepLock",
                Marketcap: new_marketCap, 
                Coingecko_Rank: "—", 
                Token_TotalAmount: new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]).toFixed(2),
                PairTokenAddress: tokenLocksArr[0],
                TokenName: storingTokenName,
                TokenAddress: storingTokenAddr,
                NativeSymbol: nativeSymbol,
                NativeAmount: nativeAmount
            };
            await db_connect.collection("records").insertOne(myobj);
            
        }
    });
}
