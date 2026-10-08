import Razorpay from 'razorpay';
import crypto from 'crypto';
import env from '../config/env.js';

const isMock = env.PAYMENTS_MODE === 'mock';

// In-memory mock store for test/mock runs
const mockOrderStore = new Map();

class MockRazorpayClient {
  constructor() {
    this.orders = {
      create: async ({ amount, currency = 'INR', receipt, notes }) => {
        const orderId = `order_mock_${crypto.randomUUID().replace(/-/g, '').substring(0, 14)}`;
        const order = {
          id: orderId,
          amount, // in paise
          currency,
          receipt,
          status: 'created',
          notes: notes || {}
        };
        mockOrderStore.set(orderId, order);
        return order;
      },
      fetch: async (orderId) => {
        const order = mockOrderStore.get(orderId);
        if (!order) {
          return {
            id: orderId,
            amount: 99900,
            currency: 'INR',
            status: 'created',
            notes: {}
          };
        }
        return order;
      }
    };

    this.payments = {
      fetch: async (paymentId) => {
        return {
          id: paymentId,
          amount: 99900,
          currency: 'INR',
          status: 'captured'
        };
      }
    };
  }
}

export const razorpayInstance = isMock
  ? new MockRazorpayClient()
  : new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET
    });

export const createOrder = async ({ amount, receipt, notes }) => {
  return razorpayInstance.orders.create({
    amount: Math.round(amount * 100), // convert rupees to paise
    currency: 'INR',
    receipt,
    notes
  });
};

export const fetchOrder = async (orderId) => {
  return razorpayInstance.orders.fetch(orderId);
};

export const verifyPaymentSignature = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const secret = env.RAZORPAY_KEY_SECRET || 'test_secret';
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf-8'),
    Buffer.from(razorpay_signature, 'utf-8')
  );
};

export const verifyWebhookSignature = (rawBody, signature) => {
  const secret = env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (signature.length !== expectedSignature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf-8'),
    Buffer.from(signature, 'utf-8')
  );
};

export default razorpayInstance;
