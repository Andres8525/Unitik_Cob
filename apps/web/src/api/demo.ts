import type { Role } from '@unitik/shared-types';
import type { SessionUser } from '../stores/auth';

const STORAGE_KEY = 'unitik-demo-data';

export const DEMO_ACCOUNTS: Array<{ role: Role; email: string; name: string }> = [
  { role: 'ADMIN', email: 'admin@demo.unitik.co', name: 'Administrador' },
  { role: 'TECHNICIAN', email: 'tecnico@demo.unitik.co', name: 'Técnico' },
  { role: 'CASHIER', email: 'cajero@demo.unitik.co', name: 'Cajero' },
  { role: 'CLIENT', email: 'cliente@demo.unitik.co', name: 'Cliente' },
];

interface DemoClient {
  id: string;
  clientCode: string;
  address: string;
  neighborhood: string;
  municipality: string;
  serviceType: 'FIBER' | 'RADIO';
  paymentModality: 'PREPAID' | 'POSTPAID';
  status: string;
  phoneVerified: boolean;
  user: {
    id: string;
    documentId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: 'CLIENT';
  };
}

interface DemoInvoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  period: string;
  dueDate: string;
  issueDate: string;
  total: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PROMISE_TO_PAY';
  electronicInvoiceUrl: string | null;
}

interface DemoTicket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: string;
  category: string;
  createdAt: string;
}

interface DemoNotification {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  status: 'UNREAD' | 'READ';
}

interface DemoPromise {
  id: string;
  invoiceId: string;
  promiseDate: string;
  daysExtension: number;
  client: { clientCode: string; user: { firstName: string; lastName: string; documentId: string } };
  invoice: { invoiceNumber: string; dueDate: string; status: string };
}

interface DemoPlan {
  id: string;
  name: string;
  description: string;
  serviceType: 'FIBER' | 'RADIO';
  speedMbps: number;
  monthlyPrice: string;
  reusePercent: number | null;
  includesTv: boolean;
  isActive: boolean;
}

const DEFAULT_DEMO_PLANS: DemoPlan[] = [
  {
    id: 'demo-plan-fiber-20',
    name: 'Fibra 20 Megas',
    description: 'Internet por fibra óptica 20 Mbps',
    serviceType: 'FIBER',
    speedMbps: 20,
    monthlyPrice: '50000',
    reusePercent: 25,
    includesTv: false,
    isActive: true,
  },
  {
    id: 'demo-plan-fiber-100',
    name: 'Fibra 100 Megas',
    description: 'Internet por fibra óptica 100 Mbps',
    serviceType: 'FIBER',
    speedMbps: 100,
    monthlyPrice: '100000',
    reusePercent: 50,
    includesTv: false,
    isActive: true,
  },
  {
    id: 'demo-plan-radio-12',
    name: 'Radio 12 Megas',
    description: 'Internet por radio enlace 12 Mbps',
    serviceType: 'RADIO',
    speedMbps: 12,
    monthlyPrice: '50000',
    reusePercent: 16.67,
    includesTv: false,
    isActive: true,
  },
];

/** Fictitious collection accounts used only by the demo. */
const DEFAULT_DEMO_ACCOUNTS = [
  {
    method: 'NEQUI',
    bank: 'Nequi',
    accountNumber: '300 000 0000',
    holderName: 'UNITIK Internet (cuenta demo)',
    instructions: 'Escribe tu código de cliente en el mensaje del pago.',
  },
  {
    method: 'BANK_TRANSFER',
    bank: 'Banco Demo',
    accountType: 'AHORROS',
    accountNumber: '000-000000-00',
    holderName: 'UNITIK Internet Sin Límite S.A.S. (cuenta demo)',
    holderDocument: 'NIT 000.000.000-0',
    instructions: 'Usa tu código de cliente como referencia.',
  },
];

interface DemoState {
  /** Optional so browsers holding an older demo snapshot keep working. */
  plans?: DemoPlan[];
  paymentAccounts?: Array<Record<string, unknown>>;
  promotions?: Array<Record<string, unknown>>;
  clients: DemoClient[];
  invoices: DemoInvoice[];
  tickets: DemoTicket[];
  notifications: DemoNotification[];
  promises: DemoPromise[];
  installations: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  policies: {
    cutOffDayStart: number;
    cutOffDayEnd: number;
    interestRatePercent: number;
    doublePaymentEnabled: boolean;
  };
}

