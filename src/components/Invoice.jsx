import React, { useState, useEffect } from 'react';

export default function Invoice({ orderData, onUpdate }) {
  const {
    customer = {},
    items = [],
    quantity = 1,
    deliveryOption = 'ucc',
    paymentMethod = 'MTN MoMo',
    couponCode = '',
  } = orderData;

  // Delivery fees mapping
  const DELIVERY_FEES = {
    ucc: 0,
    accra: 30,
    capecoast: 20,
    outside: 50,
  };

  // Calculate subtotal (assuming first item price if items is a string or array)
  // In the master prompt, it's simplified: item * qty
  const unitPrice = typeof items === 'object' ? items.price : 0;
  const subtotal = unitPrice * quantity;

  const deliveryFee = DELIVERY_FEES[deliveryOption] || 0;

  const discount = couponCode?.toUpperCase() === 'CHIC10'
    ? Math.round(subtotal * 0.1 * 100) / 100
    : 0;

  const total = subtotal + deliveryFee - discount;

  return (
    <div className="bg-white shadow-2xl rounded-2xl p-6 border border-slate-100 max-w-2xl mx-auto my-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white flex items-center justify-center font-serif font-bold text-2xl shadow-md">R</div>
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">RABIS CHIC OFFICIAL INVOICE</h2>
            <p className="text-[10px] text-slate-500 font-medium">University of Cape Coast Campus Store</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-900">Date: {new Date().toLocaleDateString()}</p>
          <p className="text-xs text-slate-500">Invoice #RA-{Math.floor(10000 + Math.random() * 90000)}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">Pending Payment</span>
        </div>
      </div>

      {/* Customer Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase text-slate-400">Bill To</p>
          <p className="text-sm font-bold text-slate-900">{customer.name || 'Customer Name'}</p>
          <p className="text-xs text-slate-600">{customer.phone || 'Phone number'}</p>
          <p className="text-xs text-slate-600">{customer.address || customer.hostel || 'Delivery Address'}</p>
        </div>
        <div className="space-y-1 md:text-right">
          <p className="text-[10px] font-bold uppercase text-slate-400">Campus Status</p>
          <p className="text-sm font-bold text-slate-900">UCC Campus: {customer.isUcc ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 mb-6">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
            <tr>
              <th className="px-4 py-3 border-b border-slate-200">Item</th>
              <th className="px-4 py-3 border-b border-slate-200 text-center">Qty</th>
              <th className="px-4 py-3 border-b border-slate-200 text-right">Unit GH₵</th>
              <th className="px-4 py-3 border-b border-slate-200 text-right">Total GH₵</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            <tr>
              <td className="px-4 py-4 border-b border-slate-100 font-medium text-slate-900">
                {typeof items === 'string' ? items : items.name || 'Custom Item'}
              </td>
              <td className="px-4 py-4 border-b border-slate-100 text-center">{quantity}</td>
              <td className="px-4 py-4 border-b border-slate-100 text-right">{unitPrice.toFixed(2)}</td>
              <td className="px-4 py-4 border-b border-slate-100 text-right font-bold text-slate-900">{subtotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full max-w-[240px] space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Subtotal</span>
            <span>GH₵ {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Delivery ({deliveryOption})</span>
            <span>GH₵ {deliveryFee.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-xs text-emerald-600 font-medium">
              <span>Discount (CHIC10)</span>
              <span>- GH₵ {discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
            <span className="text-sm font-black text-slate-900 uppercase">Total Amount</span>
            <span className="text-xl font-black text-rose-600">GH₵ {total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      {paymentMethod === 'MTN MoMo' && (
        <div className="mt-8 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-mobile-screen text-xs"></i>
          </div>
          <div>
            <p className="text-xs font-bold text-amber-900">MoMo Payment Details</p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Please send the total amount to <span className="font-bold">055 123 4567</span> <br />
              Account Name: <span className="font-bold">Rabis Chic</span>
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-500 italic">Thank you for shopping with Rabis Chic! We appreciate your business.</p>
        <a
          href="https://wa.me/233551234567"
          className="inline-flex items-center gap-1 mt-3 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition"
        >
          <i className="fa-brands fa-whatsapp text-sm"></i> Contact us on WhatsApp for help
        </a>
      </div>
    </div>
  );
}
