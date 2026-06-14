import express from 'express';
import cors from 'cors';
import { createX402Router } from './services/x402/routes.js';
import { settings } from './services/settings/settings.js';

export function createGatewayApp({ dispatch, brokerState, inFlight }) {
  const app = express();
  app.use(cors({
    exposedHeaders: ['payment-required', 'payment-signature', 'payment-response', 'facilitator-url']
  }));
  app.use(express.json());

  // Mount the x402 router + diagnostic endpoints in one place.
  app.use('/', createX402Router({
    gatewayAddress: settings.sui.address,
    dispatch,
    brokerState,
    inFlight,
  }));

  return app;
}
