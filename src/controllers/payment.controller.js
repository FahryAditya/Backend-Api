const crypto = require('crypto');
const https = require('https');
const PaymentOrder = require('../models/PaymentOrder');
const Member = require('../models/Member');
const Transaction = require('../models/Transaction');

// Helper untuk HTTP request ke Midtrans
function callMidtransApi(endpoint, method, body = null, serverKey = '', customHost = null) {
  return new Promise((resolve, reject) => {
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    const host = customHost || (isProduction ? 'api.midtrans.com' : 'api.sandbox.midtrans.com');
    const authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64');

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    };

    if (body) {
      headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = https.request({
      hostname: host,
      port: 443,
      path: endpoint,
      method: method,
      headers: headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (_) {
          resolve({ statusCode: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// 1. Buat Order Pembayaran Baru (QRIS / DANA)
exports.createOrder = async (req, res) => {
  try {
    const { memberId, allocatedWeeks, period, amount, adminFee = 0, paymentType = 'qris' } = req.body;

    if (!memberId || !allocatedWeeks || !Array.isArray(allocatedWeeks) || allocatedWeeks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Data memberId dan allocatedWeeks (daftar tanggal Kamis) wajib disertakan.',
      });
    }

    // Cari data siswa
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Data anggota tidak ditemukan.',
      });
    }

    // Proteksi Server: Cek apakah minggu yang dipilih sudah pernah dibayar
    const existingPayments = await Transaction.find({
      memberId: member._id,
      isVoid: false,
      allocatedWeeks: { $in: allocatedWeeks },
    });

    if (existingPayments.length > 0) {
      const alreadyPaidDates = [];
      existingPayments.forEach(t => {
        if (Array.isArray(t.allocatedWeeks)) {
          t.allocatedWeeks.forEach(w => {
            if (allocatedWeeks.includes(w) && !alreadyPaidDates.includes(w)) {
              alreadyPaidDates.push(w);
            }
          });
        }
      });

      return res.status(409).json({
        success: false,
        message: `Pembayaran ditolak: Siswa "${member.name}" sudah membayar kas untuk tanggal (${alreadyPaidDates.join(', ')}).`,
      });
    }

    // Generate Order ID Unik
    const orderId = `KAS-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const totalAmount = Number(amount) + Number(adminFee);
    const expiredAt = new Date(Date.now() + 15 * 60 * 1000); // 15 Menit expired

    let qrCodeUrl = null;
    let qrString = null;
    let deeplinkUrl = null;
    let pgResponse = null;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (serverKey && serverKey.trim().length > 0) {
      try {
        const midtransPayload = {
          transaction_details: {
            order_id: orderId,
            gross_amount: totalAmount,
          },
          item_details: [
            {
              id: `KAS-${allocatedWeeks.length}W`,
              price: totalAmount,
              quantity: 1,
              name: `Kas OSIS - ${member.name} (${allocatedWeeks.length} Minggu)`,
            },
          ],
          customer_details: {
            first_name: member.name,
            notes: member.role || 'Anggota OSIS',
          },
        };

        if (paymentType === 'gopay') {
          midtransPayload.payment_type = 'gopay';
          midtransPayload.gopay = {
            enable_callback: true,
            callback_url: 'uangkas://payment/finish',
          };
        } else {
          // Default: QRIS (Support DANA, GoPay, OVO, ShopeePay, M-Banking)
          midtransPayload.payment_type = 'qris';
          midtransPayload.qris = {
            acquirer: 'gopay',
          };
        }

        const mtRes = await callMidtransApi('/v2/charge', 'POST', midtransPayload, serverKey);
        pgResponse = mtRes.data;

        if (mtRes.data && mtRes.data.actions) {
          const qrAction = mtRes.data.actions.find(a => a.name === 'generate-qr-code');
          if (qrAction) qrCodeUrl = qrAction.url;

          const deeplinkAction = mtRes.data.actions.find(a => a.name === 'deeplink-redirect');
          if (deeplinkAction) deeplinkUrl = deeplinkAction.url;

          if (mtRes.data.qr_string) qrString = mtRes.data.qr_string;
        }

        // Jika Core API belum aktif (misal status 402 channel not activated), gunakan Midtrans Snap resmi
        if (!qrCodeUrl && !qrString) {
          const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
          const snapHost = isProduction ? 'app.midtrans.com' : 'app.sandbox.midtrans.com';
          const snapPayload = {
            transaction_details: {
              order_id: orderId,
              gross_amount: totalAmount,
            },
            item_details: midtransPayload.item_details,
            customer_details: midtransPayload.customer_details,
          };
          const snapRes = await callMidtransApi('/snap/v1/transactions', 'POST', snapPayload, serverKey, snapHost);
          if (snapRes.data && snapRes.data.redirect_url) {
            deeplinkUrl = snapRes.data.redirect_url;
            qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(snapRes.data.redirect_url)}`;
            pgResponse = snapRes.data;
          }
        }
      } catch (err) {
        console.warn('Gagal menghubungi Midtrans API:', err.message);
      }
    }

    // Jika Midtrans QR String belum didapat (atau fallback), buat format standar
    if (!qrString && paymentType !== 'gopay') {
      qrString = `00020101021226600016ID.CO.QRIS.WWW01189360099900000000000215${orderId}51450015ID.OR.OSIS.SKAR0215${member._id}520458125303360540${totalAmount}5802ID5913OSIS SKARLAKES6009BALIKPAPAN6304ABCD`;
    }
    if (!qrCodeUrl && qrString) {
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(qrString)}`;
    }
    if (!deeplinkUrl && qrString) {
      deeplinkUrl = `https://link.dana.id/m/qris?data=${encodeURIComponent(qrString)}`;
    }

    // Simpan ke database
    const newOrder = await PaymentOrder.create({
      orderId,
      memberId: member._id,
      memberName: member.name,
      memberRole: member.role || '',
      allocatedWeeks,
      period: period || allocatedWeeks[0].substring(0, 7),
      amount: Number(amount),
      adminFee: Number(adminFee),
      totalAmount,
      paymentType,
      qrCodeUrl,
      qrString,
      deeplinkUrl,
      status: 'pending',
      expiredAt,
      paymentGatewayResponse: pgResponse,
    });

    res.status(201).json({
      success: true,
      message: 'Order pembayaran QRIS berhasil dibuat.',
      data: newOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat order pembayaran QRIS.',
      error: error.message,
    });
  }
};

