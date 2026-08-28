/**
 * The confirmation email is the one artefact of the demo a customer keeps, and
 * it is the only place minor units get turned back into a price a human reads.
 * These tests cover that conversion and the escaping around it — not the markup.
 */

import { money } from '@merchant/config/money';
import type { AddressDto } from '@merchant/contracts/common';
import { describe, expect, it } from 'vitest';
import { type OrderEmailInput, renderOrderConfirmation } from './order-confirmation.ts';

const address: AddressDto = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  company: null,
  address1: '12 Analytical Way',
  address2: 'Apt 4',
  city: 'Portland',
  province: 'Oregon',
  provinceCode: 'OR',
  country: 'United States',
  countryCode: 'US',
  zip: '97209',
  phone: null,
};

function input(overrides: Partial<OrderEmailInput> = {}): OrderEmailInput {
  return {
    shopName: 'Aurora Supply Co.',
    orderNumber: 1001,
    customerName: 'Ada',
    currencyCode: 'USD',
    lineItems: [
      {
        title: 'Trail Jacket',
        variantTitle: 'Medium / Moss',
        quantity: 2,
        price: money(12995),
        totalDiscount: money(0),
      },
      {
        title: 'Wool Socks',
        variantTitle: null,
        quantity: 1,
        price: money(1850),
        totalDiscount: money(0),
      },
    ],
    subtotal: money(27840),
    discountTotal: money(0),
    shippingTotal: money(995),
    taxTotal: money(2367),
    total: money(31202),
    shippingAddress: address,
    shippingMethod: 'Standard',
    orderStatusUrl: 'http://demo.lvh.me:3002/orders/ord_01J8ZC3K4M5N6P7Q8R9S0T1V2Y',
    ...overrides,
  };
}

describe('renderOrderConfirmation', () => {
  it('subjects the mail the way Shopify does', () => {
    const { subject } = renderOrderConfirmation(input());
    expect(subject).toBe('Aurora Supply Co. — order #1001 confirmed');
  });

  it('formats every amount from minor units, never as a raw integer', () => {
    const { html, text } = renderOrderConfirmation(input());

    for (const body of [html, text]) {
      expect(body).toContain('$259.90'); // 2 × 129.95, the line total
      expect(body).toContain('$278.40'); // subtotal
      expect(body).toContain('$9.95'); // shipping
      expect(body).toContain('$23.67'); // tax
      expect(body).toContain('$312.02'); // total
      // The bug this guards: printing `total.amount` straight into the template.
      expect(body).not.toContain('31202');
      expect(body).not.toContain('27840');
    }
  });

  it('shows quantities and variant titles, and omits the variant line when there is none', () => {
    const { text } = renderOrderConfirmation(input());
    expect(text).toContain('Trail Jacket (Medium / Moss) × 2');
    expect(text).toContain('Wool Socks × 1');
  });

  it('prices a line at quantity × unit price, less its discount', () => {
    const { text } = renderOrderConfirmation(
      input({
        lineItems: [
          {
            title: 'Trail Jacket',
            variantTitle: null,
            quantity: 3,
            price: money(1999),
            totalDiscount: money(500),
          },
        ],
      }),
    );
    // 3 × 19.99 = 59.97, less 5.00 discount = 54.97.
    expect(text).toContain('$54.97');
  });

  it('hides the discount row when nothing was discounted, and shows it when something was', () => {
    expect(renderOrderConfirmation(input()).html).not.toContain('Discount');

    const discounted = renderOrderConfirmation(
      input({ discountTotal: money(2500), total: money(28702) }),
    );
    expect(discounted.html).toContain('Discount');
    expect(discounted.html).toContain('-$25.00');
  });

  it('renders the shipping address as a postal block', () => {
    const { text } = renderOrderConfirmation(input());
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('12 Analytical Way');
    expect(text).toContain('Apt 4');
    expect(text).toContain('Portland OR 97209');
    expect(text).toContain('United States');
  });

  it('omits the shipping block entirely for a digital order', () => {
    const { html, text } = renderOrderConfirmation(
      input({ shippingAddress: null, shippingMethod: null, shippingTotal: money(0) }),
    );
    expect(html).not.toContain('Ship to');
    expect(text).not.toContain('Ship to');
  });

  it('escapes merchant- and customer-controlled text instead of injecting markup', () => {
    const { html } = renderOrderConfirmation(
      input({
        shopName: 'Ben & Jerry <script>alert(1)</script>',
        lineItems: [
          {
            title: '"Quoted" <b>Bold</b>',
            variantTitle: null,
            quantity: 1,
            price: money(100),
            totalDiscount: money(0),
          },
        ],
      }),
    );

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>Bold</b>');
    expect(html).toContain('&amp;');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;Quoted&quot;');
  });

  it('respects a zero-decimal currency', () => {
    const { text } = renderOrderConfirmation(
      input({
        currencyCode: 'JPY',
        lineItems: [
          {
            title: 'Trail Jacket',
            variantTitle: null,
            quantity: 1,
            price: money(12995, 'JPY'),
            totalDiscount: money(0, 'JPY'),
          },
        ],
        subtotal: money(12995, 'JPY'),
        discountTotal: money(0, 'JPY'),
        shippingTotal: money(0, 'JPY'),
        taxTotal: money(0, 'JPY'),
        total: money(12995, 'JPY'),
      }),
    );
    expect(text).toContain('¥12,995');
    expect(text).not.toContain('129.95');
  });

  it('links to the order status page when there is one', () => {
    const url = 'http://demo.lvh.me:3002/orders/ord_01J8ZC3K4M5N6P7Q8R9S0T1V2Y';
    expect(renderOrderConfirmation(input()).html).toContain(`href="${url}"`);
    expect(renderOrderConfirmation(input({ orderStatusUrl: null })).html).not.toContain(
      'href="http',
    );
  });
});
