describe('Pedidos de cafetería', () => {
  beforeEach(() => {
    cy.request('POST', '/api/test/reset').its('status').should('eq', 204);
    cy.visit('/');
    cy.get('[data-testid="catalog"]').should('be.visible');
  });

  it('permite comprar, muestra ID y conserva el total persistido', () => {
    cy.intercept('POST', '/api/orders').as('createOrder');

    cy.get('[data-testid="add-product-latte"]').click();
    cy.get('[data-testid="increase-latte"]').click();
    cy.get('[data-testid="add-product-muffin"]').click();
    cy.screenshot('01-catalogo-productos-precios-disponibilidad');
    cy.get('[data-testid="cart-total"]').should('contain', '$9.75');
    cy.screenshot('02-carrito-total-calculado');
    cy.get('[data-testid="submit-order"]').click();

    cy.wait('@createOrder').then(({ request, response }) => {
      expect(request.body.items).to.deep.include.members([
        { productId: 'latte', quantity: 2 },
        { productId: 'muffin', quantity: 1 }
      ]);
      expect(response?.statusCode).to.eq(201);
      expect(response?.body.total).to.eq(9.75);
    });

    cy.get('[data-testid="order-success"]').should('be.visible').and('contain', 'CAF-');
    cy.screenshot('03-pedido-confirmado-id-total');
    cy.get('[data-testid="order-success"]').invoke('text').then((message) => {
      const orderId = message.match(/CAF-[A-Z0-9-]+/)?.[0];
      expect(orderId, 'ID del pedido').to.match(/^CAF-\d{8}-[A-F0-9]{8}$/);
      cy.request(`/api/orders/${orderId}`).its('body').should((order) => {
        expect(order.id).to.eq(orderId);
        expect(order.total).to.eq(9.75);
        expect(order.status).to.eq('confirmed');
        expect(order.items).to.have.length(2);
      });
    });
  });

  it('rechaza el carrito vacío sin enviar POST', () => {
    cy.intercept('POST', '/api/orders').as('createOrder');

    cy.get('[data-testid="submit-order"]').click();
    cy.get('[data-testid="order-error"]')
      .should('be.visible')
      .and('contain', 'Agrega al menos un producto');
    cy.screenshot('04-carrito-vacio-sin-post');
    cy.get('@createOrder.all').should('have.length', 0);
  });

  it('muestra error HTTP 500 simulado y recupera el pedido al reintentar', () => {
    cy.get('[data-testid="add-product-latte"]').click();
    let shouldFail = true;
    cy.intercept('POST', '/api/orders', (request) => {
      if (shouldFail) {
        shouldFail = false;
        request.reply({ statusCode: 500, body: { error: 'Fallo simulado del servicio de pedidos.' } });
      } else {
        request.continue();
      }
    }).as('orderRequest');

    cy.get('[data-testid="submit-order"]').click();
    cy.wait('@orderRequest').its('response.statusCode').should('eq', 500);
    cy.get('[data-testid="order-error"]')
      .should('be.visible')
      .and('contain', 'No se pudo confirmar el pedido')
      .and('contain', 'Fallo simulado');
    cy.screenshot('05-error-api-500-controlado');

    cy.get('[data-testid="submit-order"]').click();
    cy.wait('@orderRequest').its('response.statusCode').should('eq', 201);
    cy.get('[data-testid="order-success"]').should('be.visible').and('contain', 'Pedido confirmado');
    cy.screenshot('06-recuperacion-pedido-exitosa');
  });
});

