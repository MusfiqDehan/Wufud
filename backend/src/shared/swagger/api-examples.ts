/**
 * Shared Swagger example payloads.
 * Every controller reuses these so each operation shows a short
 * description plus concrete request/response examples in `/api/docs`.
 */

export const successOf = (message: string, data: unknown) => ({
  success: true,
  message,
  data,
});

export const listOf = (message: string, items: unknown[]) => ({
  success: true,
  message,
  data: {
    items,
    pagination: { has_next: false, has_previous: false, page_size: 10 },
  },
});

export const ERR_UNAUTH = {
  success: false,
  message: "Authentication required.",
  error_code: "AUTHENTICATION_REQUIRED",
};

export const ERR_FORBIDDEN = {
  success: false,
  message: "You do not have permission to perform this action.",
  error_code: "PERMISSION_DENIED",
};

export const ERR_NOT_FOUND = {
  success: false,
  message: "The requested resource was not found.",
  error_code: "NOT_FOUND",
};

export const ERR_VALIDATION = {
  success: false,
  message: "Validation failed.",
  error_code: "VALIDATION_ERROR",
  errors: { email: ["Email must be valid."] },
};

export const EX_AUTH_LOGIN_RES = successOf("Signed in successfully.", {
  access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: {
    id: "01a0c07f-4757-70ab-b126-e0461b91bcc3",
    email: "admin@wufud.local",
    full_name: "Platform Admin",
  },
});

export const EX_PACKAGE_ITEM = {
  id: "01a0c07f-9ce1-72de-a92b-a0ff75a87d1b",
  name: "Hajj 2027",
  kind: "hajj",
  departureDate: "2027-05-20",
  tiers: [{ id: "01a0c07f-9ce2-75bb-b8d7-26dffd182b86", name: "Economy", price: "250000.00" }],
};

export const EX_BOOKING_RES = successOf("Booking created successfully.", {
  id: "01a0c095-151c-742e-98dc-3710cde36b60",
  status: "held",
  frozenPrice: "500000.00",
});

export const EX_PAYMENT_INIT_RES = successOf("Payment initiated.", {
  gateway_url: "http://demo.wufud.localhost:3009/api/v1/payments/success?tran_id=TXN-01a0c095-01a0c095",
  tran_id: "TXN-01a0c095-01a0c095",
});
