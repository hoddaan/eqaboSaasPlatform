const { RestaurantOrder, MenuItem, Table, StoreItem } = require('../../models/index');

// ── ORDERS ─────────────────────────────────────────────
exports.getOrders = async (req, res) => {
  const { status, type, date, tableNumber } = req.query;
  const filter = { hotelId: req.hotelId };
  if (status)      filter.status = status;
  if (type)        filter.type   = type;
  if (tableNumber) filter.tableNumber = tableNumber;
  if (date) {
    const d = new Date(date); d.setHours(0,0,0,0);
    filter.createdAt = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
  } else {
    // Default: today
    const d = new Date(); d.setHours(0,0,0,0);
    filter.createdAt = { $gte: d };
  }
  const orders = await RestaurantOrder.find(filter)
    .populate('staffId', 'name')
    .populate('roomId', 'roomNumber')
    .sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, data: { orders } });
};

exports.getOrder = async (req, res) => {
  const order = await RestaurantOrder.findOne({ _id: req.params.id, hotelId: req.hotelId })
    .populate('staffId', 'name').populate('roomId', 'roomNumber');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, data: { order } });
};

exports.createOrder = async (req, res) => {
  const { type, tableNumber, tableId, roomId, bookingId, guestName, roomNumber, items, notes, discountPct = 0 } = req.body;
  const menuIds  = items.map(i => i.menuItemId).filter(Boolean);
  const menuItems = menuIds.length ? await MenuItem.find({ _id: { $in: menuIds }, hotelId: req.hotelId }) : [];

  const orderItems = items.map(item => {
    if (item.menuItemId) {
      const mi = menuItems.find(m => m._id.toString() === item.menuItemId);
      if (!mi) throw { statusCode: 400, message: `Menu item not found` };
      return { menuItemId: mi._id, name: mi.name, qty: item.qty, unitPrice: mi.price, subtotal: mi.price * item.qty };
    }
    // Custom item (no menuItemId)
    return { name: item.name, qty: item.qty, unitPrice: item.unitPrice, subtotal: item.unitPrice * item.qty };
  });

  const subtotal    = orderItems.reduce((s, i) => s + i.subtotal, 0);
  const taxRate     = 5;
  const taxAmount   = +(subtotal * taxRate / 100).toFixed(2);
  const discountAmt = +(subtotal * discountPct / 100).toFixed(2);
  const totalAmount = +(subtotal + taxAmount - discountAmt).toFixed(2);

  const order = await RestaurantOrder.create({
    hotelId: req.hotelId, type, tableNumber, tableId: tableId||null,
    roomId: roomId||null, bookingId: bookingId||null, guestName: guestName||null,
    roomNumber: roomNumber||null,
    staffId: req.user._id, items: orderItems, subtotal, taxRate, taxAmount,
    discountPct, discountAmt, totalAmount, notes,
  });

  // Mark table occupied
  if (tableId) {
    await Table.findByIdAndUpdate(tableId, { status: 'occupied', currentOrderId: order._id });
  }

  res.status(201).json({ success: true, message: 'Order created', data: { order } });
};

exports.updateOrderStatus = async (req, res) => {
  const { status, paymentMethod, discountPct } = req.body;
  const update = { status };
  if (paymentMethod) update.paymentMethod = paymentMethod;

  const order = await RestaurantOrder.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId }, update, { new: true }
  ).populate('staffId', 'name');

  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  // Free table when order paid/cancelled
  if (['paid','cancelled'].includes(status) && order.tableId) {
    await Table.findByIdAndUpdate(order.tableId, { status: 'available', currentOrderId: null });
  }
  res.json({ success: true, message: 'Order updated', data: { order } });
};

exports.deleteOrder = async (req, res) => {
  const order = await RestaurantOrder.findOneAndDelete({ _id: req.params.id, hotelId: req.hotelId });
  if (order?.tableId) await Table.findByIdAndUpdate(order.tableId, { status: 'available', currentOrderId: null });
  res.json({ success: true, message: 'Order deleted' });
};

// ── RESTAURANT DASHBOARD ──────────────────────────────
exports.getDashboard = async (req, res) => {
  const d = new Date(); d.setHours(0,0,0,0);
  const todayFilter = { hotelId: req.hotelId, createdAt: { $gte: d } };

  const [orders, tables, activeOrders] = await Promise.all([
    RestaurantOrder.find(todayFilter),
    Table.find({ hotelId: req.hotelId, isActive: true }),
    RestaurantOrder.find({ hotelId: req.hotelId, status: { $in: ['pending','preparing','served'] } })
      .populate('staffId','name').sort({ createdAt: 1 }),
  ]);

  const todayRevenue  = orders.filter(o => o.status==='paid').reduce((s,o) => s+o.totalAmount, 0);
  const todayOrders   = orders.length;
  const pendingOrders = orders.filter(o => ['pending','preparing'].includes(o.status)).length;
  const tablesOccupied = tables.filter(t => t.status==='occupied').length;

  res.json({ success: true, data: { todayRevenue, todayOrders, pendingOrders, tablesOccupied, totalTables: tables.length, activeOrders } });
};

