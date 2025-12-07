import { fetchNodeInfo, fetchBalances } from "@/lib/bark/queries";

export default async function Home() {
  // TEMP: Log data to the terminal to verify DAL
  const info = await fetchNodeInfo();
  const balances = await fetchBalances();
  
  console.log("--------------------------------");
  console.log("🔍 DAL VERIFICATION LOG:");
  console.log("Info:", JSON.stringify(info, null, 2));
  console.log("Balances:", JSON.stringify(balances, null, 2));
  console.log("--------------------------------");

  return <main>Check Terminal for Logs</main>;
}