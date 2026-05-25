const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { total, descripcion, pedido_id, email } = JSON.parse(event.body);

  const preference = {
    items: [{
      title: descripcion || 'Pedido WeTech',
      quantity: 1,
      unit_price: Number(total),
      currency_id: 'MXN',
    }],
    payer: { email: email || 'cliente@wetech.mx' },
    external_reference: pedido_id,
    back_urls: {
      success: 'https://frabjous-stardust-8fef15.netlify.app/?status=success&pedido=' + pedido_id,
      failure: 'https://frabjous-stardust-8fef15.netlify.app/?status=failure',
      pending: 'https://frabjous-stardust-8fef15.netlify.app/?status=pending',
    },
    auto_return: 'approved',
    statement_descriptor: 'WETECH',
  };

  return new Promise((resolve) => {
    const body = JSON.stringify(preference);
    const options = {
      hostname: 'api.mercadopago.com',
      path: '/checkout/preferences',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.init_point) {
            resolve({
              statusCode: 200,
              headers: { 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ url: parsed.init_point }),
            });
          } else {
            resolve({
              statusCode: 500,
              body: JSON.stringify({ error: 'No init_point', detail: parsed }),
            });
          }
        } catch (e) {
          resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) });
    });

    req.write(body);
    req.end();
  });
};
