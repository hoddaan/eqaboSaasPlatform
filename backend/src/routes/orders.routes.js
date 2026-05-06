const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/orders/orders.controller');
const { protect, authorize, tenantScope } = require('../middleware/auth');
const staff = [protect, authorize('SuperAdmin','CompanyAdmin','HotelAdmin','Manager','Receptionist','RestaurantStaff','Finance'), tenantScope];

// Dashboard (must be before /:id)
router.get('/dashboard',              ...staff, ctrl.getDashboard);

// Categories (must be before /:id)
router.get('/categories',             ...staff, ctrl.getCategories);
router.post('/categories',            ...staff, ctrl.createCategory);
router.put('/categories/:id',         ...staff, ctrl.updateCategory);
router.delete('/categories/:id',      ...staff, ctrl.deleteCategory);

// Tables (must be before /:id)
router.get('/tables/all',             ...staff, ctrl.getTables);
router.post('/tables',                ...staff, ctrl.createTable);
router.put('/tables/:id',             ...staff, ctrl.updateTable);
router.delete('/tables/:id',          ...staff, ctrl.deleteTable);

// Store (must be before /:id)
router.get('/store/items',            ...staff, ctrl.getStore);
router.post('/store/items',           ...staff, ctrl.createStoreItem);
router.put('/store/items/:id',        ...staff, ctrl.updateStoreItem);
router.delete('/store/items/:id',     ...staff, ctrl.deleteStoreItem);

// Store Movements (must be before /:id)
router.get('/store/movements',        ...staff, ctrl.getMovements);
router.post('/store/movements',       ...staff, ctrl.addMovement);

// Orders (/:id routes go last)
router.get('/',                       ...staff, ctrl.getOrders);
router.post('/',                      ...staff, ctrl.createOrder);
router.get('/:id',                    ...staff, ctrl.getOrder);
router.patch('/:id/status',           ...staff, ctrl.updateOrderStatus);
router.post('/:id/items',             ...staff, ctrl.addItems);
router.delete('/:id',                 ...staff, ctrl.deleteOrder);

module.exports = router;
