const express = require("express")
const app = express()
const cors = require("cors")
require('dotenv').config()
const jwt = require("jsonwebtoken")

const port = process.env.PORT || 5000

// middleware
app.use(cors())
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DBUSER}:${process.env.DBPASS}@cluster0.khwex9e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// JWT middleware to verify token
const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized access' });
    }
    req.decoded = decoded;
    next();
  });
};

// Middleware to verify admin role


async function run() {
  try {
    // await client.connect();

    const usersCollection = client.db("khanarDokanDB").collection("users");
    const menuCollection = client.db("khanarDokanDB").collection("menu");
    const reviewCollection = client.db("khanarDokanDB").collection("reviews")
    const cartCollection = client.db("khanarDokanDB").collection("carts")
    const ordersCollection = client.db("khanarDokanDB").collection("orders");
const reservationsCollection = client.db("khanarDokanDB").collection("reservations");
const supportCollection = client.db("khanarDokanDB").collection("support");

const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await usersCollection.findOne(query);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  if (!isAdmin) {
    return res.status(403).send({ message: 'Forbidden access' });
  }
  next();
};

// Middleware to verify super admin role
const verifySuperAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await usersCollection.findOne(query);
  const isSuperAdmin = user?.role === 'superadmin';
  if (!isSuperAdmin) {
    return res.status(403).send({ message: 'Super admin access required' });
  }
  next();
};
    // JWT token generation
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    });

    // Create user with default role
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null });
      }

      // Set default role as 'user'
      user.role = user.role || 'user';
      user.createdAt = new Date();
      
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Get all users (Admin and Super Admin only)
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
// Update user profile (Authenticated user can update their own profile)
app.patch('/users/:id', async (req, res) => {
  const userId = req.params.id;
  const email = req.decoded.email;
  const updateData = req.body;
  
  try {
    // First, verify that the user is updating their own profile
    const user = await usersCollection.findOne({ email });
    if (!user || user._id.toString() !== userId) {
      return res.status(403).send({ message: 'Unauthorized to update this profile' });
    }
    
    const filter = { _id: new ObjectId(userId) };
    const updateDoc = {
      $set: {
        displayName: updateData.displayName,
        phone: updateData.phone,
        address: updateData.address,
        bio: updateData.bio
      }
    };
    
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).send({ message: 'Failed to update profile' });
  }
});

    // Check if user is admin
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden access' });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin' || user?.role === 'superadmin';
      }
      res.send({ admin });
    });

    // Check if user is super admin
    app.get('/users/superadmin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden access' });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let superadmin = false;
      if (user) {
        superadmin = user?.role === 'superadmin';
      }
      res.send({ superadmin });
    });

    // Delete user (Super Admin only)
    app.delete("/users/:id", verifyToken, verifySuperAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // Make user admin (Super Admin only)
    app.patch("/users/admin/:id", verifyToken, verifySuperAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin"
        }
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Make user super admin (Only existing Super Admin can do this)
    app.patch("/users/superadmin/:id", verifyToken, verifySuperAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "superadmin"
        }
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Demote admin to user (Super Admin only)
    app.patch("/users/demote/:id", verifyToken, verifySuperAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "user"
        }
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Get menu
    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
// Add these routes after your existing menu GET route

// Add menu item (Admin only)
app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const menuItem = req.body;
    menuItem.createdAt = new Date();
    const result = await menuCollection.insertOne(menuItem);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'Failed to add menu item', error: error.message });
  }
});

// Update menu item (Admin only)
app.put('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const menuItem = req.body;
    menuItem.updatedAt = new Date();
    
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = { $set: menuItem };
    
    const result = await menuCollection.updateOne(filter, updatedDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'Failed to update menu item', error: error.message });
  }
});

// Delete menu item (Admin only)
app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await menuCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'Failed to delete menu item', error: error.message });
  }
});
    // Get reviews
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
// Add this inside the `run()` function after defining `reviewCollection`

// POST a new review
app.post("/reviews", async (req, res) => {
  const newReview = req.body;
  const result = await reviewCollection.insertOne(newReview);
  res.send(result);
});
app.delete("/reviews/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await reviewCollection.deleteOne(query);
  res.send(result);
});
    // Cart operations
    app.post("/carts", verifyToken, async (req, res) => {
      const cartItems = req.body;
      const result = await cartCollection.insertOne(cartItems);
      res.send(result);
    });

    app.get("/carts", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/carts/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/carts", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ message: "Email is required" });
      const result = await cartCollection.deleteMany({ email });
      res.send(result);
    });
    // orders

