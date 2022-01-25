// import React, {useEffect, useState} from "react";
// import { ethers } from "ethers";
// import unicryptETHabi from "../abi/unicrypt_abi.json";

// const Getdata = async () => {

//     const unicryptAddressETH = "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214";

//     const get_gFees = async () => {
//         try {
//             const { ethereum } = window;
//             if (ethereum) {
//               const provider = new ethers.providers.Web3Provider(ethereum);
//               const signer = provider.getSigner();
//               const gFeesPortal = new ethers.Contract(unicryptAddressETH, unicryptETHabi, signer);
      
//               /*
//                * Call the gFees variable from Smart Contract
//                */
//               const gFees = await gFeesPortal.getNumLockedTokens();
//               return gFees;

//             } else {
//               console.log("Ethereum object doesn't exist!")
//             }
//         } catch (error) {
//             console.log(error);
//         }
//     }

// }

// export default Getdata;



import React, {useEffect, useState} from "react";
import { ethers } from "ethers";
import unicryptETHabi from "../abi/unicrypt_abi.json";

    const unicryptAddressETH = "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214";

    const get_gFees = async () => {
        let provider = ethers.getDefaultProvider();

        const gFeesPortal = new ethers.Contract(unicryptAddressETH, unicryptETHabi, provider);

        const gFees = await gFeesPortal.getNumLockedTokens();
        
        return gFees;
    }


export default get_gFees;