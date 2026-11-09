import { z } from 'zod';

export const actaInstalacionSchema = z.object({
  clientId: z.string().uuid('Selecciona un cliente'),
  deviceId: z.string().uuid('Selecciona el dispositivo de red'),
  macAddress: z
    .string()
    .trim()
    .regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, 'Usa el formato XX:XX:XX:XX:XX:XX')
    .transform((value) => value.toUpperCase()),
  ipAddress: z.string().trim().ip({ version: 'v4', message: 'Ingresa una dirección IPv4 válida' }),
  aplicarCostosExtra: z.boolean(),
  observaciones: z.string().trim().max(2000, 'Usa máximo 2000 caracteres'),
});

export type ActaInstalacionFormValues = z.infer<typeof actaInstalacionSchema>;