// / Create payment intent
app.post('/create-payment-intent', verifyToken, async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).send({ error: 'Invalid amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).send({ error: 'Failed to create payment intent' });
  }
});

// Create order after successful payment
app.post('/orders', verifyToken, async (req, res) => {
  try {
    const orderData = req.body;
    
    // Validate required fields
    if (!orderData.email || !orderData.items || !orderData.totalPrice) {
      return res.status(400).send({ error: 'Missing required order data' });
    }

    // Add additional order metadata
    orderData.createdAt = new Date();
    orderData.updatedAt = new Date();
    
    const result = await ordersCollection.insertOne(orderData);
    res.send(result);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).send({ error: 'Failed to create order' });
  }
});

// Get user's orders
app.get('/orders', verifyToken, async (req, res) => {
  try {
    const email = req.query.email;
    
    if (!email) {
      return res.status(400).send({ error: 'Email is required' });
    }

    // Verify that the user can only access their own orders
    if (email !== req.decoded.email) {
      return res.status(403).send({ message: 'Forbidden access' });
    }

    const query = { email: email };
    const result = await ordersCollection.find(query).sort({ orderDate: -1 }).toArray();
    res.send(result);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send({ error: 'Failed to fetch orders' });
  }
});

// Get all orders (Admin only)
app.get('/admin/orders', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await ordersCollection.find().sort({ orderDate: -1 }).toArray();
    res.send(result);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).send({ error: 'Failed to fetch orders' });
  }
});

// Update order status (Admin only)
app.patch('/admin/orders/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { deliveryStatus } = req.body;
    
    if (!deliveryStatus) {
      return res.status(400).send({ error: 'Delivery status is required' });
    }

    const validStatuses = ['pending', 'processing', 'delivered', 'cancelled'];
    if (!validStatuses.includes(deliveryStatus)) {
      return res.status(400).send({ error: 'Invalid delivery status' });
    }

    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        deliveryStatus: deliveryStatus,
        updatedAt: new Date()
      }
    };

    const result = await ordersCollection.updateOne(filter, updateDoc);
    
    if (result.matchedCount === 0) {
      return res.status(404).send({ error: 'Order not found' });
    }

    res.send(result);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).send({ error: 'Failed to update order status' });
  }
});

// Get order statistics (Admin only)
app.get('/admin/order-stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalOrders = await ordersCollection.countDocuments();
    const totalRevenue = await ordersCollection.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$totalPrice' }
        }
      }
    ]).toArray();

    const statusCounts = await ordersCollection.aggregate([
      {
        $group: {
          _id: '$deliveryStatus',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Monthly revenue for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await ordersCollection.aggregate([
      {
        $match: {
          orderDate: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
          },
          revenue: { $sum: '$totalPrice' },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]).toArray();

    res.send({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      statusCounts,
      monthlyRevenue
    });
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).send({ error: 'Failed to fetch order statistics' });
  }
});

// Get single order details (User can view their own, Admin can view all)
app.get('/orders/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const order = await ordersCollection.findOne(query);

    if (!order) {
      return res.status(404).send({ error: 'Order not found' });
    }

    // Check if user can access this order
    const userEmail = req.decoded.email;
    const isAdmin = await usersCollection.findOne({ 
      email: userEmail, 
      role: { $in: ['admin', 'superadmin'] } 
    });

    if (!isAdmin && order.email !== userEmail) {
      return res.status(403).send({ message: 'Forbidden access' });
    }

    res.send(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).send({ error: 'Failed to fetch order' });
  }
});

// Cancel order (User can cancel their own pending orders)
app.patch('/orders/:id/cancel', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const userEmail = req.decoded.email;
    
    const order = await ordersCollection.findOne({ _id: new ObjectId(id) });
    
    if (!order) {
      return res.status(404).send({ error: 'Order not found' });
    }

    if (order.email !== userEmail) {
      return res.status(403).send({ message: 'Forbidden access' });
    }

    if (order.deliveryStatus !== 'pending') {
      return res.status(400).send({ error: 'Only pending orders can be cancelled' });
    }

    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        deliveryStatus: 'cancelled',
        updatedAt: new Date()
      }
    };

    const result = await ordersCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).send({ error: 'Failed to cancel order' });
  }
});

// Get orders by date range (Admin only)
app.get('/admin/orders/date-range', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).send({ error: 'Start date and end date are required' });
    }

    const query = {
      orderDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const result = await ordersCollection.find(query).sort({ orderDate: -1 }).toArray();
    res.send(result);
  } catch (error) {
    console.error('Error fetching orders by date range:', error);
    res.status(500).send({ error: 'Failed to fetch orders' });
  }
});
// Add this endpoint to your existing order routes

