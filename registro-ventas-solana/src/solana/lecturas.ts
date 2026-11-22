import {
  address,
  getAddressEncoder,
  getProgramDerivedAddress,
  getUtf8Encoder,
  type Address,
} from '@solana/kit';
import { rpc } from './conexion';
import {
  REGISTRO_VENTAS_PROGRAM_ADDRESS,
  fetchMaybeRegistro,
  fetchAllCliente,
  fetchAllVenta,
} from '../../clients';

export interface VentaUI {
  direccion: string;
  sku: string;
  descripcion: string;
  monto: number;
}

export interface ClienteUI {
  direccion: string;
  id: number;
  nombre: string;
  compras: number;
  totalGastado: number;
  ventas: VentaUI[];
}

export interface RegistroUI {
  direccion: string;
  owner: string;
  nombreNegocio: string;
  contadorClientes: number;
  ingresosTotales: number;
  clientes: ClienteUI[];
}

const utf8 = getUtf8Encoder();
const addrEncoder = getAddressEncoder();

export async function obtenerPdaRegistro(nombreNegocio: string, owner: Address) {
  const [pda] = await getProgramDerivedAddress({
    programAddress: REGISTRO_VENTAS_PROGRAM_ADDRESS,
    seeds: [
      utf8.encode('registro'),
      utf8.encode(nombreNegocio),
      addrEncoder.encode(owner),
    ],
  });
  return pda;
}

export async function obtenerPdaCliente(registro: Address, id: number) {
  const idBuffer = new Uint8Array(2);
  new DataView(idBuffer.buffer).setUint16(0, id, true);

  const [pda] = await getProgramDerivedAddress({
    programAddress: REGISTRO_VENTAS_PROGRAM_ADDRESS,
    seeds: [utf8.encode('cliente'), addrEncoder.encode(registro), idBuffer],
  });
  return pda;
}

export async function obtenerPdaVenta(cliente: Address, sku: string) {
  const [pda] = await getProgramDerivedAddress({
    programAddress: REGISTRO_VENTAS_PROGRAM_ADDRESS,
    seeds: [utf8.encode('venta'), addrEncoder.encode(cliente), utf8.encode(sku)],
  });
  return pda;
}

export async function leerRegistroCompleto(
  nombreNegocio: string,
  ownerStr: string
): Promise<RegistroUI | null> {
  const owner = address(ownerStr);
  const pdaRegistro = await obtenerPdaRegistro(nombreNegocio, owner);
  const cuentaRegistro = await fetchMaybeRegistro(rpc, pdaRegistro);

  if (!cuentaRegistro.exists) {
    return null;
  }

  const cuentasClientes = await fetchAllCliente(rpc, cuentaRegistro.data.clientes);
  const clientesUI: ClienteUI[] = [];

  for (const c of cuentasClientes) {
    const cuentasVentas = await fetchAllVenta(rpc, c.data.historial);
    const ventasUI: VentaUI[] = cuentasVentas.map((v) => ({
      direccion: v.address,
      sku: v.data.sku,
      descripcion: v.data.descripcion,
      monto: v.data.monto,
    }));

    clientesUI.push({
      direccion: c.address,
      id: c.data.id,
      nombre: c.data.nombre,
      compras: c.data.compras,
      totalGastado: Number(c.data.totalGastado),
      ventas: ventasUI,
    });
  }

  return {
    direccion: cuentaRegistro.address,
    owner: cuentaRegistro.data.owner,
    nombreNegocio: cuentaRegistro.data.nombreNegocio,
    contadorClientes: cuentaRegistro.data.contadorClientes,
    ingresosTotales: Number(cuentaRegistro.data.ingresosTotales),
    clientes: clientesUI,
  };
}