// 2. Cek Status Pembayaran Real-time
exports.getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await PaymentOrder.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order pembayaran tidak ditemukan.',
      });
    }

    // Jika pending dan sudah lewat expiredAt, tandai expired
    if (order.status === 'pending' && new Date() > new Date(order.expiredAt)) {
      order.status = 'expired';
      await order.save();
      return res.status(200).json({
        success: true,
        data: order,
      });
    }

    // Jika status masih pending dan ada Midtrans Server Key, sinkronkan langsung ke Midtrans API
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (order.status === 'pending' && serverKey) {
      try {
        const mtRes = await callMidtransApi(`/v2/${orderId}/status`, 'GET', null, serverKey);
        if (mtRes.data && (mtRes.data.transaction_status === 'settlement' || mtRes.data.transaction_status === 'capture')) {
          order.status = 'paid';
          order.paidAt = new Date();
          await order.save();

          // Auto-insert transaksi kas
          await createKasTransactionFromOrder(order);
        } else if (mtRes.data && (mtRes.data.transaction_status === 'expire' || mtRes.data.transaction_status === 'cancel')) {
          order.status = 'expired';
          await order.save();
        }
      } catch (err) {
        console.warn('Gagal cek status ke Midtrans:', err.message);
      }
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal memeriksa status pembayaran.',
      error: error.message,
    });
  }
};