const initialState = (): DemoState => {
  const now = new Date();
  const date = (day: number) => new Date(now.getFullYear(), now.getMonth(), day).toISOString();
  const clients: DemoClient[] = [
    {
      id: 'demo-client-001',
      clientCode: 'CLI-1085123456',
      address: 'Calle 5 # 4-21',
      neighborhood: 'Centro',
      municipality: 'Cumbitara',
      serviceType: 'FIBER',
      paymentModality: 'POSTPAID',
      status: 'ACTIVE',
      phoneVerified: true,
      user: {
        id: 'demo-user-client',
        documentId: '1085123456',
        firstName: 'María Fernanda',
        lastName: 'López',
        email: 'cliente@demo.unitik.co',
        phone: '3001234567',
        role: 'CLIENT',
      },
    },
    {
      id: 'demo-client-002',
      clientCode: 'CLI-1085987654',
      address: 'Carrera 3 # 2-18',
      neighborhood: 'La Palma',
      municipality: 'Cumbitara',
      serviceType: 'RADIO',
      paymentModality: 'POSTPAID',
      status: 'SUSPENDED',
      phoneVerified: false,
      user: {
        id: 'demo-user-client-2',
        documentId: '1085987654',
        firstName: 'Carlos Andrés',
        lastName: 'Rosero',
        email: 'carlos.demo@unitik.co',
        phone: '3007654321',
        role: 'CLIENT',
      },
    },
    {
      id: 'demo-client-003',
      clientCode: 'CLI-1085765432',
      address: 'Vereda El Naranjo',
      neighborhood: 'Zona rural',
      municipality: 'Cumbitara',
      serviceType: 'RADIO',
      paymentModality: 'PREPAID',
      status: 'ACTIVE',
      phoneVerified: true,
      user: {
        id: 'demo-user-client-3',
        documentId: '1085765432',
        firstName: 'Diana Patricia',
        lastName: 'Muñoz',
        email: 'diana.demo@unitik.co',
        phone: '3001122334',
        role: 'CLIENT',
      },
    },
  ];

  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const invoices: DemoInvoice[] = [
    {
      id: 'demo-invoice-001',
      invoiceNumber: `FCT-${now.getFullYear()}-001`,
      clientId: clients[0].id,
      period,
      dueDate: date(15),
      issueDate: date(1),
      total: '100000',
      status: 'PENDING',
      electronicInvoiceUrl: null,
    },
    {
      id: 'demo-invoice-002',
      invoiceNumber: `FCT-${now.getFullYear()}-002`,
      clientId: clients[0].id,
      period,
      dueDate: date(10),
      issueDate: date(1),
      total: '50000',
      status: 'OVERDUE',
      electronicInvoiceUrl: null,
    },
    {
      id: 'demo-invoice-003',
      invoiceNumber: `FCT-${now.getFullYear()}-003`,
      clientId: clients[1].id,
      period,
      dueDate: date(12),
      issueDate: date(1),
      total: '60000',
      status: 'OVERDUE',
      electronicInvoiceUrl: null,
    },
    {
      id: 'demo-invoice-004',
      invoiceNumber: `FCT-${now.getFullYear()}-004`,
      clientId: clients[2].id,
      period,
      dueDate: date(25),
      issueDate: date(1),
      total: '50000',
      status: 'PENDING',
      electronicInvoiceUrl: null,
    },
  ];

  return {
    clients,
    invoices,
    tickets: [
      {
        id: 'demo-ticket-001',
        ticketNumber: 'TKT-2026-001',
        title: 'Intermitencia en el servicio',
        description: 'El cliente reporta cortes ocasionales durante la tarde.',
        status: 'OPEN',
        priority: 'HIGH',
        category: 'CONECTIVIDAD',
        createdAt: date(now.getDate()),
      },
      {
        id: 'demo-ticket-002',
        ticketNumber: 'TKT-2026-002',
        title: 'Revisión de equipo de acceso',
        description: 'Validar potencia y estado del equipo instalado.',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        category: 'EQUIPOS',
        createdAt: date(Math.max(1, now.getDate() - 1)),
      },
    ],
    notifications: [
      {
        id: 'demo-notification-001',
        type: 'INVOICE_OVERDUE',
        content: 'Tu factura está próxima a vencer. Consulta el portal para ver el detalle.',
        createdAt: date(now.getDate()),
        status: 'UNREAD',
      },
      {
        id: 'demo-notification-002',
        type: 'PAYMENT_VALIDATED',
        content: 'Pago recibido correctamente. Gracias por estar al día.',
        createdAt: date(Math.max(1, now.getDate() - 1)),
        status: 'UNREAD',
      },
    ],
    promises: [],
    installations: [
      {
        id: 'demo-installation-001',
        clientId: clients[0].id,
        serviceType: 'FIBER',
        installationDate: date(Math.max(1, now.getDate() - 3)),
        extraCostsApplied: false,
      },
    ],
    payments: [],
    policies: {
      cutOffDayStart: 1,
      cutOffDayEnd: 10,
      interestRatePercent: 2.5,
      doublePaymentEnabled: true,
    },
  };
};

