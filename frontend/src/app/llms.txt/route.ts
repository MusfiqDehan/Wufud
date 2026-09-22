import { NextResponse } from "next/server";

const LLMS_TXT = `# Wufud

> Wufūd (وفود) — a schema-per-tenant Hajj & Umrah booking SaaS platform.

## Overview

Wufud is a modern booking and management platform for Hajj and Umrah travel agencies.
It provides a unified workspace where agencies can manage packages, pilgrims, branches,
payments, and financial reconciliation — all from one connected platform.

## Key Features

- **Multi-tenant SaaS**: Each agency gets its own isolated workspace with custom domain support
- **Package management**: Create and manage Hajj, Umrah, and Ziyarah travel packages with tiers
- **Booking system**: Full booking lifecycle — draft, hold, confirm, cancel, with seat management
- **Pilgrim management**: Track pilgrim details, passport info, and family bookings
- **Payment processing**: Online gateways (SSLCommerz, Stripe), manual collections, installment plans
- **Branch management**: Multi-branch operations with granular role-based access control
- **Financial accounts**: Vendor disbursements, stock tracking, POS, expenses, settlement reports
- **Pilgrim portal**: Self-service portal for pilgrims to browse, book, and track their journey
- **Agency storefront**: Branded public-facing website for each agency with SEO settings

## For Agencies

Wufud replaces spreadsheets, WhatsApp groups, and disconnected tools with one calm,
connected workspace. Agencies can manage their entire operation — from the first inquiry
to the final settlement — with clear visibility across all branches.

## For Pilgrims

Pilgrims can browse packages, book for their family, pay in installments, and follow
their booking from a personal pilgrim portal.

## Contact

- Website: https://wufud.musfiqdehan.com
- Platform: Wufud by Musfiq Dehan
`;

export function GET() {
  return new NextResponse(LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