// ── MENU ──────────────────────────────────────────────
exports.getMenu = async (req, res) => {
  const { category, all } = req.query;
  const filter = { hotelId: req.hotelId };
  if (!all) filter.isAvailable = true;
  if (category) filter.category = category;
  const items = await MenuItem.find(filter).sort({ category: 1, sortOrder: 1, name: 1 });
  res.json({ success: true, data: { items } });
};

exports.createMenuItem = async (req, res) => {
  const item = await MenuItem.create({ ...req.body, hotelId: req.hotelId });
  res.status(201).json({ success: true, data: { item } });
};

exports.updateMenuItem = async (req, res) => {
  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId }, req.body, { new: true }
  );
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: { item } });
};

exports.deleteMenuItem = async (req, res) => {
  await MenuItem.findOneAndUpdate({ _id: req.params.id, hotelId: req.hotelId }, { isAvailable: false });
  res.json({ success: true, message: 'Menu item hidden' });
};

// ── TABLES ─────────────────────────────────────────────
exports.getTables = async (req, res) => {
  const tables = await Table.find({ hotelId: req.hotelId, isActive: true })
    .populate('currentOrderId', 'orderNumber totalAmount status items createdAt')
    .sort({ number: 1 });
  res.json({ success: true, data: { tables } });
};

exports.createTable = async (req, res) => {
  const table = await Table.create({ ...req.body, hotelId: req.hotelId });
  res.status(201).json({ success: true, data: { table } });
};

exports.updateTable = async (req, res) => {
  const table = await Table.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId }, req.body, { new: true }
  );
  res.json({ success: true, data: { table } });
};

exports.deleteTable = async (req, res) => {
  await Table.findOneAndUpdate({ _id: req.params.id, hotelId: req.hotelId }, { isActive: false });
  res.json({ success: true });
};

// ── STORE / INVENTORY ─────────────────────────────────
exports.getStore = async (req, res) => {
  const items = await StoreItem.find({ hotelId: req.hotelId }).sort({ category: 1, name: 1 });
  res.json({ success: true, data: { items } });
};

exports.createStoreItem = async (req, res) => {
  const item = await StoreItem.create({ ...req.body, hotelId: req.hotelId });
  res.status(201).json({ success: true, data: { item } });
};

exports.updateStoreItem = async (req, res) => {
  const item = await StoreItem.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.hotelId }, req.body, { new: true }
  );
  res.json({ success: true, data: { item } });
};

exports.deleteStoreItem = async (req, res) => {
  await StoreItem.findOneAndDelete({ _id: req.params.id, hotelId: req.hotelId });
  res.json({ success: true });
};

// ── MENU CATEGORIES ────────────────────────────────────
const { MenuCategory } = require('../../models/index');
const DEFAULT_CATS = [
  { name:'breakfast', icon:'🌅' }, { name:'lunch', icon:'☀️' },
  { name:'dinner', icon:'🌙' },   { name:'salads', icon:'🥗' },
  { name:'snacks', icon:'🍟' },   { name:'coffee', icon:'☕' },
  { name:'drinks', icon:'🥤' },   { name:'desserts', icon:'🍰' },
  { name:'specials', icon:'⭐' },
];

exports.getCategories = async (req, res) => {
  let cats = await MenuCategory.find({ hotelId: req.hotelId, isActive: true }).sort({ sortOrder: 1, name: 1 });
  // Seed defaults if none exist
  if (!cats.length) {
    await MenuCategory.insertMany(DEFAULT_CATS.map((c,i) => ({ ...c, hotelId: req.hotelId, sortOrder: i })));
    cats = await MenuCategory.find({ hotelId: req.hotelId, isActive: true }).sort({ sortOrder: 1 });
  }
  res.json({ success: true, data: { categories: cats } });
};

exports.createCategory = async (req, res) => {
  const count = await MenuCategory.countDocuments({ hotelId: req.hotelId });
  const cat = await MenuCategory.create({ ...req.body, hotelId: req.hotelId, sortOrder: count });
  res.status(201).json({ success: true, data: { category: cat } });
};

