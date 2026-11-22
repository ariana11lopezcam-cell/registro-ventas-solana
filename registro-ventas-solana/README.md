# Registro de Ventas en Solana (Anchor + React + Codama)

Aplicación descentralizada desplegada en **Solana Devnet** que gestiona un registro comercial mediante cuentas derivadas de programa (**PDAs**) jerárquicas (`Registro -> Cliente -> Venta`).

## Program ID (Devnet)
`6w3TfYbegfahVktLE2tuqmpfxW9NvEJrJ8wtnxXrREW3`

## Mejora Funcional Implementada
Sobre el proyecto base del bootcamp, se implementó **contabilidad automática on-chain** mediante acumuladores seguros (`checked_add` y `checked_sub`):
- `ingresos_totales` (`u64`) en la cuenta `Registro`.
- `total_gastado` (`u64`) en cada cuenta `Cliente`.
- Validación de montos positivos (`monto > 0`) y recálculo automático al registrar una venta, corregir su importe o cerrar la PDA mediante una devolución.

## Cómo ejecutar el proyecto
1. Instalar dependencias:
   ```bash
   npm install