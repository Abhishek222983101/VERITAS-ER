const { Connection, PublicKey } = require('@solana/web3.js');
const { AnchorProvider, Program, BorshCoder } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL);

const IDL = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../veritas-oracle/target/idl/veritas_oracle.json'), 'utf-8'));
const programId = new PublicKey(IDL.address);

async function main() {
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
  console.log('Config PDA:', configPda.toBase58());
  
  try {
    const acc = await connection.getAccountInfo(configPda);
    if (!acc) {
      console.log('Account not found');
      return;
    }
    
    const coder = new BorshCoder(IDL);
    const config = coder.accounts.decode('Config', acc.data);
    console.log('Config:', JSON.stringify(config, (k, v) => {
      if (v && v.toBase58) return v.toBase58();
      if (v && typeof v === 'bigint') return v.toString();
      return v;
    }, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main();
