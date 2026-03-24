import crypto from 'crypto';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { addCredits, logEvent, EVENTS } from './creditService.js';
import config from '../config/index.js';
import { bot } from '../bot/index.js';

const ROBOKASSA_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx';

export const CREDIT_PACKAGES = {
  10: { credits: 10, price: 290, name: '10 токенов' },
  50: { credits: 50, price: 990, name: '50 токенов' }
};

export const generatePaymentLink = async (userId, creditsAmount) => {
  const pkg = CREDIT_PACKAGES[creditsAmount];
  if (!pkg) {
    throw new Error('Invalid package');
  }

  const user = await User.findOne({ telegram_id: userId });
  if (!user) {
    throw new Error('User not found');
  }

  const invId = Date.now();
  const outSum = pkg.price.toFixed(2);
  const description = `Покупка ${pkg.name}`;

  const signatureString = `${config.robokassa.merchantLogin}:${outSum}:${invId}:${config.robokassa.password1}:Shp_credits=${creditsAmount}:Shp_user_id=${userId}`;
  const signatureValue = crypto.createHash('md5').update(signatureString).digest('hex').toLowerCase();

  const payment = await Payment.create({
    user_id: user._id,
    provider: 'robokassa',
    status: 'pending',
    amount: pkg.price,
    credits_purchased: pkg.credits,
    provider_payment_id: invId.toString(),
    meta: {
      credits_amount: creditsAmount,
      description
    }
  });

  const url = new URL(ROBOKASSA_URL);
  url.searchParams.set('MerchantLogin', config.robokassa.merchantLogin);
  url.searchParams.set('OutSum', outSum);
  url.searchParams.set('InvId', invId);
  url.searchParams.set('Description', description);
  url.searchParams.set('SignatureValue', signatureValue);
  url.searchParams.set('IsTest', config.robokassa.isTest ? '1' : '0');
  url.searchParams.set('Shp_user_id', userId.toString());
  url.searchParams.set('Shp_credits', creditsAmount.toString());
  url.searchParams.set('ResultURL', `${config.robokassa.callbackUrl}/payment/success`);
  url.searchParams.set('FailURL', `${config.robokassa.callbackUrl}/payment/fail`);

  return {
    url: url.toString(),
    paymentId: payment._id,
    invId,
    credits: pkg.credits,
    price: pkg.price
  };
};

export const verifyResultSignature = (params) => {
  const { OutSum, InvId, SignatureValue, Shp_user_id, Shp_credits } = params;

  if (!OutSum || !SignatureValue) {
    return false;
  }

  const signatureString = `${OutSum}:${InvId}:${config.robokassa.password2}:Shp_credits=${Shp_credits}:Shp_user_id=${Shp_user_id}`;
  const expectedSignature = crypto.createHash('md5').update(signatureString).digest('hex').toLowerCase();

  console.log('=== Signature Verification ===');
  console.log('SignatureString:', signatureString);
  console.log('Expected:', expectedSignature);
  console.log('Received:', SignatureValue.toLowerCase());

  return SignatureValue.toLowerCase() === expectedSignature;
};

export const processPayment = async (params) => {
  const { OutSum, InvId, Shp_user_id, Shp_credits } = params;

  const userId = parseInt(Shp_user_id);
  const creditsAmount = parseInt(Shp_credits);
  const amount = parseFloat(OutSum);

  const payment = await Payment.findOne({
    provider_payment_id: InvId.toString(),
    provider: 'robokassa'
  });

  if (!payment) {
    console.error('Payment not found:', InvId);
    return false;
  }

  if (payment.status === 'completed') {
    console.log('Payment already completed:', InvId);
    return true;
  }

  const pkg = CREDIT_PACKAGES[creditsAmount];
  if (!pkg || payment.amount !== amount) {
    console.error('Invalid payment amount:', { expected: payment.amount, actual: amount });
    return false;
  }

  payment.status = 'completed';
  payment.paid_at = new Date();
  await payment.save();

  await addCredits(userId, creditsAmount);
  await logEvent(userId, EVENTS.PAYMENT_SUCCESS, creditsAmount, { amount, provider: 'robokassa' });

  try {
    await bot.telegram.sendMessage(
      userId,
      `✅ *Оплата успешно завершена!*\n\nНа ваш счёт добавлено *${creditsAmount}* токенов.`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('Failed to notify user:', err);
  }

  return true;
};

export const getPaymentStatus = async (invId) => {
  return Payment.findOne({ provider_payment_id: invId.toString() });
};