function readState(): DemoState {
  const serialized = window.localStorage.getItem(STORAGE_KEY);
  if (!serialized) {
    const state = initialState();
    writeState(state);
    return state;
  }
  return JSON.parse(serialized) as DemoState;
}

function writeState(state: DemoState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetDemoData(): void {
  for (const key of [
    'unitik-demo-data',
    'unitik-demo-plans',
    'unitik-demo-billing',
    'unitik-demo-files',
  ]) {
    window.localStorage.removeItem(key);
  }
  for (const key of ['unitik-auth', 'unitik-client-portal', 'unitik-notificaciones']) {
    window.sessionStorage.removeItem(key);
  }
}

export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE !== 'false';
}

export function demoSession(role: Role): {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
} {
  const account = DEMO_ACCOUNTS.find((candidate) => candidate.role === role);
  if (!account) throw new Error(`No existe una cuenta demo para el rol ${role}.`);
  const userByRole: Record<Role, SessionUser> = {
    ADMIN: {
      id: 'demo-user-admin',
      documentId: '1000000001',
      firstName: 'Andrea',
      lastName: 'Administradora',
      email: account.email,
      role,
    },
    TECHNICIAN: {
      id: 'demo-user-technician',
      documentId: '1000000002',
      firstName: 'Julián',
      lastName: 'Técnico',
      email: account.email,
      role,
    },
    CASHIER: {
      id: 'demo-user-cashier',
      documentId: '1000000003',
      firstName: 'Laura',
      lastName: 'Cajera',
      email: account.email,
      role,
    },
    CLIENT: {
      id: 'demo-user-client',
      documentId: '1085123456',
      firstName: 'María Fernanda',
      lastName: 'López',
      email: account.email,
      role,
    },
  };
  return {
    user: userByRole[role],
    accessToken: `demo-access-${role.toLowerCase()}`,
    refreshToken: `demo-refresh-${role.toLowerCase()}`,
  };
}

function currentClient(state: DemoState): DemoClient {
  const { user } = getAuthUser();
  return state.clients.find((client) => client.user.id === user?.id) ?? state.clients[0];
}

function getAuthUser(): { user: SessionUser | null } {
  const persisted = window.sessionStorage.getItem('unitik-auth');
  if (!persisted) return { user: null };
  const parsed = JSON.parse(persisted) as { state?: { user?: SessionUser | null } };
  return { user: parsed.state?.user ?? null };
}

function parseBody(options: RequestInit): Record<string, unknown> {
  if (typeof options.body !== 'string') return {};
  const body: unknown = JSON.parse(options.body);
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Error('El cuerpo de la solicitud demo debe ser un objeto JSON.');
  }
  return body as Record<string, unknown>;
}

function clientProfile(client: DemoClient): DemoClient {
  return client;
}

