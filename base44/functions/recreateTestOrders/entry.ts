import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener usuarios
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    const testOrders = [
      {
        order_number: "ORD-TEST-001",
        customer_name: "Alfredo Torres",
        user_email: allUsers.find(u => u.full_name === "Alfredo Torres")?.email || "alfredotorres.niu@gmail.com",
        items: [
          {
            product_id: "test-1",
            product_name: "Producto Test",
            product_image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
            price: 29.99,
            quantity: 1
          }
        ],
        subtotal: 29.99,
        shipping_cost: 0,
        discount_amount: 0,
        total: 29.99,
        status: "pending",
        payment_method: "credit_card",
        payment_status: "pending_payment",
        customer_notes: "Orden de prueba"
      }
    ];

    const created = [];
    for (const orderData of testOrders) {
      const newOrder = await base44.asServiceRole.entities.Order.create(orderData);
      created.push(newOrder);
    }

    return Response.json({
      created_count: created.length,
      orders: created.map(o => ({
        id: o.id,
        order_number: o.order_number,
        user_email: o.user_email
      }))
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});