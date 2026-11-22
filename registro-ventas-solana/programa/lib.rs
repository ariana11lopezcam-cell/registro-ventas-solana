use anchor_lang::prelude::*;

declare_id!("6w3TfYbegfahVktLE2tuqmpfxW9NvEJrJ8wtnxXrREW3");

#[program]
pub mod registro_ventas {
    use super::*;

    pub fn crear_registro(ctx: Context<NuevoRegistro>, nombre_negocio: String) -> Result<()> {
        require!(nombre_negocio.as_bytes().len() <= 30, ErrorCodigo::TextoMuyLargo);

        let registro = &mut ctx.accounts.registro;
        registro.owner = ctx.accounts.owner.key();
        registro.nombre_negocio = nombre_negocio;
        registro.clientes = Vec::new();
        registro.contador_clientes = 0;
        registro.ingresos_totales = 0;
        Ok(())
    }

    pub fn crear_cliente(ctx: Context<NuevoCliente>, nombre: String) -> Result<()> {
        require!(nombre.as_bytes().len() <= 30, ErrorCodigo::TextoMuyLargo);

        let registro = &mut ctx.accounts.registro;
        let nuevo_id = registro
            .contador_clientes
            .checked_add(1)
            .ok_or(ErrorCodigo::Desbordamiento)?;

        let cliente = &mut ctx.accounts.cliente;
        cliente.id = nuevo_id;
        cliente.nombre = nombre;
        cliente.compras = 0;
        cliente.total_gastado = 0;
        cliente.historial = Vec::new();

        registro.contador_clientes = nuevo_id;
        registro.clientes.push(cliente.key());
        Ok(())
    }

    pub fn registrar_venta(
        ctx: Context<NuevaVenta>,
        _id_cliente: u16,
        sku: String,
        descripcion: String,
        monto: u32,
    ) -> Result<()> {
        require!(sku.as_bytes().len() <= 5, ErrorCodigo::SkuInvalido);
        require!(descripcion.as_bytes().len() <= 50, ErrorCodigo::TextoMuyLargo);
        require!(monto > 0, ErrorCodigo::MontoInvalido);

        let registro = &mut ctx.accounts.registro;
        let cliente = &mut ctx.accounts.cliente;
        let venta = &mut ctx.accounts.venta;

        venta.sku = sku;
        venta.descripcion = descripcion;
        venta.monto = monto;

        cliente.compras = cliente.compras.checked_add(1).ok_or(ErrorCodigo::Desbordamiento)?;
        cliente.total_gastado = cliente
            .total_gastado
            .checked_add(monto as u64)
            .ok_or(ErrorCodigo::Desbordamiento)?;
        cliente.historial.push(venta.key());

        registro.ingresos_totales = registro
            .ingresos_totales
            .checked_add(monto as u64)
            .ok_or(ErrorCodigo::Desbordamiento)?;

        Ok(())
    }

    pub fn cambiar_monto(
        ctx: Context<ModificarVenta>,
        _id_cliente: u16,
        _sku: String,
        nuevo_monto: u32,
    ) -> Result<()> {
        require!(nuevo_monto > 0, ErrorCodigo::MontoInvalido);

        let registro = &mut ctx.accounts.registro;
        let cliente = &mut ctx.accounts.cliente;
        let venta = &mut ctx.accounts.venta;

        let monto_anterior = venta.monto as u64;
        let monto_actual = nuevo_monto as u64;

        cliente.total_gastado = cliente
            .total_gastado
            .checked_sub(monto_anterior)
            .and_then(|v| v.checked_add(monto_actual))
            .ok_or(ErrorCodigo::Desbordamiento)?;

        registro.ingresos_totales = registro
            .ingresos_totales
            .checked_sub(monto_anterior)
            .and_then(|v| v.checked_add(monto_actual))
            .ok_or(ErrorCodigo::Desbordamiento)?;

        venta.monto = nuevo_monto;
        Ok(())
    }