function findClient(state: DemoState, id: string | null): DemoClient | undefined {
  return id ? state.clients.find((client) => client.id === id) : undefined;
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function reportCsv(state: DemoState, report: string): string {
  if (report === '/reports/collections.csv') {
    return [
      'fecha;factura;cliente;codigo;metodo;autoValidado;monto',
      ...validatedPayments(state).map((payment) => {
        const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
        const client = invoice && findClient(state, invoice.clientId);
        return [
          new Date().toISOString(),
          invoice?.invoiceNumber,
          client ? `${client.user.firstName} ${client.user.lastName}` : '',
          client?.clientCode,
          'CASH',
          'SI',
          payment.amount,
        ]
          .map(csvEscape)
          .join(';');
      }),
    ].join('\r\n');
  }
  if (report === '/reports/clients-by-plan.csv') {
    return [
      'plan;servicio;megas;precioMensual;clientesActivos;ingresoMensualEstimado',
      'Fibra 100 Megas;FIBER;100;100000;1;100000',
      'Radio 12 Megas;RADIO;12;50000;2;100000',
    ].join('\r\n');
  }
  throw new Error(`Informe demo no disponible: ${report}`);
}

export async function demoApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = new URL(path, window.location.origin);
  const route = url.pathname.replace(/^\/api/, '');
  const method = (options.method ?? 'GET').toUpperCase();
  const body = parseBody(options);
  const state = readState();
  const me = currentClient(state);
  const now = new Date().toISOString();
  let result: unknown;

  if (route === '/auth/login' && method === 'POST') {
    const identifier = String(body.identifier ?? '').toLowerCase();
    const registered = state.clients.find(
      (client) =>
        client.user.email.toLowerCase() === identifier || client.user.documentId === identifier,
    );
    const account = DEMO_ACCOUNTS.find((candidate) => candidate.email === identifier);
    const role = registered || account?.role === 'CLIENT' ? 'CLIENT' : (account?.role ?? 'ADMIN');
    const session = demoSession(role);
    if (registered) {
      session.user = {
        ...session.user,
        id: registered.user.id,
        documentId: registered.user.documentId,
        firstName: registered.user.firstName,
        lastName: registered.user.lastName,
        email: registered.user.email,
      };
    }
    return session as T;
  }
  if (route === '/auth/change-password' && method === 'POST') {
    return { changed: true } as T;
  }
  if (route === '/auth/logout' && method === 'POST') {
    return { loggedOut: true } as T;
  }
  if (route === '/auth/refresh' && method === 'POST') {
    const user = getAuthUser().user;
    return (user ? demoSession(user.role) : null) as T;
  }
  if (route === '/health' && method === 'GET') {
    return {
      status: 'degraded',
      timestamp: now,
      timezone: 'America/Bogota',
      dependencies: {
        database: 'not_configured',
        redis: 'not_configured',
        routerboard: 'not_configured',
        whatsapp: 'not_configured',
        paymentGateway: 'not_configured',
      },
    } as T;
  }
  if (route.startsWith('/reports/') && method === 'GET') {
    return reportCsv(state, route) as T;
  }
  if (route === '/clients/me' && method === 'GET') {
    result = { ...clientProfile(me), phoneVerified: me.phoneVerified };
  } else if (route === '/clients' && method === 'GET') {
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    result = state.clients
      .filter((client) => {
        const values = [
          client.clientCode,
          client.user.documentId,
          client.user.firstName,
          client.user.lastName,
          client.user.email,
        ]
          .join(' ')
          .toLowerCase();
        return !search || values.includes(search);
      })
      .map(clientProfile);
  } else if ((route === '/clients' || route === '/clients/register') && method === 'POST') {
    const firstName = String(body.firstName ?? '').trim();
    const lastName = String(body.lastName ?? '').trim();
    const documentId = String(body.documentId ?? '').trim();
    const email = String(body.email ?? '').trim();
    if (
      state.clients.some(
        (client) => client.user.email === email || client.user.documentId === documentId,
      )
    ) {
      throw new Error('Ya existe una cuenta demo con ese correo o documento.');
    }
    const client: DemoClient = {
      id: `demo-client-${crypto.randomUUID()}`,
      clientCode: `CLI-${documentId}`,
      address: String(body.address ?? ''),
      neighborhood: 'Centro',
      municipality: 'Cumbitara',
      serviceType: body.serviceType === 'RADIO' ? 'RADIO' : 'FIBER',
      paymentModality: body.paymentModality === 'PREPAID' ? 'PREPAID' : 'POSTPAID',
      status: 'ACTIVE',
      phoneVerified: false,
      user: {
        id: `demo-user-${crypto.randomUUID()}`,
        documentId,
        firstName,
        lastName,
        email,
        phone: String(body.phone ?? ''),
        role: 'CLIENT',
      },
    };
    state.clients.unshift(client);
    writeState(state);
    result = clientProfile(client);
  } else if (route === '/plans' && method === 'GET') {
    const plans = (state.plans ??= DEFAULT_DEMO_PLANS.map((plan) => ({ ...plan })));
    result =
      url.searchParams.get('onlyActive') === 'true' ? plans.filter((plan) => plan.isActive) : plans;
  } else if (route === '/plans' && method === 'POST') {
    const plans = (state.plans ??= DEFAULT_DEMO_PLANS.map((plan) => ({ ...plan })));
    const plan: DemoPlan = {
      id: `demo-plan-${crypto.randomUUID()}`,
      name: String(body.name ?? '').trim(),
      description: String(body.description ?? '').trim(),
      serviceType: body.serviceType === 'RADIO' ? 'RADIO' : 'FIBER',
      speedMbps: Number(body.speedMbps),
      monthlyPrice: String(body.monthlyPrice),
      reusePercent: typeof body.reusePercent === 'number' ? body.reusePercent : null,
      includesTv: body.includesTv === true,
      isActive: true,
    };
    if (!plan.name) throw new Error('El nombre es obligatorio');
    plans.push(plan);
    writeState(state);
    result = plan;
  } else if (/^\/plans\/[^/]+$/.test(route) && method === 'PATCH') {
    const plans = (state.plans ??= DEFAULT_DEMO_PLANS.map((plan) => ({ ...plan })));
    const plan = plans.find((item) => item.id === route.split('/').pop());
    if (!plan) throw new Error('No se encontró el plan de demostración.');
    Object.assign(
      plan,
      body,
      body.monthlyPrice === undefined ? {} : { monthlyPrice: String(body.monthlyPrice) },
    );
    writeState(state);
    result = plan;
  } else if (route.startsWith('/promotions')) {
    const promotions = (state.promotions ??= []);
    const id = route.split('/')[2];
    if (route === '/promotions' && method === 'GET') {
      result = promotions;
    } else if (route === '/promotions/active' && method === 'GET') {
      const current = Date.now();
      result = promotions.filter(
        (promotion) =>
          promotion.isActive === true &&
          (!promotion.startsAt || Date.parse(String(promotion.startsAt)) <= current) &&
          (!promotion.endsAt || Date.parse(String(promotion.endsAt)) >= current),
      );
    } else if (route === '/promotions' && method === 'POST') {
      const promotion = {
        id: `demo-promotion-${crypto.randomUUID()}`,
        title: String(body.title ?? '').trim(),
        description: String(body.description ?? '').trim(),
        imageFileId: body.imageFileId ?? null,
        imageUrl: body.imageFileId ? `/api/files/${String(body.imageFileId)}` : null,
        startsAt: windowDate(body.startsAt, 'start'),
        endsAt: windowDate(body.endsAt, 'end'),
        isActive: body.isActive !== false,
        createdAt: now,
      };
      if (!promotion.title || !promotion.description) {
        throw new Error('El título y la descripción son obligatorios');
      }
      promotions.unshift(promotion);
      writeState(state);
      result = promotion;
    } else if (id && method === 'PATCH') {
      const promotion = promotions.find((item) => item.id === id);
      if (!promotion) throw new Error('Promoción no encontrada');
      Object.assign(promotion, {
        ...body,
        ...(body.startsAt !== undefined ? { startsAt: windowDate(body.startsAt, 'start') } : {}),
        ...(body.endsAt !== undefined ? { endsAt: windowDate(body.endsAt, 'end') } : {}),
        ...(body.imageFileId ? { imageUrl: `/api/files/${String(body.imageFileId)}` } : {}),
      });
      writeState(state);
      result = promotion;
    } else if (id && method === 'DELETE') {
      state.promotions = promotions.filter((item) => item.id !== id);
      writeState(state);
      result = { deleted: true };
    } else {
      throw new Error(`La ruta ${method} ${route} no está implementada en la demo.`);
    }
  } else if (route === '/subscriptions/my' && method === 'GET') {
    result = {
      status: 'ACTIVE',
      cutOffDay: 10,
      plan: {
        name: me.serviceType === 'FIBER' ? 'Fibra 100 Megas' : 'Radio 12 Megas',
        description:
          me.serviceType === 'FIBER' ? 'Internet por fibra óptica' : 'Internet por radio enlace',
        speedMbps: me.serviceType === 'FIBER' ? 100 : 12,
        monthlyPrice: me.serviceType === 'FIBER' ? '100000' : '50000',
        includesTv: false,
      },
    };
  } else if (route === '/invoices/my' && method === 'GET') {
    result = state.invoices.filter((invoice) => invoice.clientId === me.id);
  } else if (route === '/invoices' && method === 'GET') {
    const clientId = url.searchParams.get('clientId');
    result = state.invoices.filter((invoice) => !clientId || invoice.clientId === clientId);
  } else if (route === '/invoices/portfolio' && method === 'GET') {
    const open = state.invoices.filter((invoice) =>
      ['PENDING', 'OVERDUE', 'PROMISE_TO_PAY'].includes(invoice.status),
    );
    result = {
      totalPending: open
        .filter((invoice) => invoice.status !== 'OVERDUE')
        .reduce((sum, invoice) => sum + Number(invoice.total), 0),
      totalOverdue: open
        .filter((invoice) => invoice.status === 'OVERDUE')
        .reduce((sum, invoice) => sum + Number(invoice.total), 0),
      byClient: state.clients
        .map((client) => {
          const due = open.filter(
            (invoice) => invoice.clientId === client.id && invoice.status === 'OVERDUE',
          );
          return {
            clientId: client.id,
            clientCode: client.clientCode,
            clientName: `${client.user.firstName} ${client.user.lastName}`,
            overdueAmount: due.reduce((sum, invoice) => sum + Number(invoice.total), 0),
            overdueCount: due.length,
          };
        })
        .filter((client) => client.overdueCount > 0),
    };
  } else if (route === '/dashboard/kpis' && method === 'GET') {
    const todayCollection = (current: typeof state) => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
      const paidToday = validatedPayments(current).filter(
        (payment) =>
          new Date(String(payment.validatedAt ?? payment.paidAt ?? 0)).toLocaleDateString('en-CA', {
            timeZone: 'America/Bogota',
          }) === today,
      );
      return {
        todayRevenue: paidToday.reduce((sum, payment) => sum + Number(payment.amount), 0),
        todayPayments: paidToday.length,
      };
    };
    result = {
      activeClients: state.clients.filter((client) => client.status === 'ACTIVE').length,
      suspendedClients: state.clients.filter((client) => client.status === 'SUSPENDED').length,
      monthRevenue: validatedPayments(state).reduce(
        (sum, payment) => sum + Number(payment.amount),
        0,
      ),
      ...todayCollection(state),
      overdueClients: new Set(
        state.invoices
          .filter((invoice) => invoice.status === 'OVERDUE')
          .map((invoice) => invoice.clientId),
      ).size,
      overdueAmount: state.invoices
        .filter((invoice) => invoice.status === 'OVERDUE')
        .reduce((sum, invoice) => sum + Number(invoice.total), 0),
      openTickets: state.tickets.filter((ticket) => ['OPEN', 'IN_PROGRESS'].includes(ticket.status))
        .length,
      devicesOnline: 2,
      devicesTotal: 2,
    };
  } else if (route === '/audit' && method === 'GET') {
    result = validatedPayments(state)
      .slice(-15)
      .reverse()
      .map((payment, index) => ({
        id: `demo-audit-${index}`,
        createdAt: now,
        action: 'PAYMENT_VALIDATED',
        entity: 'Payment',
        entityId: payment.id,
        user: { email: 'cajero@demo.unitik.co' },
      }));
  } else if (route === '/network/devices' && method === 'GET') {
    result = [
      {
        id: 'demo-device-001',
        name: 'RouterBoard Cumbitara',
        deviceType: 'MIKROTIK',
        ipAddress: '192.168.88.1',
        location: 'Oficina principal',
        isActive: true,
        status: 'online',
        lastPing: now,
        apiPort: 8728,
      },
      {
        id: 'demo-device-002',
        name: 'OLT Centro',
        deviceType: 'OLT',
        ipAddress: '192.168.88.2',
        location: 'Centro',
        isActive: true,
        status: 'online',
        lastPing: now,
        apiPort: 8728,
      },
    ];
  } else if (/^\/network\/devices\/[^/]+\/available-ips$/.test(route) && method === 'GET') {
    const deviceId = route.split('/')[3];
    const routerIp: Record<string, string> = {
      'demo-device-001': '192.168.88.1',
      'demo-device-002': '192.168.88.2',
    };
    const used = new Set(
      state.installations
        .filter((item) => item.deviceId === deviceId && typeof item.ipAddress === 'string')
        .map((item) => String(item.ipAddress)),
    );
    used.add(routerIp[deviceId] ?? '192.168.88.1');
    const limit = Number(url.searchParams.get('limit') ?? 256);
    const available: string[] = [];
    // Gateway .1 is reserved; hosts .2-.254 of the /24 are client addresses.
    for (let host = 2; host <= 254 && available.length < limit; host += 1) {
      const ip = `192.168.88.${host}`;
      if (!used.has(ip)) available.push(ip);
    }
    result = { pool: '192.168.88.0/24', total: 254, used: used.size + 1, available };
  } else if (/^\/network\/devices\/[^/]+\/ping$/.test(route) && method === 'POST') {
    result = { online: true };
  } else if (route === '/installations' && method === 'GET') {
    result = state.installations;
  } else if (route === '/installations' && method === 'POST') {
    const installationId = `demo-installation-${crypto.randomUUID()}`;
    const client = findClient(state, String(body.clientId ?? ''));
    const macAddress = String(body.macAddress ?? '').toUpperCase();
    // Same rule as the API: one MAC belongs to a single client on any router.
    const macOwner = state.installations.find(
      (item) => item.macAddress === macAddress && item.clientId !== body.clientId,
    );
    if (macOwner) {
      const owner = findClient(state, String(macOwner.clientId));
      throw new Error(
        `La MAC ${macAddress} ya está registrada${owner ? ` para el cliente ${owner.clientCode}` : ' para otro cliente'}`,
      );
    }
    const installation = {
      id: installationId,
      clientId: body.clientId,
      deviceId: body.deviceId,
      serviceType: body.serviceType,
      installationDate: body.installationDate ?? now,
      extraCostsApplied: body.aplicarCostosExtra === true,
      macAddress,
      ipAddress: body.ipAddress,
      equipmentSerial: String(body.equipmentSerial ?? '').toUpperCase(),
      sitePhotoId: body.sitePhotoId ?? null,
      equipmentPhotoId: body.equipmentPhotoId ?? null,
    };
    state.installations.unshift(installation);
    writeState(state);
    result = {
      installation,
      networkAccess: {
        id: `demo-access-${crypto.randomUUID()}`,
        clientId: body.clientId,
        deviceId: body.deviceId,
        macAddress,
        ipAssigned: body.ipAddress ?? null,
        equipmentSerial: installation.equipmentSerial,
      },
      clientStatus: client?.status ?? 'ACTIVE',
    };
  } else if (route === '/tickets' && method === 'GET') {
    result = state.tickets;
  } else if (/^\/tickets\/[^/]+$/.test(route) && method === 'PATCH') {
    const id = route.split('/').pop();
    const ticket = state.tickets.find((item) => item.id === id);
    if (!ticket) throw new Error('No se encontró el ticket de demostración.');
    Object.assign(ticket, body);
    writeState(state);
    result = ticket;
  } else if (route === '/notifications/my' && method === 'GET') {
    result = state.notifications;
  } else if (/^\/notifications\/[^/]+\/read$/.test(route) && method === 'PATCH') {
    const id = decodeURIComponent(route.split('/')[2]);
    const notification = state.notifications.find((item) => item.id === id);
    if (notification) notification.status = 'READ';
    writeState(state);
    result = { success: true };
  } else if (route === '/system-config/policies' && method === 'GET') {
    result = state.policies;
  } else if (route === '/system-config/policies' && method === 'PATCH') {
    Object.assign(state.policies, body);
    writeState(state);
    result = state.policies;
  } else if (route === '/payment-promises/active' && method === 'GET') {
    result = state.promises;
  } else if (route === '/payment-promises' && method === 'POST') {
    const invoice = state.invoices.find((item) => item.id === body.invoiceId);
    const client = invoice && findClient(state, invoice.clientId);
    if (!invoice || !client) throw new Error('Selecciona una factura demo vigente.');
    invoice.status = 'PROMISE_TO_PAY';
    state.promises.push({
      id: `demo-promise-${crypto.randomUUID()}`,
      invoiceId: invoice.id,
      promiseDate: now,
      daysExtension: Number(body.daysExtension ?? 7),
      client: {
        clientCode: client.clientCode,
        user: {
          firstName: client.user.firstName,
          lastName: client.user.lastName,
          documentId: client.user.documentId,
        },
      },
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        dueDate: invoice.dueDate,
        status: invoice.status,
      },
    });
    writeState(state);
    result = { success: true };
  } else if (route === '/payments' && method === 'GET') {
    const status = url.searchParams.get('status') ?? 'PENDING_VALIDATION';
    result = state.payments
      .filter(
        (payment) =>
          payment.status === status &&
          (payment.paymentMethod === 'NEQUI' || payment.paymentMethod === 'BANK_TRANSFER'),
      )
      .map((payment) => {
        const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
        const client = invoice && findClient(state, invoice.clientId);
        return {
          ...payment,
          validatedAt: payment.validatedAt ?? null,
          invoice: invoice && {
            invoiceNumber: invoice.invoiceNumber,
            period: invoice.period,
            total: invoice.total,
            client: client && { clientCode: client.clientCode, user: client.user },
          },
        };
      });
  } else if (/^\/payments\/[^/]+\/validate$/.test(route) && method === 'PATCH') {
    const payment = state.payments.find((item) => item.id === route.split('/')[2]);
    if (!payment) throw new Error('No se encontró el pago de demostración.');
    if (payment.status !== 'PENDING_VALIDATION') {
      throw new Error(`El pago ya fue procesado (estado: ${String(payment.status)})`);
    }
    const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
    if (body.approve === true) {
      if (!payment.proofUrl) {
        throw new Error('La validación manual de Nequi/transferencia exige el comprobante adjunto');
      }
      payment.status = 'VALIDATED';
      if (invoice) invoice.status = 'PAID';
    } else {
      if (!String(body.reason ?? '').trim()) throw new Error('El motivo de rechazo es obligatorio');
      payment.status = 'REJECTED';
      state.notifications.unshift({
        id: `demo-notification-${crypto.randomUUID()}`,
        type: 'PAYMENT_REJECTED',
        content: `Su comprobante fue rechazado: ${String(body.reason)}`,
        createdAt: now,
        status: 'UNREAD',
      });
    }
    payment.validatedAt = now;
    writeState(state);
    result = payment;
  } else if (route === '/payments/accounts' && method === 'GET') {
    result = state.paymentAccounts ?? DEFAULT_DEMO_ACCOUNTS;
  } else if (route === '/payments/accounts' && method === 'PUT') {
    const accounts = Array.isArray(body.accounts) ? body.accounts : [];
    state.paymentAccounts = accounts as Array<Record<string, unknown>>;
    writeState(state);
    result = state.paymentAccounts;
  } else if (route === '/payments' && method === 'POST') {
    const invoice = state.invoices.find((item) => item.id === body.invoiceId);
    if (!invoice || invoice.clientId !== me.id)
      throw new Error('Selecciona una factura demo vigente.');
    if (invoice.status === 'PAID') throw new Error('La factura ya aparece pagada en la demo.');
    // Digital reports stay pending until the administrator validates them (the invoice is not settled).
    const proofFileId = typeof body.proofFileId === 'string' ? body.proofFileId : null;
    const payment = {
      id: `demo-payment-${crypto.randomUUID()}`,
      invoiceId: invoice.id,
      amount: Number(body.amount ?? invoice.total),
      paymentMethod: body.paymentMethod,
      reference: body.reference ?? null,
      proofFileId,
      proofUrl: proofFileId ? `/api/files/${proofFileId}` : null,
      status: 'PENDING_VALIDATION',
      paidAt: now,
      createdAt: now,
    };
    state.payments.push(payment);
    writeState(state);
    result = payment;
  } else if (route === '/payments/cash' && method === 'POST') {
    result = registerPayment(state, String(body.invoiceId ?? ''));
  } else if (route === '/cashier/payments' && method === 'POST') {
    const payment = registerPayment(state, String(body.invoiceId ?? ''));
    const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
    const client = invoice && findClient(state, invoice.clientId);
    result = {
      receiptNumber: `REC-${new Date().getFullYear()}-${state.payments.length.toString().padStart(4, '0')}`,
      invoiceNumber: invoice?.invoiceNumber ?? '',
      clientName: client ? `${client.user.firstName} ${client.user.lastName}` : '',
      payment: { amount: String(payment.amount) },
    };
  } else if (/^\/cashier\/receipts\/[^/]+\/email$/.test(route) && method === 'POST') {
    const paymentId = route.split('/')[3];
    const payment = state.payments.find((item) => item.id === paymentId);
    const invoice = payment && state.invoices.find((item) => item.id === payment.invoiceId);
    const client = invoice && findClient(state, invoice.clientId);
    if (!client) throw new Error('No se encontró el pago de demostración.');
    result = {
      receiptNumber: paymentId,
      sentTo: client.user.email,
      delivered: false,
      message: `Modo demo: no se envían correos reales; el recibo iría a ${client.user.email}.`,
    };
  } else if (route === '/cashier/daily-close' && method === 'GET') {
    const payments = state.payments
      .filter((payment) => payment.paymentMethod === 'CASH')
      .map((payment) => {
        const invoice = state.invoices.find((item) => item.id === payment.invoiceId);
        const client = invoice && findClient(state, invoice.clientId);
        return {
          receiptTime: String(payment.createdAt),
          invoiceNumber: invoice?.invoiceNumber ?? '',
          clientName: client ? `${client.user.firstName} ${client.user.lastName}` : '',
          amount: Number(payment.amount),
        };
      });
    result = {
      date: now.slice(0, 10),
      totalReceived: payments.reduce((sum, payment) => sum + payment.amount, 0),
      paymentsCount: payments.length,
      payments,
    };
  } else if (/^\/cashier\/account-status\/[^/]+$/.test(route) && method === 'GET') {
    const client = findClient(state, route.split('/').pop() ?? null);
    if (!client) throw new Error('No se encontró el cliente demo.');
    const invoices = state.invoices.filter(
      (invoice) => invoice.clientId === client.id && invoice.status !== 'PAID',
    );
    result = {
      client: {
        clientCode: client.clientCode,
        name: `${client.user.firstName} ${client.user.lastName}`,
        status: client.status,
      },
      totalDue: invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0),
      openInvoices: invoices,
    };
  } else {
    throw new Error(`La ruta ${method} ${route} no está implementada en la demo.`);
  }

  return result as T;
}

