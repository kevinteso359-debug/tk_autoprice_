const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
};

export const env = {
  adminUser: required('ADMIN_USER'),
  adminPass: required('ADMIN_PASS'),
  cronSecret: required('CRON_SECRET'),
  ebayClientId: required('EBAY_CLIENT_ID'),
  ebayClientSecret: required('EBAY_CLIENT_SECRET'),
  ebayClientRuName: process.env.EBAY_CLIENT_RUNAME || '',
  ebayUserRefreshToken: required('EBAY_USER_REFRESH_TOKEN'),
  ebaySiteId: process.env.EBAY_SITE_ID || '101',
  tradingCompatLevel: process.env.EBAY_TRADING_COMPAT_LEVEL || '1419',
};
