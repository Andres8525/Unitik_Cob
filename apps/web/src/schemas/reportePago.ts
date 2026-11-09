import { z } from 'zod';

export const MAX_PAYMENT_RECEIPT_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_PAYMENT_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
const acceptedMimeTypes = new Set<string>(ACCEPTED_PAYMENT_RECEIPT_TYPES);

export const reportePagoSchema = z.object({
  invoiceId: z.string().min(1, 'Selecciona la factura que pagaste'),
  paymentMethod: z.enum(['NEQUI', 'BANK_TRANSFER'], {
    required_error: 'Selecciona el medio de pago',
  }),
  reference: z
    .string()
    .trim()
    .min(6, 'El número de referencia debe tener al menos 6 caracteres')
    .max(100, 'El número de referencia no puede superar 100 caracteres'),
  file: z
    .custom<File>((value) => typeof File !== 'undefined' && value instanceof File, {
      message: 'Adjunta el comprobante de pago',
    })
    .refine((file) => file.size > 0, 'El archivo no puede estar vacío')
    .refine(
      (file) => file.size <= MAX_PAYMENT_RECEIPT_SIZE,
      'El archivo debe pesar 5 MB o menos',
    )
    .refine(
      (file) => acceptedMimeTypes.has(file.type),
      'El archivo debe estar en formato JPG, PNG o PDF',
    ),
});

export type ReportePagoFormValues = z.infer<typeof reportePagoSchema>;
