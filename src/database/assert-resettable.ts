import 'reflect-metadata';

/**
 * Gate in front of `npm run reset`.
 *
 * The reset drops every table, including the leads a form has already
 * captured. That is exactly what you want locally and never what you want on
 * the server, where the same command is one wrong shell away from destroying
 * the submissions the deployment exists to collect.
 *
 * NODE_ENV=production is set in the VPS `.env`, so sourcing it — which every
 * deploy and every manual PM2 restart does — makes this refuse by default.
 * ALLOW_PRODUCTION_RESET=yes is the deliberate override.
 */
const isProduction = process.env.NODE_ENV === 'production';
const override = process.env.ALLOW_PRODUCTION_RESET === 'yes';

if (isProduction && !override) {
  console.error('Refusing to reset: NODE_ENV=production.');
  console.error('');
  console.error('This drops every table, leads included. If that is genuinely');
  console.error('what you want, re-run it as:');
  console.error('');
  console.error('  ALLOW_PRODUCTION_RESET=yes npm run reset');
  process.exit(1);
}

if (isProduction) {
  console.warn('Resetting a production database — ALLOW_PRODUCTION_RESET is set.');
}