// Delete order (Admin only)
app.delete('/admin/orders/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    
    // Check if order exists
    const order = await ordersCollection.findOne({ _id: new ObjectId(id) });
    if (!order) {
      return res.status(404).send({ error: 'Order not found' });
    }

    // Optional: Prevent deletion of delivered orders for record keeping
    // Uncomment the following lines if you want to restrict deletion
    /*
    if (order.deliveryStatus === 'delivered') {
      return res.status(400).send({ 
        error: 'Cannot delete delivered orders for record keeping purposes' 
      });
    }
    */

    const result = await ordersCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).send({ error: 'Order not found' });
    }

    res.send({ 
      message: 'Order deleted successfully',
      deletedOrderId: id,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).send({ error: 'Failed to delete order' });
  }
});

// Alternative: Soft delete (marks as deleted but keeps in database)
app.patch('/admin/orders/:id/soft-delete', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.decoded.email
      }
    };

    const result = await ordersCollection.updateOne(filter, updateDoc);
    
    if (result.matchedCount === 0) {
      return res.status(404).send({ error: 'Order not found' });
    }

    res.send({ 
      message: 'Order soft deleted successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error soft deleting order:', error);
    res.status(500).send({ error: 'Failed to delete order' });
  }
});


// Add these routes to your existing server.js file after the orders section

// Reservation Collection

// Create a new reservation
app.post('/reservations', async (req, res) => {
  try {
    const reservation = req.body;
    
    // Validate required fields
    if (!reservation.customerName || !reservation.email || !reservation.phone || 
        !reservation.date || !reservation.time || !reservation.guests) {
      return res.status(400).send({ error: 'Missing required reservation data' });
    }

    // Add metadata
    reservation.createdAt = new Date();
    reservation.updatedAt = new Date();
    reservation.status = reservation.status || 'pending';
    
    // Generate reservation ID
    const count = await reservationsCollection.countDocuments();
    reservation.reservationId = `R${String(count + 1).padStart(3, '0')}`;

    const result = await reservationsCollection.insertOne(reservation);
    res.send(result);
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).send({ error: 'Failed to create reservation' });
  }
});

// Get all reservations (Admin only)
app.get('/admin/reservations', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status, date, search } = req.query;
    let query = {};

    // Build query based on filters
    if (status && status !== 'all') {
      query.status = status;
    }
    if (date) {
      query.date = date;
    }
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { reservationId: { $regex: search, $options: 'i' } }
      ];
    }

    const result = await reservationsCollection.find(query).sort({ createdAt: -1 }).toArray();
    res.send(result);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).send({ error: 'Failed to fetch reservations' });
  }
});

// Get user's reservations
app.get('/reservations', async (req, res) => {
  try {
    const email = req.query.email;
    
    if (!email) {
      return res.status(400).send({ error: 'Email is required' });
    }

    const query = { email: email };
    const result = await reservationsCollection.find(query).sort({ date: -1 }).toArray();
    res.send(result);
  } catch (error) {
    console.error('Error fetching user reservations:', error);
    res.status(500).send({ error: 'Failed to fetch reservations' });
  }
});

// Get single reservation
app.get('/reservations/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const reservation = await reservationsCollection.findOne(query);

    if (!reservation) {
      return res.status(404).send({ error: 'Reservation not found' });
    }

    res.send(reservation);
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).send({ error: 'Failed to fetch reservation' });
  }
});

// Update reservation (Admin only)
app.put('/admin/reservations/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.reservationId;
    
    updateData.updatedAt = new Date();

    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: updateData };

    const result = await reservationsCollection.updateOne(filter, updateDoc);
    
    if (result.matchedCount === 0) {
      return res.status(404).send({ error: 'Reservation not found' });
    }

    res.send(result);
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).send({ error: 'Failed to update reservation' });
  }
});

// Update reservation status (Admin only)
app.patch('/admin/reservations/:id/status', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).send({ error: 'Status is required' });
    }

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).send({ error: 'Invalid status' });
    }

    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        status: status,
        updatedAt: new Date()
      }
    };

    const result = await reservationsCollection.updateOne(filter, updateDoc);
    
    if (result.matchedCount === 0) {
      return res.status(404).send({ error: 'Reservation not found' });
    }

    res.send(result);
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).send({ error: 'Failed to update reservation status' });
  }
});

// Delete reservation (Admin only)
app.delete('/admin/reservations/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await reservationsCollection.deleteOne(query);
    
    if (result.deletedCount === 0) {
      return res.status(404).send({ error: 'Reservation not found' });
    }

    res.send(result);
  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(500).send({ error: 'Failed to delete reservation' });
  }
});

