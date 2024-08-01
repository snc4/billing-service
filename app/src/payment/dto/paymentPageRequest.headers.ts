export type PaymentPageRequestHeaders = Headers & {
  'x-real-ip': string;
  'x-forwarded-for': string;
  'user-agent': string;
};
