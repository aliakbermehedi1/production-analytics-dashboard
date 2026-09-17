import type {
  Customer,
  Order,
  OrderDetail,
  OrderItem,
  OrderStatus,
  SystemActivity,
  ActivityLevel,
} from "@/types/domain";

/**
 * Deterministic pseudo-random source (mulberry32).
 *
 * The dataset is generated rather than checked in as a large JSON blob, but it
 * is generated from a fixed seed so every run — local, CI, production — sees
 * byte-identical data. That keeps screenshots, tests and the demo stable, which
 * a `Math.random()` dataset would not.
 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260917);

const pick = <T,>(items: readonly T[]): T =>
  items[Math.floor(rand() * items.length)];

const randomInt = (min: number, max: number): number =>
  Math.floor(rand() * (max - min + 1)) + min;

const round2 = (n: number): number => Math.round(n * 100) / 100;

/* -------------------------------------------------------------------------- */

const FIRST_NAMES = [
  "Ayesha", "Rafiq", "Nadia", "Imran", "Sadia", "Tanvir", "Farhana", "Rakib",
  "Mitali", "Shahriar", "Nusrat", "Arif", "Tasnim", "Jahid", "Rumana", "Sabbir",
  "Priya", "Mahmud", "Lamia", "Fahim", "Sharmin", "Nabil", "Ishrat", "Zayan",
  "Rashida", "Omar", "Tahmina", "Shakib", "Anika", "Rizwan",
];

const LAST_NAMES = [
  "Rahman", "Ahmed", "Hossain", "Islam", "Chowdhury", "Karim", "Siddique",
  "Bhuiyan", "Mollah", "Talukder", "Sarker", "Mahmood", "Alam", "Haque", "Khan",
];

const PRODUCTS = [
  { name: "Aurora Wireless Headphones", sku: "AUR-WH-001", price: 189.0 },
  { name: "Nimbus Mechanical Keyboard", sku: "NIM-KB-114", price: 142.5 },
  { name: "Vertex 27\" 4K Monitor", sku: "VTX-MN-274", price: 429.0 },
  { name: "Corsa Ergonomic Chair", sku: "COR-CH-088", price: 615.0 },
  { name: "Lumen Desk Lamp", sku: "LUM-DL-032", price: 74.25 },
  { name: "Slate Laptop Stand", sku: "SLT-LS-009", price: 58.0 },
  { name: "Echo USB-C Hub (8-port)", sku: "ECH-HB-800", price: 96.75 },
  { name: "Pulse Fitness Tracker", sku: "PLS-FT-220", price: 134.0 },
  { name: "Drift Noise-Cancelling Earbuds", sku: "DRF-EB-015", price: 168.0 },
  { name: "Atlas Standing Desk", sku: "ATL-SD-160", price: 789.0 },
  { name: "Terra Webcam 1440p", sku: "TER-WC-144", price: 112.0 },
  { name: "Onyx Portable SSD 2TB", sku: "ONX-SD-2TB", price: 214.5 },
];

const CITIES = [
  { city: "Dhaka", postcode: "1212" },
  { city: "Chattogram", postcode: "4000" },
  { city: "Sylhet", postcode: "3100" },
  { city: "Khulna", postcode: "9100" },
  { city: "Rajshahi", postcode: "6000" },
  { city: "Barishal", postcode: "8200" },
];

/**
 * Status distribution is weighted rather than uniform so the dashboard looks
 * like a real business (most orders complete) instead of an even six-way split.
 */
const STATUS_WEIGHTS: Array<[OrderStatus, number]> = [
  ["delivered", 46],
  ["shipped", 18],
  ["processing", 14],
  ["pending", 12],
  ["cancelled", 7],
  ["refunded", 3],
];

function weightedStatus(): OrderStatus {
  const total = STATUS_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
  let roll = rand() * total;
  for (const [status, weight] of STATUS_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return status;
  }
  return "delivered";
}

/* -------------------------------------------------------------------------- */

/** Anchor date. Orders are generated backwards from here across 180 days. */
const NOW = new Date("2026-09-17T09:00:00.000Z");
const DAY_MS = 86_400_000;

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

/* ----------------------------- Customers ---------------------------------- */