// 3. Webhook Notifikasi dari Payment Gateway (Midtrans)
exports.handleWebhook = async (req, res) => {
  try {
    const notification = req.body || {};
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = notification;

    // Jika ini adalah test ping dari Midtrans Dashboard tanpa order_id atau dummy test order
    if (!order_id || order_id.toLowerCase().includes('test')) {
      return res.status(200).json({
        success: true,
        message: 'Midtrans test notification successfully received and acknowledged',
      });
    }

    // Validasi Signature Key jika Server Key terpasang
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (serverKey && signature_key && gross_amount && status_code) {
      const hash = crypto
        .createHash('sha512')
        .update(order_id + status_code + gross_amount + serverKey)
        .digest('hex');

      if (hash !== signature_key) {
        console.warn('Webhook signature mismatch for order:', order_id);
      }
    }

    const order = await PaymentOrder.findOne({ orderId: order_id });
    if (!order) {
      // Return 200 OK agar Midtrans mencatat notifikasi diterima
      return res.status(200).json({
        success: true,
        message: `Order ${order_id} tidak ditemukan di sistem lokal, diabaikan.`,
      });
    }

    // Jika status settlement atau capture (berhasil dibayar)
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      if (order.status !== 'paid') {
        order.status = 'paid';
        order.paidAt = new Date();
        order.paymentGatewayResponse = notification;
        await order.save();

        // Otomatis masukkan kas ke koleksi Transaction
        await createKasTransactionFromOrder(order);
      }
    } else if (transaction_status === 'expire') {
      order.status = 'expired';
      await order.save();
    } else if (transaction_status === 'cancel') {
      order.status = 'cancelled';
      await order.save();
    }

    return res.status(200).json({ success: true, message: 'Webhook diproses' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ success: true, message: 'Notification received with catch', error: error.message });
  }
};

// 4. Simulasi Bayar untuk Uji Coba Sandbox / Demo UI
exports.simulatePayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await PaymentOrder.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order tidak ditemukan.',
      });
    }

    if (order.status === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Order sudah lunas sebelumnya.',
        data: order,
      });
    }

    order.status = 'paid';
    order.paidAt = new Date();
    await order.save();

    const createdTx = await createKasTransactionFromOrder(order);

    res.status(200).json({
      success: true,
      message: 'Simulasi pembayaran berhasil! Kas otomatis tercatat.',
      data: {
        order,
        transaction: createdTx,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal melakukan simulasi pembayaran.',
      error: error.message,
    });
  }
};

// Helper internal: Buat Transaksi Kas Resmi saat Order Lunas (Strictly Idempotent)
async function createKasTransactionFromOrder(order) {
  // 1. Cek apakah transaksi sudah pernah terikat pada order ini
  if (order.transactionId) {
    const existing = await Transaction.findById(order.transactionId);
    if (existing) return existing;
  }

  // 2. Proteksi Idempotency: Cek apakah transaksi dengan orderId ini sudah ada di database
  const existingByOrder = await Transaction.findOne({
    memberId: order.memberId,
    note: { $regex: order.orderId },
  });
  if (existingByOrder) {
    order.transactionId = existingByOrder._id.toString();
    await order.save();
    return existingByOrder;
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const weeksDesc = order.allocatedWeeks.length === 1 
    ? order.allocatedWeeks[0] 
    : `${order.allocatedWeeks[0]} s/d ${order.allocatedWeeks[order.allocatedWeeks.length - 1]}`;

  const newTx = await Transaction.create({
    type: 'in',
    title: `Kas OSIS (QRIS) - ${order.memberName} (${order.allocatedWeeks.length} Minggu)`,
    category: 'Kas Anggota',
    amount: order.amount,
    date: dateStr,
    time: timeStr,
    recorder: 'System Gateway (QRIS)',
    iconBrand: 'kas',
    memberId: order.memberId,
    period: order.period,
    allocatedWeeks: order.allocatedWeeks,
    weeksCount: order.allocatedWeeks.length,
    walletType: 'digital',
    note: `Pembayaran otomatis via QRIS / DANA (Order: ${order.orderId}, Periode: ${weeksDesc})`,
    isVoid: false,
  });

  order.transactionId = newTx._id.toString();
  await order.save();

  return newTx;
}
