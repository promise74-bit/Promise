import WalletCallbackClient from './WalletCallbackClient';

export default async function WalletCallbackPage({searchParams}:{searchParams:Promise<{reference?:string;trxref?:string}>}){
  const params=await searchParams;
  return <WalletCallbackClient reference={params.reference??params.trxref??''}/>;
}
