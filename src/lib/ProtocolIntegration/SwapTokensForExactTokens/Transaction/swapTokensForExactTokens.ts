import Web3 from "web3";
import {TransactionReceipt} from "web3-eth";
import {TransactionConfig} from "web3-core";
import { AbiItem } from 'web3-utils';
import * as dotenv from "dotenv";
import {ISwapTokensForExactTokensDataModel} from "../Model/swapTokensForExactTokensDataModel";
import {ISwapTokensForExactTokensTransactionModel} from "../Model/SwapTokensForExactTokensTransactionModel";
//Configuring the directory path to access .env file
dotenv.config();

//Accessing UniswapV3Router contract's ABI
const UniswapV2Router02ABI = require('../../../abi/UniswapV2Router02ABI.json');
let receiptPromise: Promise<TransactionReceipt>;


export const SwapTokensForExactTokensAsync = async(swapTokensForExactTokensDataModel:ISwapTokensForExactTokensDataModel, swapTokensForExactTokensTransactionModel:ISwapTokensForExactTokensTransactionModel) : Promise<TransactionReceipt>=> {

  // Object creation of Assets
  // Setting up Ethereum blockchain Node through Infura
  const web3 = new Web3(process.env.infuraUrlRinkeby!);
  //Providing Private Key
  const activeAccount = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY!);
  
  // Initialising the Uniswap Router Contract
  const uniswapV2Router02Contract = new web3.eth.Contract(UniswapV2Router02ABI as AbiItem[], process.env.UniswapV2RinkebyRouter02Address);

  //Setting up the deadline for the transaction
  const expiryDate = Math.floor(Date.now() / 1000) + 900;

  //Get WETH address
  const WETH_ADDRESS = await uniswapV2Router02Contract.methods.WETH().call();
  
  // Array of tokens addresses

  const pairArray = [swapTokensForExactTokensDataModel.TokenIn,WETH_ADDRESS, swapTokensForExactTokensDataModel.TokenOut];

  console.log("In Token: ",swapTokensForExactTokensDataModel.TokenIn);
  
  const amountsInMax = web3.utils.toWei(swapTokensForExactTokensDataModel.AmountIn?.toString()!);
  console.log("Amount In Max: ", amountsInMax);

  console.log("Amounts In : ", swapTokensForExactTokensDataModel.AmountIn);

  //get Token Out amount
  const ethOut = await uniswapV2Router02Contract.methods.getAmountsOut(web3.utils.toWei(swapTokensForExactTokensDataModel.AmountIn?.toString()!), [swapTokensForExactTokensDataModel.TokenIn,WETH_ADDRESS]).call();
  console.log("Eth Out:", ethOut[1]);

  console.log("Out Address:", swapTokensForExactTokensDataModel.TokenOut);
  const amountsOut    = await uniswapV2Router02Contract.methods.getAmountsOut(ethOut[1], [WETH_ADDRESS,swapTokensForExactTokensDataModel.TokenOut]).call();
 // const amountsOut = await uniswapV2Router02Contract.methods.getAmountsOut(ethOut[1], pairArray).call();
  console.log("Amounts Out: ", amountsOut[1]);
  // Setting up slippage
  const slippage = swapTokensForExactTokensDataModel.Slippage;
  console.log("Slippage Value : ",slippage);
  let amountsOutFinal =
    parseFloat(web3.utils.fromWei(amountsOut[1])) -
    (parseFloat(web3.utils.fromWei(amountsOut[1])) * slippage!);

    console.log("amountsOutFinal: ", amountsOutFinal);

   const amountsOutFinalBN =web3.utils.toBN(web3.utils.toWei(amountsOutFinal.toFixed(18).toString()));
    console.log("Amounts Out Final BN : ", amountsOutFinalBN);

  // It will be used as count for Nonce
  const txCount = await web3.eth.getTransactionCount(activeAccount.address);
  console.log("Nonce + : ",txCount);
  
   console.log("Pair Array",pairArray);


    let tx_builder: any;


    // let receiptObj:TransactionReceipt;

    tx_builder = uniswapV2Router02Contract.methods.swapTokensForExactTokens(amountsOutFinalBN, amountsInMax, pairArray,activeAccount.address, expiryDate);
    //let result = await exchangeContract.methods.swapETHForExactTokens(tokenAmount[1].toString(), pairArray, SETTINGS.from, DEADLINE).send(SETTINGS)

    let encoded_tx = tx_builder.encodeABI();

    // Creating transaction object to pass it through "signTransaction"
    let transactionObject: TransactionConfig = {
      nonce: txCount,
      gas: swapTokensForExactTokensTransactionModel.gasLimit ?? 4300000, // gas fee needs updating?
      gasPrice: swapTokensForExactTokensTransactionModel.gasPrice ?? 4200000000,
      data: encoded_tx,
      from: activeAccount.address,
      to: process.env.UniswapV2RinkebyRouter02Address,
    };


  //Returning receipt for "signTransaction"
  receiptPromise = new Promise<TransactionReceipt>((resolve,reject)=>{

    try {

        let receiptObj:TransactionReceipt;
        web3.eth.accounts.signTransaction(transactionObject, activeAccount.privateKey, (error, signedTx) => {
          if (error) {
            console.log(error);
            reject(error);
          } else {
            web3.eth.sendSignedTransaction(signedTx.rawTransaction!).on('receipt', (receipt) => {
              console.log("Receipt : ",receipt);
              receiptObj=receipt;

                  });
                }
                resolve(receiptObj ?? null);
              });

          } catch (error) {
            reject(error);
            throw(error);
          }

    });

  //return receiptPromise;
  
  
return receiptPromise;

}



