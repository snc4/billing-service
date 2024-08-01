import { stripeSecrets } from 'src/local.config';

export const STRIPE_WEBHOOK_SECRETS: { [x: string]: string } = {
  'checkout.session.completed': stripeSecrets.webhookKeys.checkoutSessionCompleted,
  'invoice.paid': stripeSecrets.webhookKeys.invoicePaid,
  'customer.subscription.updated': stripeSecrets.webhookKeys.customerSubscriptionUpdated,
  'customer.subscription.created': stripeSecrets.webhookKeys.customerSubscriptionCreated,
  'customer.subscription.deleted': stripeSecrets.webhookKeys.customerSubscriptionDeleted,
  'charge.refunded': stripeSecrets.webhookKeys.chargeRefunded,
  'charge.refund.updated': stripeSecrets.webhookKeys.chargeRefundUpdated,
  test: stripeSecrets.webhookTestKey,
};
