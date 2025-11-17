import type { Express } from "express";
import type { IStorage } from "../../storage";
import { buildEscrowRouter, buildGlobalEscrowRouter } from "./escrowRoutes";
import { buildInvoiceRouter } from "./invoiceRoutes";
import { buildWalletRouter } from "./walletRoutes";
import { buildRefundRouter, buildTaxRouter } from "./refundTaxRoutes";
import { buildDashboardRouter, buildTransactionsRouter } from "./analyticsRoutes";

import type { NotificationService } from "../../notifications";

interface PaymentRouteDeps {
  storage: IStorage;
  notificationService: NotificationService;
  isAuthenticated: any;
  requireEmailVerified: any;
  getUserIdFromRequest: (req: any) => string | null;
  isAdmin: any;
}

/**
 * Register all payment-related routes
 * Mounts escrow, invoice, wallet, refund/tax, and analytics routers
 */
export function registerPaymentRoutes(app: Express, deps: PaymentRouteDeps) {
  const { storage, notificationService, isAuthenticated, requireEmailVerified, getUserIdFromRequest, isAdmin } = deps;

  // Build all route modules with dependency injection
  const projectEscrowRouter = buildEscrowRouter({ 
    storage,
    notificationService,
    isAuthenticated, 
    requireEmailVerified, 
    getUserIdFromRequest, 
    isAdmin 
  });

  const globalEscrowRouter = buildGlobalEscrowRouter({
    storage,
    notificationService,
    isAuthenticated,
    requireEmailVerified,
    getUserIdFromRequest,
    isAdmin
  });
  
  const invoiceRouter = buildInvoiceRouter({ 
    storage,
    notificationService,
    isAuthenticated, 
    requireEmailVerified, 
    getUserIdFromRequest 
  });
  
  const walletRouter = buildWalletRouter({ 
    storage, 
    isAuthenticated, 
    requireEmailVerified, 
    getUserIdFromRequest 
  });
  
  const refundRouter = buildRefundRouter({ 
    storage,
    notificationService,
    isAuthenticated, 
    requireEmailVerified, 
    getUserIdFromRequest, 
    isAdmin 
  });

  const taxRouter = buildTaxRouter({
    storage,
    isAuthenticated,
    requireEmailVerified,
    getUserIdFromRequest
  });
  
  const dashboardRouter = buildDashboardRouter({ 
    storage, 
    isAuthenticated, 
    getUserIdFromRequest
  });

  const transactionsRouter = buildTransactionsRouter({
    storage,
    isAuthenticated,
    getUserIdFromRequest
  });

  // Mount routers with correct paths
  // Project-scoped escrow routes: /api/projects/:projectId/escrow/*
  app.use('/api/projects', projectEscrowRouter);
  
  // Global escrow routes: /api/escrow/*
  app.use('/api/escrow', globalEscrowRouter);
  
  // Invoice routes: /api/invoices/*
  app.use('/api/invoices', invoiceRouter);
  
  // Wallet routes: /api/wallet/*
  app.use('/api/wallet', walletRouter);
  
  // Refund routes: /api/refunds/*
  app.use('/api/refunds', refundRouter);

  // Tax routes: /api/tax/*
  app.use('/api/tax', taxRouter);
  
  // Dashboard routes: /api/dashboard/*
  app.use('/api/dashboard', dashboardRouter);

  // Transaction export routes: /api/transactions/*
  app.use('/api/transactions', transactionsRouter);

  console.log('[Payment Routes] All payment and escrow routes registered successfully');
}