/** Payments that count as collected money (cash or digital already validated). */
function validatedPayments(state: DemoState): Array<Record<string, unknown>> {
  return state.payments.filter((payment) => payment.status === 'VALIDATED');
}

/** Same rule as the API: date-only bounds cover the whole day in Bogotá. */
function windowDate(value: unknown, edge: 'start' | 'end'): string | null {
  if (typeof value !== 'string' || !value) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const suffix = edge === 'start' ? 'T00:00:00-05:00' : 'T23:59:59.999-05:00';
  return new Date(dateOnly ? `${value}${suffix}` : value).toISOString();
}

function registerPayment(state: DemoState, invoiceId: string): Record<string, unknown> {
  const invoice = state.invoices.find((item) => item.id === invoiceId);
  if (!invoice) throw new Error('No se encontró la factura demo.');
  if (invoice.status === 'PAID') throw new Error('La factura ya aparece pagada en la demo.');
  const payment = {
    id: `demo-payment-${crypto.randomUUID()}`,
    invoiceId,
    amount: Number(invoice.total),
    paymentMethod: 'CASH',
    status: 'VALIDATED',
    createdAt: new Date().toISOString(),
  };
  invoice.status = 'PAID';
  state.payments.push(payment);
  writeState(state);
  return payment;
}
