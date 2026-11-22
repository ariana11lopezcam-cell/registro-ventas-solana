import { useState } from 'react';
import { address } from '@solana/kit';
import { rpc } from '../solana/conexion';

const LAMPORTS_POR_SOL = 1_000_000_000;

export function ConsultaSaldo() {
  const [direccionInput, setDireccionInput] = useState('');
  const [saldo, setSaldo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consultar = async () => {
    setError(null);
    setSaldo(null);
    try {
      const pubkey = address(direccionInput.trim());
      const res = await rpc.getBalance(pubkey).send();
      const soles = Number(res.value) / LAMPORTS_POR_SOL;
      setSaldo(`${soles.toFixed(4)} SOL`);
    } catch {
      setError('Dirección inválida o error al consultar RPC.');
    }
  };

  return (
    <section style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
      <h3>Consulta Pública de Saldo (Devnet)</h3>
      <input
        type="text"
        placeholder="Dirección pública (Pubkey)"
        value={direccionInput}
        onChange={(e) => setDireccionInput(e.target.value)}
        style={{ width: '320px', marginRight: '0.5rem' }}
      />
      <button onClick={consultar}>Consultar Saldo</button>
      {saldo && <p>Saldo: <strong>{saldo}</strong></p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </section>
  );
}