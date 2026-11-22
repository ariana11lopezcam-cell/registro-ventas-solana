import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ConsultaSaldo } from './components/ConsultaSaldo';
import { leerRegistroCompleto, type RegistroUI } from './solana/lecturas';
import {
  ejecutarCrearRegistro,
  ejecutarCrearCliente,
  ejecutarRegistrarVenta,
  ejecutarCambiarMonto,
  ejecutarHacerDevolucion,
} from './solana/acciones';

export default function App() {
  const wallet = useWallet();

  const [nombreNegocio, setNombreNegocio] = useState('Cafe WayLearn');
  const [ownerConsulta, setOwnerConsulta] = useState('');
  const [registro, setRegistro] = useState<RegistroUI | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [ultimaTx, setUltimaTx] = useState('');

  const [nombreCliente, setNombreCliente] = useState('');
  const [idClienteVenta, setIdClienteVenta] = useState(1);
  const [sku, setSku] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState(80);

  const [idClienteEdit, setIdClienteEdit] = useState(1);
  const [skuEdit, setSkuEdit] = useState('');
  const [nuevoMonto, setNuevoMonto] = useState(100);

  const consultarDatos = async () => {
    setMensaje('');
    try {
      const targetOwner = ownerConsulta.trim() || wallet.publicKey?.toBase58() || '';
      if (!targetOwner) throw new Error('Ingresa una dirección de owner o conecta tu wallet.');
      const data = await leerRegistroCompleto(nombreNegocio, targetOwner);
      setRegistro(data);
      if (!data) setMensaje('No existe un registro con ese nombre para ese owner.');
    } catch (e: any) {
      setMensaje(`Error: ${e.message}`);
    }
  };

  const manejarAccion = async (fn: () => Promise<string>, exitoMsg: string) => {
    setMensaje('Procesando transacción en Devnet...');
    try {
      const sig = await fn();
      setUltimaTx(sig);
      setMensaje(exitoMsg);
      await consultarDatos();
    } catch (e: any) {
      setMensaje(`Error: ${e.message}`);
    }
  };

  return (
    <main style={{ maxWidth: '850px', margin: '0 auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Registro de Ventas en Solana (Devnet)</h1>
        <WalletMultiButton />
      </header>

      <ConsultaSaldo />

      <section style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
        <h3>1. Negocio (PDA Registro)</h3>
        <input
          type="text"
          placeholder="Nombre del negocio (máx. 30)"
          value={nombreNegocio}
          onChange={(e) => setNombreNegocio(e.target.value)}
          style={{ marginRight: '0.5rem' }}
        />
        <input
          type="text"
          placeholder="Owner Pubkey (vacío = tu wallet)"
          value={ownerConsulta}
          onChange={(e) => setOwnerConsulta(e.target.value)}
          style={{ marginRight: '0.5rem', width: '240px' }}
        />
        <button onClick={consultarDatos} style={{ marginRight: '0.5rem' }}>
          Consultar Registro
        </button>
        <button
          disabled={!wallet.connected}
          onClick={() =>
            manejarAccion(
              () => ejecutarCrearRegistro(wallet, nombreNegocio),
              'Registro de negocio creado correctamente.'
            )
          }
        >
          Crear Registro
        </button>
      </section>

      <section style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
        <h3>2. Alta de Cliente (PDA Cliente)</h3>
        <input
          type="text"
          placeholder="Nombre del cliente"
          value={nombreCliente}
          onChange={(e) => setNombreCliente(e.target.value)}
          style={{ marginRight: '0.5rem' }}
        />
        <button
          disabled={!wallet.connected}
          onClick={() =>
            manejarAccion(
              () => ejecutarCrearCliente(wallet, nombreNegocio, nombreCliente),
              'Cliente registrado correctamente.'
            )
          }
        >
          Crear Cliente
        </button>
      </section>

      <section style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
        <h3>3. Registrar Venta (PDA Venta)</h3>
        <input
          type="number"
          placeholder="ID Cliente"
          value={idClienteVenta}
          onChange={(e) => setIdClienteVenta(Number(e.target.value))}
          style={{ width: '90px', marginRight: '0.5rem' }}
        />
        <input
          type="text"
          placeholder="SKU (máx. 5)"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          style={{ width: '100px', marginRight: '0.5rem' }}
        />
        <input
          type="text"
          placeholder="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          style={{ marginRight: '0.5rem' }}
        />
        <input
          type="number"
          placeholder="Monto"
          value={monto}
          onChange={(e) => setMonto(Number(e.target.value))}
          style={{ width: '90px', marginRight: '0.5rem' }}
        />
        <button
          disabled={!wallet.connected}
          onClick={() =>
            manejarAccion(
              () =>
                ejecutarRegistrarVenta(
                  wallet,
                  nombreNegocio,
                  idClienteVenta,
                  sku,
                  descripcion,
                  monto
                ),
              'Venta registrada y totales actualizados.'
            )
          }
        >
          Registrar Venta
        </button>
      </section>

      <section style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
        <h3>4. Corregir Monto o Procesar Devolución (Cierre de Cuenta)</h3>
        <input
          type="number"
          placeholder="ID Cliente"
          value={idClienteEdit}
          onChange={(e) => setIdClienteEdit(Number(e.target.value))}
          style={{ width: '90px', marginRight: '0.5rem' }}
        />
        <input
          type="text"
          placeholder="SKU"
          value={skuEdit}
          onChange={(e) => setSkuEdit(e.target.value)}
          style={{ width: '100px', marginRight: '0.5rem' }}
        />
        <input
          type="number"
          placeholder="Nuevo Monto"
          value={nuevoMonto}
          onChange={(e) => setNuevoMonto(Number(e.target.value))}
          style={{ width: '110px', marginRight: '0.5rem' }}
        />
        <button
          disabled={!wallet.connected}
          style={{ marginRight: '0.5rem' }}
          onClick={() =>
            manejarAccion(
              () =>
                ejecutarCambiarMonto(
                  wallet,
                  nombreNegocio,
                  idClienteEdit,
                  skuEdit,
                  nuevoMonto
                ),
              'Monto actualizado en cadena.'
            )
          }
        >
          Corregir Importe
        </button>
        <button
          disabled={!wallet.connected}
          onClick={() =>
            manejarAccion(
              () => ejecutarHacerDevolucion(wallet, nombreNegocio, idClienteEdit, skuEdit),
              'Devolución realizada, cuenta cerrada y renta recuperada.'
            )
          }
        >
          Devolución (Cerrar PDA)
        </button>
      </section>

      {mensaje && <p><strong>Estado:</strong> {mensaje}</p>}
      {ultimaTx && (
        <p>
          <strong>Última Transacción:</strong>{' '}
          <a
            href={`https://explorer.solana.com/tx/${ultimaTx}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
          >
            Ver en Solana Explorer ({ultimaTx.slice(0, 12)}...)
          </a>
        </p>
      )}

      {registro && (
        <section style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '6px' }}>
          <h2>Negocio: {registro.nombreNegocio}</h2>
          <p><strong>PDA Registro:</strong> {registro.direccion}</p>
          <p><strong>Ingresos Totales (On-Chain):</strong> ${registro.ingresosTotales}</p>
          <p><strong>Clientes Registrados:</strong> {registro.contadorClientes}</p>

          {registro.clientes.map((c) => (
            <div key={c.direccion} style={{ borderTop: '1px solid #ddd', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
              <h4>
                Cliente #{c.id}: {c.nombre} — Total Gastado: ${c.totalGastado}
              </h4>
              <small>PDA Cliente: {c.direccion}</small>
              {c.ventas.length === 0 ? (
                <p>Sin ventas activas.</p>
              ) : (
                <ul>
                  {c.ventas.map((v) => (
                    <li key={v.direccion}>
                      <strong>[{v.sku}]</strong> {v.descripcion} — <strong>${v.monto}</strong>{' '}
                      <small>(PDA: {v.direccion.slice(0, 8)}...)</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}