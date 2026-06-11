import React from 'react';
import { formatDate } from '@/lib/dateUtils';

interface LedgerTableProps {
  entries: Array<{
    id: string;
    date: string;
    shift: string;
    quantity: number;
    price_per_unit: number;
    total_amount: number;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    payment_mode: string;
    date: string;
    note: string;
  }>;
  balance: number;
}

const LedgerTable: React.FC<LedgerTableProps> = ({ entries, transactions, balance }) => {
  return (
    <div className="overflow-x-auto">
      <h2 className="text-xl font-bold mb-4">Ledger</h2>
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="py-2 px-4 border-b">Date</th>
            <th className="py-2 px-4 border-b">Shift</th>
            <th className="py-2 px-4 border-b">Quantity</th>
            <th className="py-2 px-4 border-b">Price per Unit</th>
            <th className="py-2 px-4 border-b">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.id}>
              <td className="py-2 px-4 border-b">{formatDate(entry.date)}</td>
              <td className="py-2 px-4 border-b">{entry.shift}</td>
              <td className="py-2 px-4 border-b">{entry.quantity}</td>
              <td className="py-2 px-4 border-b">{entry.price_per_unit}</td>
              <td className="py-2 px-4 border-b">{entry.total_amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="text-lg font-bold mt-6">Transactions</h3>
      <table className="min-w-full bg-white border border-gray-300 mt-4">
        <thead>
          <tr className="bg-gray-200">
            <th className="py-2 px-4 border-b">Type</th>
            <th className="py-2 px-4 border-b">Amount</th>
            <th className="py-2 px-4 border-b">Payment Mode</th>
            <th className="py-2 px-4 border-b">Date</th>
            <th className="py-2 px-4 border-b">Note</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(transaction => (
            <tr key={transaction.id}>
              <td className="py-2 px-4 border-b">{transaction.type}</td>
              <td className="py-2 px-4 border-b">{transaction.amount}</td>
              <td className="py-2 px-4 border-b">{transaction.payment_mode}</td>
              <td className="py-2 px-4 border-b">{formatDate(transaction.date)}</td>
              <td className="py-2 px-4 border-b">{transaction.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4">
        <h4 className="font-bold">Final Balance: ₹{balance}</h4>
      </div>
    </div>
  );
};

export default LedgerTable;
