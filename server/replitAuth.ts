import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // Only secure in production
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  const email = claims["email"];
  const replitSub = claims["sub"];
  
  // Check if user exists by replitSub or email (to avoid duplicates)
  let existingUser = await storage.getUserByReplitSub(replitSub);
  if (!existingUser && email) {
    existingUser = await storage.getUserByEmail(email);
  }
  
  if (existingUser) {
    // Update existing user with OIDC data, preserving their original ID
    await storage.upsertUser({
      id: existingUser.id,
      email,
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      authProvider: "replit",
      replitSub,
    });
  } else {
    // Create new user with UUID ID
    await storage.upsertUser({
      id: replitSub, // Use replitSub as ID for new OIDC users
      email,
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      authProvider: "replit",
      replitSub,
    });
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (req: any) => {
    const protocol = req.protocol || 'https';
    const host = req.get('host') || req.hostname;
    const callbackURL = `${protocol}://${host}/api/callback`;
    const strategyName = `replitauth:${host}`;
    
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
    
    return strategyName;
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Store intended role in session if provided (will be passed via state param)
    const intendedRole = req.query.role as string;
    console.log('[/api/login] Received role:', intendedRole);
    
    const strategyName = ensureStrategy(req);
    
    // Pass role via OIDC state parameter to survive redirects
    const authOptions: any = {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    };
    
    // Include role in OIDC state if provided
    if (intendedRole === 'client' || intendedRole === 'consultant') {
      authOptions.state = JSON.stringify({ onboardingRole: intendedRole });
      console.log('[/api/login] Passing role via state parameter:', intendedRole);
    }
    
    passport.authenticate(strategyName, authOptions)(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const strategyName = ensureStrategy(req);
    passport.authenticate(strategyName, async (err: any, user: any) => {
      if (err || !user) {
        return res.redirect("/api/login");
      }

      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          return res.redirect("/api/login");
        }

        // Smart redirect based on profile status
        try {
          const email = user.claims?.email;
          const replitSub = user.claims?.sub;
          
          console.log('[/api/callback] OIDC user claims:', { email, replitSub });
          
          // Extract role from OIDC state parameter
          let intendedRole: string | undefined;
          try {
            const stateParam = req.query.state as string;
            if (stateParam) {
              const state = JSON.parse(stateParam);
              intendedRole = state.onboardingRole;
              console.log('[/api/callback] Extracted role from state:', intendedRole);
            }
          } catch (e) {
            console.log('[/api/callback] No valid state parameter');
          }
          
          // Look up the database user
          let dbUser = replitSub ? await storage.getUserByReplitSub(replitSub) : null;
          if (!dbUser && email) {
            dbUser = await storage.getUserByEmail(email);
          }

          if (!dbUser) {
            // Shouldn't happen since upsertUser runs in verify, but fallback to dashboard
            console.log('[/api/callback] No dbUser found, redirecting to dashboard');
            return res.redirect("/dashboard");
          }

          console.log('[/api/callback] Found dbUser:', dbUser.id);

          // Check if user has profiles
          const [clientProfile, consultantProfile] = await Promise.all([
            storage.getClientProfile(dbUser.id).catch(() => null),
            storage.getConsultantProfile(dbUser.id).catch(() => null),
          ]);

          console.log('[/api/callback] Profile status:', { 
            hasClientProfile: !!clientProfile, 
            hasConsultantProfile: !!consultantProfile 
          });

          // If user has profiles, go to dashboard
          if (clientProfile || consultantProfile) {
            console.log('[/api/callback] User has profiles, redirecting to dashboard');
            return res.redirect("/dashboard");
          }

          // New user onboarding: redirect to profile creation based on intended role
          console.log('[/api/callback] Intended role:', intendedRole);
          
          if (intendedRole === 'client') {
            console.log('[/api/callback] Redirecting to client onboarding');
            return res.redirect("/profile/client?onboarding=true");
          } else if (intendedRole === 'consultant') {
            console.log('[/api/callback] Redirecting to consultant onboarding');
            return res.redirect("/profile/consultant?onboarding=true");
          }
          
          // No role specified, default to dashboard
          console.log('[/api/callback] No role specified, redirecting to dashboard');
          return res.redirect("/dashboard");
        } catch (error) {
          console.error("Error in callback redirect logic:", error);
          return res.redirect("/dashboard");
        }
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