// Cancel reservation (User can cancel their own)
app.patch('/reservations/:id/cancel', async (req, res) => {
  try {
    const id = req.params.id;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).send({ error: 'Email is required' });
    }

    const reservation = await reservationsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!reservation) {
      return res.status(404).send({ error: 'Reservation not found' });
    }

    if (reservation.email !== email) {
      return res.status(403).send({ message: 'Forbidden access' });
    }

    if (reservation.status === 'cancelled') {
      return res.status(400).send({ error: 'Reservation already cancelled' });
    }

    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        status: 'cancelled',
        updatedAt: new Date()
      }
    };

    const result = await reservationsCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).send({ error: 'Failed to cancel reservation' });
  }
});

// Get reservation statistics (Admin only)
app.get('/admin/reservation-stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalReservations = await reservationsCollection.countDocuments();
    
    const statusCounts = await reservationsCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const todayReservations = await reservationsCollection.countDocuments({
      date: new Date().toISOString().split('T')[0]
    });

    const upcomingReservations = await reservationsCollection.countDocuments({
      date: { $gte: new Date().toISOString().split('T')[0] },
      status: { $in: ['pending', 'confirmed'] }
    });

    // Monthly reservations for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyReservations = await reservationsCollection.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]).toArray();

    // Table preferences
    const tablePreferences = await reservationsCollection.aggregate([
      {
        $group: {
          _id: '$table',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    res.send({
      totalReservations,
      statusCounts,
      todayReservations,
      upcomingReservations,
      monthlyReservations,
      tablePreferences
    });
  } catch (error) {
    console.error('Error fetching reservation statistics:', error);
    res.status(500).send({ error: 'Failed to fetch reservation statistics' });
  }
});

// Check table availability
app.get('/reservations/availability', async (req, res) => {
  try {
    const { date, time } = req.query;
    
    if (!date || !time) {
      return res.status(400).send({ error: 'Date and time are required' });
    }

    const query = {
      date: date,
      time: time,
      status: { $in: ['pending', 'confirmed'] }
    };

    const bookedReservations = await reservationsCollection.find(query).toArray();
    const bookedTables = bookedReservations.map(r => r.table);

    const allTables = ['Window View', 'Private Booth', 'Chef\'s Table', 'Garden Terrace'];
    const availableTables = allTables.filter(table => !bookedTables.includes(table));

    res.send({
      availableTables,
      bookedTables,
      totalSlots: allTables.length,
      availableSlots: availableTables.length
    });
  } catch (error) {
    console.error('Error checking table availability:', error);
    res.status(500).send({ error: 'Failed to check availability' });
  }
});

// Get reservations by date range (Admin only)
app.get('/admin/reservations/date-range', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).send({ error: 'Start date and end date are required' });
    }

    const query = {
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };

    const result = await reservationsCollection.find(query).sort({ date: 1, time: 1 }).toArray();
    res.send(result);
  } catch (error) {
    console.error('Error fetching reservations by date range:', error);
    res.status(500).send({ error: 'Failed to fetch reservations' });
  }
});








// Add these routes to your existing server.js file after the reservations section

// Support Collection - Add this to your collections section

// Create a new support ticket
app.post('/support', async (req, res) => {
  try {
    const supportTicket = req.body;
    
    // Validate required fields
    if (!supportTicket.name || !supportTicket.email || !supportTicket.subject || !supportTicket.message) {
      return res.status(400).send({ error: 'Missing required support ticket data' });
    }

    // Add metadata
    supportTicket.createdAt = new Date();
    supportTicket.updatedAt = new Date();
    supportTicket.status = supportTicket.status || 'open';
    supportTicket.priority = supportTicket.priority || 'medium';
    
    // Generate ticket ID
    const count = await supportCollection.countDocuments();
    supportTicket.ticketId = `T${String(count + 1).padStart(4, '0')}`;

    const result = await supportCollection.insertOne(supportTicket);
    res.send(result);
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).send({ error: 'Failed to create support ticket' });
  }
});

// Get all support tickets (Admin only)
app.get('/admin/support', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status, priority, search } = req.query;
    let query = {};

    // Build query based on filters
    if (status && status !== 'all') {
      query.status = status;
    }
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { ticketId: { $regex: search, $options: 'i' } }
      ];
    }

    const result = await supportCollection.find(query).sort({ createdAt: -1 }).toArray();
    res.send(result);
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).send({ error: 'Failed to fetch support tickets' });
  }
});