exports.updateCategory = async (req, res) => {
  const cat = await MenuCategory.findOneAndUpdate({ _id: req.params.id, hotelId: req.hotelId }, req.body, { new: true });
  res.json({ success: true, data: { category: cat } });
};

exports.deleteCategory = async (req, res) => {
  await MenuCategory.findOneAndUpdate({ _id: req.params.id, hotelId: req.hotelId }, { isActive: false });
  res.json({ success: true });
};

// ── STORE MOVEMENTS ─────────────────────────────────────
const { StoreMovement } = require('../../models/index');

exports.getMovements = async (req, res) => {
  const { itemId, type, limit = 50 } = req.query;
  const filter = { hotelId: req.hotelId };
  if (itemId) filter.itemId = itemId;
  if (type)   filter.type   = type;

  const movements = await StoreMovement.find(filter)
    .populate('performedBy', 'name')
    .populate('itemId', 'name unit')
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  res.json({ success: true, data: { movements } });
};

exports.addMovement = async (req, res) => {
  const { itemId, type, reason, quantity, unitCost = 0, supplier, reference, notes, destination } = req.body;

  const item = await StoreItem.findOne({ _id: itemId, hotelId: req.hotelId });
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

  const qty = Number(quantity);
  const delta = type === 'in' ? qty : -qty;
  const newBalance = Math.max(0, (item.quantity || 0) + delta);

  // Update stock
  await StoreItem.findByIdAndUpdate(itemId, {
    quantity: newBalance,
    ...(type === 'in' && supplier ? { supplier } : {}),
    ...(type === 'in' && unitCost  ? { costPrice: unitCost } : {}),
  });

  const movement = await StoreMovement.create({
    hotelId:      req.hotelId,
    itemId,
    itemName:     item.name,
    type,
    reason,
    quantity:     qty,
    unitCost:     Number(unitCost),
    totalCost:    type === 'in' ? +(qty * unitCost).toFixed(2) : 0,
    supplier,
    reference,
    notes,
    destination:  destination || (type === 'in' ? 'general' : 'kitchen'),
    performedBy:  req.user._id,
    balanceAfter: newBalance,
  });

  const updatedItem = await StoreItem.findById(itemId);
  res.status(201).json({ success: true, message: `Stock ${type === 'in' ? 'added' : 'issued'}`, data: { movement, item: updatedItem } });
};

// ── ADD ITEMS TO EXISTING ORDER ────────────────────────
exports.addItems = async (req, res) => {
  const { items } = req.body;
  const order = await RestaurantOrder.findOne({ _id: req.params.id, hotelId: req.hotelId });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (['paid','cancelled'].includes(order.status)) {
    return res.status(400).json({ success: false, message: 'Cannot add items to a ' + order.status + ' order' });
  }

  const menuIds = items.map((i) => i.menuItemId).filter(Boolean);
  const menuItems = menuIds.length ? await MenuItem.find({ _id: { $in: menuIds }, hotelId: req.hotelId }) : [];

  for (const item of items) {
    const newQty = item.qty || 1;
    let unitPrice = item.unitPrice || 0;
    let name = item.name || '';

    if (item.menuItemId) {
      const mi = menuItems.find(m => m._id.toString() === item.menuItemId);
      if (!mi) continue;
      unitPrice = mi.price;
      name = mi.name;
    }

    // If item already in order, add quantity
    const existing = order.items.find(i =>
      (item.menuItemId && i.menuItemId?.toString() === item.menuItemId) ||
      (!item.menuItemId && i.name === name)
    );

    if (existing) {
      existing.qty      += newQty;
      existing.subtotal  = +(existing.qty * existing.unitPrice).toFixed(2);
    } else {
      order.items.push({ menuItemId: item.menuItemId||null, name, qty: newQty, unitPrice, subtotal: +(newQty * unitPrice).toFixed(2) });
    }
  }

  // Recalculate totals
  const subtotal  = order.items.reduce((s, i) => s + i.subtotal, 0);
  const taxAmount = +(subtotal * order.taxRate / 100).toFixed(2);
  const discountAmt = +(subtotal * (order.discountPct||0) / 100).toFixed(2);
  const totalAmount = +(subtotal + taxAmount - discountAmt).toFixed(2);

  order.subtotal    = subtotal;
  order.taxAmount   = taxAmount;
  order.discountAmt = discountAmt;
  order.totalAmount = totalAmount;
  order.status      = 'pending'; // back to pending since new items added

  await order.save();
  res.json({ success: true, message: 'Items added', data: { order } });
};
