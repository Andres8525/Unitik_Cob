import { z } from 'zod';

export const actaInstalacionSchema = z.object({
  clientId: z.string().uuid('Selecciona un cliente'),
  deviceId: z.string().uuid('Selecciona el dispositivo de red'),
  macAddress: z
    .string()
    .trim()
    .transform((value) => value.replace(/-/g, ':'))
    .pipe(
      z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, 'Usa el formato XX:XX:XX:XX:XX:XX'),
    )
    .transform((value) => value.toUpperCase()),
  equipmentSerial: z
    .string()
    .trim()
    .min(4, 'El serial debe tener al menos 4 caracteres')
    .max(60, 'El serial admite máximo 60 caracteres')
    .regex(/^[A-Za-z0-9._/-]+$/, 'Usa solo letras, números, punto, guion o barra')
    .transform((value) => value.toUpperCase()),
  ipAddress: z
    .string()
    .trim()
    .min(1, 'Selecciona una IP disponible')
    .ip({ version: 'v4', message: 'Ingresa una dirección IPv4 válida' }),
  aplicarCostosExtra: z.boolean(),
  observaciones: z.string().trim().max(2000, 'Usa máximo 2000 caracteres'),
});

export type ActaInstalacionFormValues = z.infer<typeof actaInstalacionSchema>;
