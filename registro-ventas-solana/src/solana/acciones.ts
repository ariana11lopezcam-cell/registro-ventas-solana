import {
  address,
  createNoopSigner,
  type Instruction,
} from '@solana/kit';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import {
  getCrearRegistroInstruction,
  getCrearClienteInstruction,
  getRegistrarVentaInstruction,
  getCambiarMontoInstruction,
  getHacerDevolucionInstruction,
  fetchMaybeRegistro,
} from '../../clients';
import { DEVNET_ENDPOINT, rpc } from './conexion';
import {
  obtenerPdaRegistro,
  obtenerPdaCliente,
  obtenerPdaVenta,
} from './lecturas';

const encoder = new TextEncoder();

function validarTexto(texto: string, maxBytes: number, campo: string) {
  const limpio = texto.trim();
  if (!limpio) throw new Error(`El campo "${campo}" no puede estar vacío.`);
  if (encoder.encode(limpio).length > maxBytes) {
    throw new Error(`"${campo}" excede el máximo de ${maxBytes} bytes.`);
  }
  return limpio;
}

async function enviarInstruccion(
  wallet: WalletContextState,
  ix: Instruction
): Promise<string> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Conecta tu wallet antes de realizar operaciones.');
  }

  const connection = new Connection(DEVNET_ENDPOINT, 'confirmed');
  const legacyIx = new TransactionInstruction({
    programId: new PublicKey(ix.programAddress),
    keys: (ix.accounts ?? []).map((acc) => ({
      pubkey: new PublicKey(acc.address),
      isSigner: acc.role === 2 || acc.role === 3,
      isWritable: acc.role === 1 || acc.role === 3,
    })),
    data: Buffer.from(ix.data ?? new Uint8Array()),
  });

  const tx = new Transaction().add(legacyIx);
  const firma = await wallet.sendTransaction(tx, connection);
  await connection.confirmTransaction(firma, 'confirmed');
  return firma;
}

export async function ejecutarCrearRegistro(
  wallet: WalletContextState,
  nombreNegocio: string
) {
  const negocioValido = validarTexto(nombreNegocio, 30, 'Nombre del negocio');
  const owner = createNoopSigner(address(wallet.publicKey!.toBase58()));
  const registro = await obtenerPdaRegistro(negocioValido, owner.address);

  const ix = getCrearRegistroInstruction({
    owner,
    registro,
    nombreNegocio: negocioValido,
  });

  return enviarInstruccion(wallet, ix);
}

export async function ejecutarCrearCliente(
  wallet: WalletContextState,
  nombreNegocio: string,
  nombreCliente: string
) {
  const negocioValido = validarTexto(nombreNegocio, 30, 'Nombre del negocio');
  const nombreValido = validarTexto(nombreCliente, 30, 'Nombre del cliente');
  const owner = createNoopSigner(address(wallet.publicKey!.toBase58()));
  const registro = await obtenerPdaRegistro(negocioValido, owner.address);

  const cuentaReg = await fetchMaybeRegistro(rpc, registro);
  if (!cuentaReg.exists) {
    throw new Error('El registro del negocio no existe. Créalo primero.');
  }

  const siguienteId = cuentaReg.data.contadorClientes + 1;
  const cliente = await obtenerPdaCliente(registro, siguienteId);

  const ix = getCrearClienteInstruction({
    owner,
    registro,
    cliente,
    nombre: nombreValido,
  });

  return enviarInstruccion(wallet, ix);
}

export async function ejecutarRegistrarVenta(
  wallet: WalletContextState,
  nombreNegocio: string,
  idCliente: number,
  sku: string,
  descripcion: string,
  monto: number
) {
  const negocioValido = validarTexto(nombreNegocio, 30, 'Nombre del negocio');
  const skuValido = validarTexto(sku, 5, 'SKU');
  const descValida = validarTexto(descripcion, 50, 'Descripción');
  if (idCliente < 1 || idCliente > 65535) throw new Error('ID de cliente inválido.');
  if (monto <= 0 || monto > 4294967295) throw new Error('Monto inválido.');

  const owner = createNoopSigner(address(wallet.publicKey!.toBase58()));
  const registro = await obtenerPdaRegistro(negocioValido, owner.address);
  const cliente = await obtenerPdaCliente(registro, idCliente);
  const venta = await obtenerPdaVenta(cliente, skuValido);

  const ix = getRegistrarVentaInstruction({
    owner,
    registro,
    cliente,
    venta,
    idCliente,
    sku: skuValido,
    descripcion: descValida,
    monto,
  });

  return enviarInstruccion(wallet, ix);
}

export async function ejecutarCambiarMonto(
  wallet: WalletContextState,
  nombreNegocio: string,
  idCliente: number,
  sku: string,
  nuevoMonto: number
) {
  const negocioValido = validarTexto(nombreNegocio, 30, 'Nombre del negocio');
  const skuValido = validarTexto(sku, 5, 'SKU');
  if (nuevoMonto <= 0 || nuevoMonto > 4294967295) throw new Error('Nuevo monto inválido.');

  const owner = createNoopSigner(address(wallet.publicKey!.toBase58()));
  const registro = await obtenerPdaRegistro(negocioValido, owner.address);
  const cliente = await obtenerPdaCliente(registro, idCliente);
  const venta = await obtenerPdaVenta(cliente, skuValido);

  const ix = getCambiarMontoInstruction({
    owner,
    registro,
    cliente,
    venta,
    idCliente,
    sku: skuValido,
    nuevoMonto,
  });

  return enviarInstruccion(wallet, ix);
}

export async function ejecutarHacerDevolucion(
  wallet: WalletContextState,
  nombreNegocio: string,
  idCliente: number,
  sku: string
) {
  const negocioValido = validarTexto(nombreNegocio, 30, 'Nombre del negocio');
  const skuValido = validarTexto(sku, 5, 'SKU');

  const owner = createNoopSigner(address(wallet.publicKey!.toBase58()));
  const registro = await obtenerPdaRegistro(negocioValido, owner.address);
  const cliente = await obtenerPdaCliente(registro, idCliente);
  const venta = await obtenerPdaVenta(cliente, skuValido);

  const ix = getHacerDevolucionInstruction({
    owner,
    registro,
    cliente,
    venta,
    idCliente,
    sku: skuValido,
  });

  return enviarInstruccion(wallet, ix);
}