const Partner        = require('../../models/Partner');
const PartnerPayment = require('../../models/PartnerPayment');

exports.getAll = async (req, res) => {
  const partners = await Partner.find({ hotelId: req.hotelId, isActive: true }).sort({ companyName: 1 });
  res.json({ success: true, data: { partners } });
};

exports.create = async (req, res) => {
  const partner = await Partner.create({ ...req.body, hotelId: req.hotelId });
  res.status(201).json({ success: true, message: 'Partner created', data: { partner } });
};

exports.update = async (req, res) => {
  const partner = await Partner.findOneAndUpdate({ _id: req.params.id, hotelId: req.hotelId }, req.body, { new: true });
  if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
  res.json({ success: true, message: 'Partner updated', data: { partner } });
};

exports.remove = async (req, res) => {
  await Partner.findOneAndUpdate({ _id: req.params.id, hotelId: req.hotelId }, { isActive: false });
  res.json({ success: true, message: 'Partner removed' });
};

exports.getPayments = async (req, res) => {
  const { status, partnerId, search } = req.query;
  const filter = { hotelId: req.hotelId };
  if (status)    filter.status    = status;
  if (partnerId) filter.partnerId = partnerId;
  if (search)    filter.guestName = { $regex: search, $options: 'i' };

  const payments = await PartnerPayment.find(filter)
    .populate('partnerId', 'companyName contactEmail')
    .sort({ createdAt: -1 })
    .limit(100);

  const [pendingAgg, paidAgg] = await Promise.all([
    PartnerPayment.aggregate([{ $match: { hotelId: req.hotelId, status: 'pending' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    PartnerPayment.aggregate([{ $match: { hotelId: req.hotelId, status: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
  ]);

  res.json({ success: true, data: { payments, stats: { pendingTotal: pendingAgg[0]?.total||0, paidTotal: paidAgg[0]?.total||0 } } });
};

exports.createPayment = async (req, res) => {
  const receiptRef = `PRE-${Date.now().toString(36).toUpperCase()}`;
  const payment = await PartnerPayment.create({ ...req.body, hotelId: req.hotelId, receiptRef, status: 'pending' });
  const populated = await PartnerPayment.findById(payment._id).populate('partnerId', 'companyName contactEmail contactName');
  res.status(201).json({ success: true, message: 'Partner payment created', data: { payment: populated } });
};

exports.markPaid = async (req, res) => {
  const payment = await PartnerPayment.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId },
    { status: 'paid', paidAt: new Date() },
    { new: true }
  ).populate('partnerId', 'companyName contactEmail');
  if (!payment) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Marked as paid', data: { payment } });
};

exports.sendReceipt = async (req, res) => {
  const Hotel   = require('../../models/Hotel');
  const nodemailer = require('nodemailer');

  const payment = await PartnerPayment.findById(req.params.id).populate('partnerId');
  if (!payment) return res.status(404).json({ success: false, message: 'Not found' });

  // Get this hotel's name from DB — dynamic per hotel
  const hotel     = await Hotel.findById(payment.hotelId).select('name');
  const hotelName = hotel?.name || 'Hotel';

  const partner = payment.partnerId;
  const emailTo = req.body.overrideEmail || partner.contactEmail;

  // Fixed Gmail credentials — sender is always eqabo
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'ridwanhassan101@gmail.com',
      pass: 'szdb lbqd pwpe lesi',
    },
  });

  const itemsHtml = (payment.items || []).map(i =>
    `<tr>
      <td style="padding:8px 14px;border-bottom:1px solid #f0f0f0;color:#444">${i.label}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700">$${i.amount}</td>
    </tr>`
  ).join('');

  const mailOptions = {
    from: '"Eqabo Hotel Platform" <eqabo@gmail.com>',
    to: emailTo,
    subject: `Invoice ${payment.receiptRef} from ${hotelName}`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a2e">
        <div style="background:linear-gradient(135deg,#051937,#32265c,#6d2a75,#eb1271);padding:28px 24px;border-radius:14px 14px 0 0;color:#fff">
          <div style="font-size:22px;font-weight:800;letter-spacing:-.5px">Corporate Invoice</div>
          <div style="font-size:12px;opacity:.65;margin-top:4px">${payment.receiptRef} · Sent by Eqabo</div>
        </div>
        <div style="background:#f9f9fc;padding:24px;border-radius:0 0 14px 14px">
          <p style="margin:0 0 6px;font-size:15px">Dear <strong>${partner.contactName || partner.companyName}</strong>,</p>
          <p style="margin:0 0 18px;color:#555;font-size:13px">
            Please find below the invoice for your employee's stay at <strong>${hotelName}</strong>.
          </p>

          <!-- Stay details -->
          <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
            <tr style="background:#f3e8ff">
              <td style="padding:9px 14px;font-size:12px;color:#6d2a75;font-weight:600;width:120px">Hotel</td>
              <td style="padding:9px 14px;font-weight:700">${hotelName}</td>
            </tr>
            <tr>
              <td style="padding:9px 14px;font-size:12px;color:#666">Guest</td>
              <td style="padding:9px 14px;font-weight:600">${payment.guestName}</td>
            </tr>
            <tr style="background:#f9f9fc">
              <td style="padding:9px 14px;font-size:12px;color:#666">Booking Ref</td>
              <td style="padding:9px 14px;font-family:monospace;color:#6d2a75;font-size:12px">${payment.bookingRef || '—'}</td>
            </tr>
            <tr>
              <td style="padding:9px 14px;font-size:12px;color:#666">Room</td>
              <td style="padding:9px 14px;font-weight:600">${payment.roomNumber || '—'}</td>
            </tr>
          </table>

          <!-- Items -->
          <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
            <thead>
              <tr style="background:#e8e8f0">
                <th style="padding:9px 14px;text-align:left;font-size:12px;color:#555">Item</th>
                <th style="padding:9px 14px;text-align:right;font-size:12px;color:#555">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr style="background:linear-gradient(135deg,#32265c,#6d2a75);color:#fff">
                <td style="padding:11px 14px;font-weight:700;font-size:14px">TOTAL DUE</td>
                <td style="padding:11px 14px;text-align:right;font-size:20px;font-weight:800">$${payment.totalAmount}</td>
              </tr>
            </tfoot>
          </table>

          <p style="color:#888;font-size:12px;margin:0">
            Please settle this invoice within 30 days.<br>
            For queries, contact <strong>${hotelName}</strong> directly or reply to this email.
          </p>
          <div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#aaa">
            Sent via <strong>Eqabo</strong> Hotel Management Platform
          </div>
        </div>
      </div>
    `,
  };

  let emailSent = false;
  let emailError = null;

  try {
    await transporter.sendMail(mailOptions);
    emailSent = true;
  } catch (err) {
    emailError = err.message;
  }

  await PartnerPayment.findByIdAndUpdate(payment._id, { status: 'sent', sentAt: new Date() });

  res.json({
    success: true,
    message: emailSent
      ? `Receipt emailed to ${emailTo} from ${hotelName}`
      : `Invoice recorded but email failed: ${emailError}`,
    data: { emailSent, emailTo, emailError, receiptRef: payment.receiptRef, hotelName },
  });
};
