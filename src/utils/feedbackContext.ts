/**
 * Feedback Context Tracker
 *
 * Captures user actions, console errors, and API errors for debugging.
 * This context is sent with feedback submissions to help FastFixAI admins
 * diagnose issues - it is NOT visible to tenant users.
 */

// Types
export interface UserAction {
  type: 'click' | 'navigate' | 'form_submit' | 'input_change';
  timestamp: number;
  details: {
    element?: string;
    path?: string;
    formId?: string;
    inputName?: string;
  };
}

export interface ConsoleError {
  timestamp: number;
  message: string;
  stack?: string;
  type: 'error' | 'warn';
}

export interface ApiError {
  timestamp: number;
  endpoint: string;
  method: string;
  status?: number;
  message: string;
}

export interface FeedbackContext {
  userActions: UserAction[];
  consoleErrors: ConsoleError[];
  apiErrors: ApiError[];
  browserInfo: {
    userAgent: string;
    screenSize: { width: number; height: number };
    viewportSize: { width: number; height: number };
    url: string;
    timestamp: number;
  };
}

/**
 * Singleton tracker for capturing user context during feedback sessions
 */
class FeedbackContextTracker {
  private static instance: FeedbackContextTracker;
  private userActions: UserAction[] = [];
  private consoleErrors: ConsoleError[] = [];
  private apiErrors: ApiError[] = [];
  private maxActions = 20;
  private maxErrors = 10;
  private initialized = false;
  private originalConsoleError: typeof console.error | null = null;
  private originalFetch: typeof fetch | null = null;

  static getInstance(): FeedbackContextTracker {
    if (!FeedbackContextTracker.instance) {
      FeedbackContextTracker.instance = new FeedbackContextTracker();
    }
    return FeedbackContextTracker.instance;
  }

  /**
   * Initialize the tracker - should be called once on app mount
   */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Track clicks (capture phase to get all clicks)
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Build a meaningful selector
      const tagName = target.tagName.toLowerCase();
      const id = target.id ? `#${target.id}` : '';
      const classes = target.className && typeof target.className === 'string'
        ? `.${target.className.split(' ').filter(c => c && !c.startsWith('_')).slice(0, 2).join('.')}`
        : '';
      const text = target.textContent?.trim().slice(0, 30) || '';

      this.addAction({
        type: 'click',
        timestamp: Date.now(),
        details: {
          element: `${tagName}${id}${classes}${text ? ` "${text}"` : ''}`,
        }
      });
    }, true);

    // Track navigation
    const originalPushState = history.pushState.bind(history);
    history.pushState = (...args) => {
      this.addAction({
        type: 'navigate',
        timestamp: Date.now(),
        details: { path: args[2]?.toString() || window.location.pathname }
      });
      return originalPushState(...args);
    };

    const originalReplaceState = history.replaceState.bind(history);
    history.replaceState = (...args) => {
      this.addAction({
        type: 'navigate',
        timestamp: Date.now(),
        details: { path: args[2]?.toString() || window.location.pathname }
      });
      return originalReplaceState(...args);
    };

    // Listen for popstate (back/forward)
    window.addEventListener('popstate', () => {
      this.addAction({
        type: 'navigate',
        timestamp: Date.now(),
        details: { path: window.location.pathname }
      });
    });

    // Intercept console.error
    this.originalConsoleError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      this.addConsoleError({
        timestamp: Date.now(),
        message: args.map(a => {
          if (a instanceof Error) return a.message;
          if (typeof a === 'object') {
            try {
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          }
          return String(a);
        }).join(' '),
        stack: args[0] instanceof Error ? args[0].stack : undefined,
        type: 'error'
      });
      this.originalConsoleError?.(...args);
    };

    // Intercept console.warn for important warnings
    const originalWarn = console.warn.bind(console);
    console.warn = (...args: unknown[]) => {
      // Only capture react-related or critical warnings
      const message = String(args[0]);
      if (message.includes('React') || message.includes('Error') || message.includes('Warning')) {
        this.addConsoleError({
          timestamp: Date.now(),
          message: args.map(a => String(a)).join(' ').slice(0, 500),
          type: 'warn'
        });
      }
      originalWarn(...args);
    };

    // Intercept fetch for API errors
    this.originalFetch = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const [input, init] = args;
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || 'GET';

      try {
        const response = await this.originalFetch!(...args);

        // Only track errors (4xx, 5xx)
        if (!response.ok && response.status >= 400) {
          this.addApiError({
            timestamp: Date.now(),
            endpoint: url.replace(/^https?:\/\/[^\/]+/, ''), // Remove domain
            method: method.toUpperCase(),
            status: response.status,
            message: response.statusText || `HTTP ${response.status}`
          });
        }

        return response;
      } catch (err) {
        this.addApiError({
          timestamp: Date.now(),
          endpoint: url.replace(/^https?:\/\/[^\/]+/, ''),
          method: method.toUpperCase(),
          message: err instanceof Error ? err.message : 'Network error'
        });
        throw err;
      }
    };
  }

  private addAction(action: UserAction): void {
    this.userActions.push(action);
    if (this.userActions.length > this.maxActions) {
      this.userActions.shift();
    }
  }

  private addConsoleError(error: ConsoleError): void {
    // Dedupe similar errors within 1 second
    const lastError = this.consoleErrors[this.consoleErrors.length - 1];
    if (lastError &&
        lastError.message === error.message &&
        error.timestamp - lastError.timestamp < 1000) {
      return;
    }

    this.consoleErrors.push(error);
    if (this.consoleErrors.length > this.maxErrors) {
      this.consoleErrors.shift();
    }
  }

  private addApiError(error: ApiError): void {
    this.apiErrors.push(error);
    if (this.apiErrors.length > this.maxErrors) {
      this.apiErrors.shift();
    }
  }

  /**
   * Get the current context snapshot for submission
   */
  getContext(): FeedbackContext {
    return {
      userActions: [...this.userActions],
      consoleErrors: [...this.consoleErrors],
      apiErrors: [...this.apiErrors],
      browserInfo: {
        userAgent: navigator.userAgent,
        screenSize: { width: screen.width, height: screen.height },
        viewportSize: { width: window.innerWidth, height: window.innerHeight },
        url: window.location.href,
        timestamp: Date.now()
      }
    };
  }

  /**
   * Clear the context after successful submission
   */
  clearContext(): void {
    this.userActions = [];
    this.consoleErrors = [];
    this.apiErrors = [];
  }
}

export const feedbackTracker = FeedbackContextTracker.getInstance();
