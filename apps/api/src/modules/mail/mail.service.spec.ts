import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

describe('MailService', () => {
  it('reports SMTP as not configured instead of throwing', async () => {
    const service = new MailService({ get: () => undefined } as unknown as ConfigService);

    expect(service.isConfigured()).toBe(false);
    await expect(
      service.send({ to: 'cliente@example.com', subject: 'Recibo', text: 'Hola' }),
    ).resolves.toEqual({
      delivered: false,
      error: 'El servidor de correo (SMTP) no está configurado',
    });
  });
});