function buildCustomers(count: number): Customer[] {
  const customers: Customer[] = [];
  for (let i = 0; i < count; i += 1) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const joinedDaysAgo = randomInt(10, 900);
    customers.push({
      id: `cus_${String(i + 1).padStart(4, "0")}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
      joinedAt: new Date(NOW.getTime() - joinedDaysAgo * DAY_MS).toISOString(),
      // "Active" is a stored flag here; in a real system it would be derived
      // from recent order activity.
      isActive: rand() > 0.28,
      totalSpent: 0,
      orderCount: 0,
    });
  }
  return customers;
}

/* ------------------------------- Orders ----------------------------------- */

function buildOrders(customers: Customer[], count: number): OrderDetail[] {
  const orders: OrderDetail[] = [];

  for (let i = 0; i < count; i += 1) {
    const customer = pick(customers);
    const daysAgo = randomInt(0, 179);
    // Spread orders through the working day rather than all at midnight.
    const placedAt = new Date(
      NOW.getTime() - daysAgo * DAY_MS - randomInt(0, 12) * 3_600_000,
    );

    const lineCount = randomInt(1, 4);
    const items: OrderItem[] = [];
    for (let j = 0; j < lineCount; j += 1) {
      const product = pick(PRODUCTS);
      items.push({
        id: `itm_${i + 1}_${j + 1}`,
        productName: product.name,
        sku: product.sku,
        quantity: randomInt(1, 3),
        unitPrice: product.price,
      });
    }

    const subtotal = round2(
      items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    );
    const shipping = subtotal > 500 ? 0 : round2(randomInt(5, 18) + rand());
    const tax = round2(subtotal * 0.075);
    const total = round2(subtotal + shipping + tax);
    const place = pick(CITIES);

    orders.push({
      id: `ord_${String(i + 1).padStart(5, "0")}`,
      reference: `FSB-${placedAt.getUTCFullYear()}-${String(i + 1).padStart(5, "0")}`,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      status: weightedStatus(),
      placedAt: placedAt.toISOString(),
      subtotal,
      shipping,
      tax,
      total,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      items,
      shippingAddress: {
        line1: `House ${randomInt(1, 220)}, Road ${randomInt(1, 30)}`,
        city: place.city,
        postcode: place.postcode,
        country: "Bangladesh",
      },
      notes: rand() > 0.82 ? "Please call before delivery." : null,
    });
  }

  // Newest first — the API preserves this unless a sort is requested.
  return orders.sort(
    (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime(),
  );
}

/* ------------------------------ Activities -------------------------------- */

const ACTIVITY_TEMPLATES: Array<{ level: ActivityLevel; actor: string; message: string }> = [
  { level: "success", actor: "billing-service", message: "Payment captured successfully" },
  { level: "success", actor: "fulfilment", message: "Shipment handed to courier" },
  { level: "info", actor: "auth-service", message: "New admin session started" },
  { level: "info", actor: "catalogue", message: "Product pricing synced from ERP" },
  { level: "info", actor: "webhook", message: "Inventory webhook processed" },
  { level: "warning", actor: "inventory", message: "Stock level below reorder threshold" },
  { level: "warning", actor: "billing-service", message: "Payment retry scheduled" },
  { level: "warning", actor: "api-gateway", message: "Elevated response times detected" },
  { level: "error", actor: "billing-service", message: "Card declined by issuer" },
  { level: "error", actor: "sync-worker", message: "ERP sync failed, will retry" },
];

function buildActivities(count: number): SystemActivity[] {
  const activities: SystemActivity[] = [];
  for (let i = 0; i < count; i += 1) {
    const template = pick(ACTIVITY_TEMPLATES);
    activities.push({
      id: `act_${String(i + 1).padStart(4, "0")}`,
      level: template.level,
      actor: template.actor,
      message: template.message,
      occurredAt: new Date(
        NOW.getTime() - i * randomInt(3, 90) * 60_000,
      ).toISOString(),
    });
  }
  return activities.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

/* -------------------------------------------------------------------------- */

const customers = buildCustomers(180);
const orders = buildOrders(customers, 420);
const activities = buildActivities(60);

// Roll order totals back onto the customer records so the two stay consistent.
for (const order of orders) {
  const customer = customers.find((c) => c.id === order.customerId);
  if (!customer) continue;
  if (order.status !== "cancelled" && order.status !== "refunded") {
    customer.totalSpent = round2(customer.totalSpent + order.total);
    customer.orderCount += 1;
  }
}

export const db = {
  customers,
  orders,
  activities,
  /** Anchor "today" so analytics windows are reproducible. */
  now: NOW,
} as const;

export { isoDate, DAY_MS };