    pub fn hacer_devolucion(
        ctx: Context<EliminarVenta>,
        _id_cliente: u16,
        _sku: String,
    ) -> Result<()> {
        let registro = &mut ctx.accounts.registro;
        let cliente = &mut ctx.accounts.cliente;
        let venta_key = ctx.accounts.venta.key();
        let monto_devuelto = ctx.accounts.venta.monto as u64;

        cliente.total_gastado = cliente
            .total_gastado
            .checked_sub(monto_devuelto)
            .ok_or(ErrorCodigo::Desbordamiento)?;

        registro.ingresos_totales = registro
            .ingresos_totales
            .checked_sub(monto_devuelto)
            .ok_or(ErrorCodigo::Desbordamiento)?;

        cliente.historial.retain(|&k| k != venta_key);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(nombre_negocio: String)]
pub struct NuevoRegistro<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + Registro::INIT_SPACE,
        seeds = [b"registro", nombre_negocio.as_bytes(), owner.key().as_ref()],
        bump
    )]
    pub registro: Account<'info, Registro>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct NuevoCliente<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        has_one = owner @ ErrorCodigo::NoEresElOwner
    )]
    pub registro: Account<'info, Registro>,
    #[account(
        init,
        payer = owner,
        space = 8 + Cliente::INIT_SPACE,
        seeds = [
            b"cliente",
            registro.key().as_ref(),
            &(registro.contador_clientes + 1).to_le_bytes()
        ],
        bump
    )]
    pub cliente: Account<'info, Cliente>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id_cliente: u16, sku: String)]
pub struct NuevaVenta<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        has_one = owner @ ErrorCodigo::NoEresElOwner
    )]
    pub registro: Account<'info, Registro>,
    #[account(
        mut,
        seeds = [b"cliente", registro.key().as_ref(), &id_cliente.to_le_bytes()],
        bump
    )]
    pub cliente: Account<'info, Cliente>,
    #[account(
        init,
        payer = owner,
        space = 8 + Venta::INIT_SPACE,
        seeds = [b"venta", cliente.key().as_ref(), sku.as_bytes()],
        bump
    )]
    pub venta: Account<'info, Venta>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id_cliente: u16, sku: String)]
pub struct ModificarVenta<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        has_one = owner @ ErrorCodigo::NoEresElOwner
    )]
    pub registro: Account<'info, Registro>,
    #[account(
        mut,
        seeds = [b"cliente", registro.key().as_ref(), &id_cliente.to_le_bytes()],
        bump
    )]
    pub cliente: Account<'info, Cliente>,
    #[account(
        mut,
        seeds = [b"venta", cliente.key().as_ref(), sku.as_bytes()],
        bump
    )]
    pub venta: Account<'info, Venta>,
}

#[derive(Accounts)]
#[instruction(id_cliente: u16, sku: String)]
pub struct EliminarVenta<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        has_one = owner @ ErrorCodigo::NoEresElOwner
    )]
    pub registro: Account<'info, Registro>,
    #[account(
        mut,
        seeds = [b"cliente", registro.key().as_ref(), &id_cliente.to_le_bytes()],
        bump
    )]
    pub cliente: Account<'info, Cliente>,
    #[account(
        mut,
        close = owner,
        seeds = [b"venta", cliente.key().as_ref(), sku.as_bytes()],
        bump
    )]
    pub venta: Account<'info, Venta>,
}

#[account]
#[derive(InitSpace)]
pub struct Registro {
    pub owner: Pubkey,
    #[max_len(30)]
    pub nombre_negocio: String,
    #[max_len(50)]
    pub clientes: Vec<Pubkey>,
    pub contador_clientes: u16,
    pub ingresos_totales: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Cliente {
    pub id: u16,
    #[max_len(30)]
    pub nombre: String,
    pub compras: u16,
    pub total_gastado: u64,
    #[max_len(50)]
    pub historial: Vec<Pubkey>,
}

#[account]
#[derive(InitSpace)]
pub struct Venta {
    #[max_len(5)]
    pub sku: String,
    #[max_len(50)]
    pub descripcion: String,
    pub monto: u32,
}

#[error_code]
pub enum ErrorCodigo {
    #[msg("No eres el owner del registro.")]
    NoEresElOwner,
    #[msg("El texto excede la longitud máxima permitida.")]
    TextoMuyLargo,
    #[msg("El SKU debe tener máximo 5 caracteres.")]
    SkuInvalido,
    #[msg("El monto debe ser mayor a cero.")]
    MontoInvalido,
    #[msg("Error de desbordamiento numérico.")]
    Desbordamiento,
}