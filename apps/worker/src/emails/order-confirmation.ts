/**
 * Order confirmation email (SPEC §13). Owner: WS-G.
 *
 * Pure: takes a snapshot, returns subject/html/text. No database, no SMTP — so
 * the money formatting, which is the only place minor units become a price a
 * customer reads, is testable on its own.
 *
 * Table layout and inline styles are not laziness: Gmail strips <style> blocks
 * and Outlook still lays out with tables.
 */
import { format, type Money, multiply, subtract } from '@merchant/config/money';
import type { AddressDto } from '@merchant/contracts/common';

export type OrderEmailLine = {
  title: string;
  variantTitle: string | null;
  quantity: number;
  /** Unit price, minor units. */
  price: Money;
  totalDiscount: Money;
};

export type OrderEmailInput = {
  shopName: string;
  orderNumber: number;
  customerName: string | null;
  currencyCode: string;
  lineItems: OrderEmailLine[];
  subtotal: Money;
  discountTotal: Money;
  shippingTotal: Money;
  taxTotal: Money;
  total: Money;
  shippingAddress: AddressDto | null;
  shippingMethod: string | null;
  orderStatusUrl: string | null;
};

export type RenderedEmail = { subject: string; html: string; text: string };

/** Every interpolation into the HTML goes through this. Product titles are merchant input. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function lineLabel(line: OrderEmailLine): string {
  return line.variantTitle ? `${line.title} (${line.variantTitle})` : line.title;
}

function lineTotal(line: OrderEmailLine): Money {
  return subtract(multiply(line.price, line.quantity), line.totalDiscount);
}

/** `Ada Lovelace / 12 Analytical Way / Apt 4 / Portland OR 97209 / United States` */
function addressLines(address: AddressDto): string[] {
  const name = [address.firstName, address.lastName].filter(Boolean).join(' ');
  const cityLine = [address.city, address.provinceCode ?? address.province, address.zip]
    .filter(Boolean)
    .join(' ');
  return [
    name,
    address.company,
    address.address1,
    address.address2,
    cityLine,
    address.country,
  ].filter((line): line is string => Boolean(line?.trim()));
}

export function renderOrderConfirmation(input: OrderEmailInput): RenderedEmail {
  const subject = `${input.shopName} — order #${input.orderNumber} confirmed`;
  const greeting = input.customerName
    ? `Hi ${input.customerName}, thanks for your order.`
    : 'Thanks for your order.';

  const totals: Array<[string, Money]> = [
    ['Subtotal', input.subtotal],
    ...(input.discountTotal.amount !== 0
      ? ([['Discount', multiply(input.discountTotal, -1)]] as Array<[string, Money]>)
      : []),
    ['Shipping', input.shippingTotal],
    ['Tax', input.taxTotal],
  ];

  const shipTo = input.shippingAddress ? addressLines(input.shippingAddress) : [];

  /* --- text ---------------------------------------------------------------- */

  const textParts = [
    `${input.shopName}`,
    '',
    greeting,
    `Order #${input.orderNumber}`,
    '',
    ...input.lineItems.map(
      (line) => `${lineLabel(line)} × ${line.quantity}   ${format(lineTotal(line))}`,
    ),
    '',
    ...totals.map(([label, amount]) => `${label}: ${format(amount)}`),
    `Total: ${format(input.total)}`,
  ];

  if (shipTo.length > 0) {
    textParts.push(
      '',
      'Ship to',
      ...shipTo,
      ...(input.shippingMethod ? [`Method: ${input.shippingMethod}`] : []),
    );
  }
  if (input.orderStatusUrl) textParts.push('', `View your order: ${input.orderStatusUrl}`);

  /* --- html ---------------------------------------------------------------- */

  const cell = 'padding:8px 0;border-bottom:1px solid #e3e3e3;font-size:14px;color:#303030';
  const right = `${cell};text-align:right;white-space:nowrap`;

  const itemRows = input.lineItems
    .map(
      (line) => `<tr>
            <td style="${cell}">${esc(lineLabel(line))}<span style="color:#616161"> × ${line.quantity}</span></td>
            <td style="${right}">${esc(format(lineTotal(line)))}</td>
          </tr>`,
    )
    .join('\n');

  const totalRows = totals
    .map(
      ([label, amount]) => `<tr>
            <td style="${cell};border-bottom:none;color:#616161">${label}</td>
            <td style="${right};border-bottom:none">${esc(format(amount))}</td>
          </tr>`,
    )
    .join('\n');

  const shippingBlock =
    shipTo.length > 0
      ? `<h2 style="font-size:14px;color:#303030;margin:32px 0 8px">Ship to</h2>
        <p style="margin:0;font-size:14px;line-height:22px;color:#616161">
          ${shipTo.map(esc).join('<br />')}
        </p>
        ${input.shippingMethod ? `<p style="margin:8px 0 0;font-size:14px;color:#616161">${esc(input.shippingMethod)}</p>` : ''}`
      : '';

  const statusButton = input.orderStatusUrl
    ? `<p style="margin:32px 0 0">
          <a href="${esc(input.orderStatusUrl)}" style="display:inline-block;background:#303030;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px">View your order</a>
        </p>`
    : '';

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f1f1f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <tr>
        <td>
          <p style="margin:0 0 4px;font-size:13px;color:#616161">${esc(input.shopName)}</p>
          <h1 style="margin:0 0 4px;font-size:22px;color:#303030">Order #${input.orderNumber} confirmed</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#616161">${esc(greeting)}</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${itemRows}
${totalRows}
            <tr>
              <td style="${cell};border-bottom:none;font-weight:600">Total</td>
              <td style="${right};border-bottom:none;font-weight:600">${esc(format(input.total))}</td>
            </tr>
          </table>
          ${shippingBlock}
          ${statusButton}
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text: textParts.join('\n') };
}
