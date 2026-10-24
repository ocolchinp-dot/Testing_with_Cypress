type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
};

type CartLine = Product & { quantity: number };

const currency = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'USD' });
const state: { products: Product[]; cart: Map<string, CartLine> } = { products: [], cart: new Map() };

const catalog = document.querySelector<HTMLDivElement>('#catalog')!;
const cartItems = document.querySelector<HTMLDivElement>('#cart-items')!;
const cartCount = document.querySelector<HTMLSpanElement>('#cart-count')!;
const cartTotal = document.querySelector<HTMLElement>('#cart-total')!;
const orderStatus = document.querySelector<HTMLDivElement>('#order-status')!;

function money(value: number): string {
  return currency.format(value);
}

function setStatus(kind: 'success' | 'error', title: string, detail: string): void {
  orderStatus.innerHTML = `<div class="status-message ${kind}" role="${kind === 'error' ? 'alert' : 'status'}" data-testid="${kind === 'error' ? 'order-error' : 'order-success'}"><strong>${title}</strong><span>${detail}</span></div>`;
}

function renderCatalog(): void {
  const icons: Record<string, string> = { latte: '☕', muffin: '🫐', sandwich: '🥪', tea: '🍵' };
  catalog.innerHTML = state.products.map((product) => `
    <article class="product-card ${product.available ? '' : 'unavailable'}" data-testid="product-${product.id}">
      <div>
        <div class="product-icon" aria-hidden="true">${icons[product.id] ?? '•'}</div>
        <h3>${product.name}</h3>
        <p class="product-description">${product.description}</p>
      </div>
      <div class="product-footer">
        <span class="price">${money(product.price)}</span>
        <button class="add-button" data-product-id="${product.id}" data-testid="add-product-${product.id}" type="button" ${product.available ? '' : 'disabled'}>${product.available ? 'Agregar' : 'Agotado'}</button>
      </div>
    </article>
  `).join('');
}

function renderCart(): void {
  const lines = [...state.cart.values()];
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
  cartCount.textContent = String(count);
  cartTotal.textContent = money(total);

  if (lines.length === 0) {
    cartItems.innerHTML = '<p class="empty-cart">Tu carrito está vacío. Agrega algo del menú para empezar.</p>';
    return;
  }

  cartItems.innerHTML = lines.map((line) => `
    <div class="cart-line" data-testid="cart-item-${line.id}">
      <div class="cart-line-heading"><span class="cart-line-name">${line.name}</span><span class="cart-line-price">${money(line.price * line.quantity)}</span></div>
      <div class="quantity-controls">
        <button class="quantity-button" data-action="decrease" data-product-id="${line.id}" data-testid="decrease-${line.id}" type="button" aria-label="Disminuir ${line.name}">−</button>
        <input class="quantity-input" data-action="input" data-product-id="${line.id}" data-testid="quantity-${line.id}" type="number" min="1" max="20" step="1" value="${line.quantity}" aria-label="Cantidad de ${line.name}" />
        <button class="quantity-button" data-action="increase" data-product-id="${line.id}" data-testid="increase-${line.id}" type="button" aria-label="Aumentar ${line.name}">+</button>
        <button class="remove-button" data-action="remove" data-product-id="${line.id}" data-testid="remove-${line.id}" type="button">Quitar</button>
      </div>
    </div>
  `).join('');
}

function addProduct(productId: string): void {
  const product = state.products.find((item) => item.id === productId);
  if (!product || !product.available) return;
  const current = state.cart.get(productId);
  state.cart.set(productId, { ...product, quantity: current ? Math.min(current.quantity + 1, 20) : 1 });
  orderStatus.innerHTML = '';
  renderCart();
}

function updateQuantity(productId: string, value: number): void {
  const line = state.cart.get(productId);
  if (!line) return;
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    setStatus('error', 'Cantidad no válida', 'Usa un número entero entre 1 y 20 para cada producto.');
    renderCart();
    return;
  }
  state.cart.set(productId, { ...line, quantity: value });
  orderStatus.innerHTML = '';
  renderCart();
}

catalog.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest<HTMLButtonElement>('[data-product-id]');
  if (button) addProduct(button.dataset.productId!);
});

cartItems.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest<HTMLButtonElement>('[data-action]');
  if (!button) return;
  const productId = button.dataset.productId!;
  const line = state.cart.get(productId);
  if (!line) return;
  if (button.dataset.action === 'remove') state.cart.delete(productId);
  if (button.dataset.action === 'increase') state.cart.set(productId, { ...line, quantity: Math.min(line.quantity + 1, 20) });
  if (button.dataset.action === 'decrease') {
    if (line.quantity === 1) state.cart.delete(productId);
    else state.cart.set(productId, { ...line, quantity: line.quantity - 1 });
  }
  renderCart();
});

cartItems.addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement;
  if (input.dataset.action === 'input') updateQuantity(input.dataset.productId!, Number(input.value));
});

document.querySelector<HTMLButtonElement>('#submit-order')!.addEventListener('click', async () => {
  if (state.cart.size === 0) {
    setStatus('error', 'No se puede confirmar', 'Agrega al menos un producto antes de enviar el pedido.');
    return;
  }
  const button = document.querySelector<HTMLButtonElement>('#submit-order')!;
  button.disabled = true;
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [...state.cart.values()].map(({ id, quantity }) => ({ productId: id, quantity })) })
    });
    const body = await response.json() as { id?: string; total?: number; error?: string };
    if (!response.ok) throw new Error(body.error ?? 'El servidor rechazó el pedido.');
    setStatus('success', '¡Pedido confirmado!', `ID: ${body.id} · Total: ${money(body.total ?? 0)}`);
    state.cart.clear();
    renderCart();
  } catch (error) {
    setStatus('error', 'No se pudo confirmar el pedido', error instanceof Error ? error.message : 'Inténtalo nuevamente.');
  } finally {
    button.disabled = false;
  }
});

document.querySelector<HTMLButtonElement>('#reset-demo')!.addEventListener('click', async () => {
  await fetch('/api/test/reset', { method: 'POST' });
  state.cart.clear();
  orderStatus.innerHTML = '';
  const response = await fetch('/api/products');
  state.products = await response.json() as Product[];
  renderCatalog();
  renderCart();
  setStatus('success', 'Datos reiniciados', 'El menú y el carrito están listos para otra prueba.');
});

async function load(): Promise<void> {
  const response = await fetch('/api/products');
  state.products = await response.json() as Product[];
  renderCatalog();
  renderCart();
}

void load();

