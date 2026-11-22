import { createSolanaRpc } from '@solana/kit';

export const DEVNET_ENDPOINT = 'https://api.devnet.solana.com';
export const rpc = createSolanaRpc(DEVNET_ENDPOINT);