// Get user's support tickets
app.get('/support', async (req, res) => {
  try {
    const email = req.query.email;
    
    if (!email) {
      return res.status(400).send({ error: 'Email is required' });
    }

    const query = { email: email };
    const result = await supportCollection.find(query).sort({ createdAt: -1 }).toArray();
    res.send(result);
  } catch (error) {
    console.error('Error fetching user support tickets:', error);
    res.status(500).send({ error: 'Failed to fetch support tickets' });
  }
});

// Get single support ticket
app.get('/support/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const ticket = await supportCollection.findOne(query);

    if (!ticket) {
      return res.status(404).send({ error: 'Support ticket not found' });
    }

    res.send(ticket);
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    res.status(500).send({ error: 'Failed to fetch support ticket' });
  }
});

// Update support ticket status (Admin only)
app.patch('/admin/support/:id/status', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).send({ error: 'Status is required' });
    }

    const validStatuses = ['open', 'in-progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).send({ error: 'Invalid status' });
    }

    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        status: status,
        updatedAt: new Date()
      }
    };

    const result = await supportCollection.updateOne(filter, updateDoc);
    
    if (result.matchedCount === 0) {
      return res.status(404).send({ error: 'Support ticket not found' });
    }

    res.send(result);
  } catch (error) {
    console.error('Error updating support ticket status:', error);
    res.status(500).send({ error: 'Failed to update support ticket status' });
  }
});

// Update support ticket priority (Admin only)
app.patch('/admin/support/:id/priority', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { priority } = req.body;
    
    if (!priority) {
      return res.status(400).send({ error: 'Priority is required' });
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).send({ error: 'Invalid priority' });
    }

    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        priority: priority,
        updatedAt: new Date()
      }
    };

    const result = await supportCollection.updateOne(filter, updateDoc);
    
    if (result.matchedCount === 0) {
      return res.status(404).send({ error: 'Support ticket not found' });
    }

    res.send(result);
  } catch (error) {
    console.error('Error updating support ticket priority:', error);
    res.status(500).send({ error: 'Failed to update support ticket priority' });
  }
});

// Add admin response to support ticket
app.post('/admin/support/:id/response', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { response } = req.body;
    
    if (!response) {
      return res.status(400).send({ error: 'Response is required' });
    }

    const responseData = {
      message: response,
      respondedBy: req.decoded.email,
      respondedAt: new Date()
    };

    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $push: {
        responses: responseData
      },
      $set: {
        status: 'in-progress',
        updatedAt: new Date()
      }
    };

    const result = await supportCollection.updateOne(filter, updateDoc);
    
    if (result.matchedCount === 0) {
      return res.status(404).send({ error: 'Support ticket not found' });
    }

    res.send(result);
  } catch (error) {
    console.error('Error adding support ticket response:', error);
    res.status(500).send({ error: 'Failed to add response to support ticket' });
  }
});

// Delete support ticket (Admin only)
app.delete('/admin/support/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await supportCollection.deleteOne(query);
    
    if (result.deletedCount === 0) {
      return res.status(404).send({ error: 'Support ticket not found' });
    }

    res.send(result);
  } catch (error) {
    console.error('Error deleting support ticket:', error);
    res.status(500).send({ error: 'Failed to delete support ticket' });
  }
});

// Get support statistics (Admin only)
app.get('/admin/support-stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalTickets = await supportCollection.countDocuments();
    
    const statusCounts = await supportCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const priorityCounts = await supportCollection.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const openTickets = await supportCollection.countDocuments({
      status: { $in: ['open', 'in-progress'] }
    });

    const urgentTickets = await supportCollection.countDocuments({
      priority: 'urgent',
      status: { $in: ['open', 'in-progress'] }
    });

    // Monthly tickets for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTickets = await supportCollection.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]).toArray();

    // Category counts
    const categoryCounts = await supportCollection.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    res.send({
      totalTickets,
      statusCounts,
      priorityCounts,
      openTickets,
      urgentTickets,
      monthlyTickets,
      categoryCounts
    });
  } catch (error) {
    console.error('Error fetching support statistics:', error);
    res.status(500).send({ error: 'Failed to fetch support statistics' });
  }
});

// Get support tickets by date range (Admin only)
app.get('/admin/support/date-range', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).send({ error: 'Start date and end date are required' });
    }

    const query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const result = await supportCollection.find(query).sort({ createdAt: -1 }).toArray();
    res.send(result);
  } catch (error) {
    console.error('Error fetching support tickets by date range:', error);
    res.status(500).send({ error: 'Failed to fetch support tickets' });
  }
});











    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("khanar dokan running");
});

app.listen(port, () => {
  console.log(`dokan is running on ${port}`);
});