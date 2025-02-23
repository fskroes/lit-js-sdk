import Uint8arrays from "../lib/uint8arrays";
const uint8arrayFromString = Uint8arrays.fromString;
const uint8arrayToString = Uint8arrays.toString;
import { throwError, log } from "../lib/utils";
import * as nacl from 'tweetnacl';

export const AUTH_SIGNATURE_BODY =
  "I am creating an account to use Lit Protocol at {{timestamp}}";

function getProvider() {
  if ("solana" in window) {
    return window.solana;
    // const provider = window.solana;
    // if (provider.isPhantom) {
    //   return provider;
    // }
  } else {
    throwError({
      message:
        "No web3 wallet was found that works with Solana.  Install a Solana wallet or choose another chain",
      name: "NoWalletException",
      errorCode: "no_wallet",
    });
  }
}

export async function connectSolProvider() {
  const provider = getProvider();
  await provider.connect();
  const account = provider.publicKey.toBase58();
  return { provider, account };
}

export async function checkAndSignSolAuthMessage({ chain }) {
  // Connect to cluster
  // const connection = new solWeb3.Connection(
  //   solWeb3.clusterApiUrl("devnet"),
  //   "confirmed"
  // );

  const { provider, account } = await connectSolProvider();

  let authSig = localStorage.getItem("lit-auth-sol-signature");
  if (!authSig) {
    log("signing auth message because sig is not in local storage");
    await signAndSaveAuthMessage({ provider, account });
    authSig = localStorage.getItem("lit-auth-sol-signature");
  }
  authSig = JSON.parse(authSig);

  if (account !== authSig.address) {
    log(
      "signing auth message because account is not the same as the address in the auth sig"
    );
    await signAndSaveAuthMessage({ provider, account });
    authSig = localStorage.getItem("lit-auth-sol-signature");
    authSig = JSON.parse(authSig);
  }

  log("authSig", authSig);

  return authSig;
}

export async function signAndSaveAuthMessage({ provider, account }) {
  const now = new Date().toISOString();
  const body = AUTH_SIGNATURE_BODY.replace("{{timestamp}}", now);

  const data = new TextEncoder().encode(body);
  const signed = await provider.signMessage(data, "utf8");

  const hexSig = uint8arrayToString(signed.signature, "base16");

  const authSig = {
    sig: hexSig,
    derivedVia: "solana.signMessage",
    signedMessage: body,
    address: provider.publicKey.toBase58(),
  };

  localStorage.setItem("lit-auth-sol-signature", JSON.stringify(authSig));
  return authSig;
}

export async function signSolAuthMessageAsNode(publicKey, messageToSign) {
  
  if (window) {
    throwError({
      message:
        "It looks like you are having access to window variable.",
      name: "UsingWrongMethodException",
      errorCode: "no_node_environment",
    });
  }

  log("signing auth message because sig based on your wallet");
  
  // Signing message
  const signature = nacl.sign.detached(Buffer.from(messageToSign, 'utf-8'), wallet.payer.secretKey);

  const hexSignature = uint8arrayToString(signature, 'base16');

  // AuthSig that is compatible with Lit nodes
  const authSig = {
    sig: hexSignature,
    derivedVia: "solana.signMessage",
    signedMessage: messageToSign,
    address: publicKey.toBase58()
  };

  return authSig;
}
